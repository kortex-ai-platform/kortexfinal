import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifySignature(rawBody: string, secrets: string[], request: Request): boolean {
  const received = request.headers.get("x-hub-signature-256") ?? "";
  if (!received.startsWith("sha256=")) return false;
  for (const s of secrets) {
    if (!s) continue;
    const expected = "sha256=" + createHmac("sha256", s).update(rawBody).digest("hex");
    if (safeEqual(received, expected)) return true;
  }
  return false;
}

async function upsertWaConversation(
  supabaseAdmin: any,
  args: {
    phoneNumberId: string;
    waUserId: string;
    userName: string | null;
    tenantId: string | null;
    preview: string;
  },
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("wa_conversations")
    .select("id, unread_count, user_name")
    .eq("phone_number_id", args.phoneNumberId)
    .eq("wa_user_id", args.waUserId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("wa_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: args.preview.slice(0, 140),
        unread_count: (existing.unread_count ?? 0) + 1,
        user_name: args.userName ?? existing.user_name,
        tenant_id: args.tenantId ?? undefined,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error } = await supabaseAdmin
    .from("wa_conversations")
    .insert({
      phone_number_id: args.phoneNumberId,
      wa_user_id: args.waUserId,
      user_name: args.userName,
      tenant_id: args.tenantId,
      last_message_at: new Date().toISOString(),
      last_message_preview: args.preview.slice(0, 140),
      unread_count: 1,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await supabaseAdmin
        .from("wa_conversations")
        .select("id")
        .eq("phone_number_id", args.phoneNumberId)
        .eq("wa_user_id", args.waUserId)
        .maybeSingle();
      if (raced) return raced.id as string;
    }
    throw new Error(error.message);
  }
  return created.id as string;
}

async function processEntry(supabaseAdmin: any, entry: any) {
  for (const change of entry.changes ?? []) {
    if (change.field !== "messages") continue;
    const v = change.value ?? {};
    const phoneNumberId: string = v.metadata?.phone_number_id;
    if (!phoneNumberId) continue;

    // Resolve tenant via the registered phone number.
    const { data: pn } = await supabaseAdmin
      .from("whatsapp_phone_numbers")
      .select("tenant_id, whatsapp_account_id")
      .eq("phone_number_id", phoneNumberId)
      .maybeSingle();
    if (!pn) {
      console.warn("wa webhook: unknown phone_number_id", phoneNumberId);
      continue;
    }
    const tenantId = pn.tenant_id ?? null;

    const contacts: any[] = v.contacts ?? [];
    const nameByWaId = new Map<string, string>();
    for (const c of contacts) {
      if (c?.wa_id) nameByWaId.set(c.wa_id, c?.profile?.name ?? null);
    }

    for (const m of v.messages ?? []) {
      const from: string = m.from;
      if (!from) continue;
      const text: string =
        m.text?.body ??
        m.button?.text ??
        m.interactive?.button_reply?.title ??
        m.interactive?.list_reply?.title ??
        `[${m.type ?? "unsupported"}]`;
      const convId = await upsertWaConversation(supabaseAdmin, {
        phoneNumberId,
        waUserId: from,
        userName: nameByWaId.get(from) ?? null,
        tenantId,
        preview: text,
      });
      await supabaseAdmin.from("wa_messages").insert({
        conversation_id: convId,
        tenant_id: tenantId,
        direction: "in",
        sender: "customer",
        text,
        wa_message_id: m.id ?? null,
      });
      try {
        const { maybeWaAutoReply } = await import("@/lib/wa-ai.server");
        await maybeWaAutoReply(convId);
      } catch (e) {
        console.error("wa auto reply failed", e);
      }
    }
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256",
};

export const Route = createFileRoute("/api/public/wa/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const candidates = [
          process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN_META,
          process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
        ];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: br } = await supabaseAdmin
            .from("branding_settings")
            .select("webhook_verify_token")
            .eq("singleton", true)
            .maybeSingle();
          if (br?.webhook_verify_token) candidates.push(br.webhook_verify_token);
        } catch {}
        const received = token?.trim() ?? "";
        const ok =
          mode === "subscribe" &&
          !!received &&
          candidates.some((c) => (c ?? "").trim() === received);
        if (ok) {
          return new Response(challenge ?? "", {
            status: 200,
            headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        return new Response("forbidden", { status: 403, headers: CORS });
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        const skipSig = process.env.FACEBOOK_WEBHOOK_SKIP_SIGNATURE === "1";
        const secrets = [process.env.FACEBOOK_APP_SECRET ?? ""].filter(Boolean);
        if (!skipSig && secrets.length && !verifySignature(raw, secrets, request)) {
          return new Response("invalid signature", { status: 401, headers: CORS });
        }
        let body: any;
        try {
          body = JSON.parse(raw);
        } catch {
          return new Response("bad json", { status: 400, headers: CORS });
        }
        if (body.object !== "whatsapp_business_account") {
          return new Response("ignored", { status: 200, headers: CORS });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        for (const entry of body.entry ?? []) {
          try {
            await processEntry(supabaseAdmin, entry);
          } catch (e) {
            console.error("wa processEntry", e);
          }
        }
        return new Response("ok", { status: 200, headers: CORS });
      },
    },
  },
});
