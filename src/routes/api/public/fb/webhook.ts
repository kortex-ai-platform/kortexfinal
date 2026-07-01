import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function normalizeSecret(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyMetaSignature(rawBody: string, appSecrets: string[], request: Request) {
  const signatures = [
    {
      algorithm: "sha256" as const,
      headerName: "x-hub-signature-256",
      received: request.headers.get("x-hub-signature-256") ?? "",
    },
    {
      algorithm: "sha1" as const,
      headerName: "x-hub-signature",
      received: request.headers.get("x-hub-signature") ?? "",
    },
  ];

  let lastExpectedPreview: string | null = null;
  let lastReceivedPreview: string | null = null;
  let lastHeaderName: string | null = null;
  let lastAlgorithm: "sha256" | "sha1" | null = null;

  for (const sig of signatures) {
    if (!sig.received.startsWith(`${sig.algorithm}=`)) continue;
    lastHeaderName = sig.headerName;
    lastAlgorithm = sig.algorithm;
    lastReceivedPreview = sig.received.slice(0, 14) + "…";
    for (const secret of appSecrets) {
      if (!secret) continue;
      const expected =
        `${sig.algorithm}=` + createHmac(sig.algorithm, secret).update(rawBody).digest("hex");
      lastExpectedPreview = expected.slice(0, 14) + "…";
      if (safeEqual(sig.received, expected)) {
        return { ok: true, headerName: sig.headerName, algorithm: sig.algorithm };
      }
    }
  }

  return {
    ok: false,
    headerName: lastHeaderName,
    algorithm: lastAlgorithm,
    expectedPreview: lastExpectedPreview,
    receivedPreview: lastReceivedPreview,
  } as const;
}

async function upsertConversation(
  supabaseAdmin: any,
  args: {
    pageId: string;
    source: "messenger" | "comment";
    fbUserId: string;
    userName: string | null;
    userAvatar: string | null;
    postId: string | null;
    preview: string;
    workspaceId: string | null;
  },
) {
  const findExisting = async () => {
    let lookup = supabaseAdmin
      .from("fb_conversations")
      .select("id, unread_count, user_name, user_avatar_url")
      .eq("page_id", args.pageId)
      .eq("source", args.source)
      .eq("fb_user_id", args.fbUserId);
    lookup = args.postId ? lookup.eq("post_id", args.postId) : lookup.is("post_id", null);
    const { data } = await lookup.order("created_at", { ascending: true }).limit(1).maybeSingle();
    return data;
  };

  const touchExisting = async (existing: any) => {
    await supabaseAdmin
      .from("fb_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: args.preview.slice(0, 140),
        unread_count: (existing.unread_count ?? 0) + 1,
        user_name: args.userName ?? existing.user_name,
        user_avatar_url: args.userAvatar ?? existing.user_avatar_url,
        workspace_id: args.workspaceId ?? undefined,
      })
      .eq("id", existing.id);
    return existing.id as string;
  };

  const existing = await findExisting();

  if (existing) {
    return touchExisting(existing);
  }

  const { data: created, error } = await supabaseAdmin
    .from("fb_conversations")
    .insert({
      page_id: args.pageId,
      source: args.source,
      fb_user_id: args.fbUserId,
      user_name: args.userName,
      user_avatar_url: args.userAvatar,
      post_id: args.postId,
      workspace_id: args.workspaceId,
      last_message_at: new Date().toISOString(),
      last_message_preview: args.preview.slice(0, 140),
      unread_count: 1,
    })
    .select("id")
    .single();
  if (error) {
    // Webhooks can arrive in parallel for the same person. If another request
    // created the folder first, reuse that one instead of opening a duplicate.
    if (error.code === "23505") {
      const racedExisting = await findExisting();
      if (racedExisting) return touchExisting(racedExisting);
    }
    throw new Error(error.message);
  }
  return created.id as string;
}

async function processEntry(supabaseAdmin: any, entry: any) {
  const pageId: string = entry.id;
  const { data: page } = await supabaseAdmin
    .from("fb_pages")
    .select("page_id, access_token, workspace_id")
    .eq("page_id", pageId)
    .maybeSingle();
  if (!page) return;

  const { fetchUserProfile } = await import("@/lib/fb-graph.server");
  const { maybeAutoReply } = await import("@/lib/fb-ai.server");
  const { hideComment, deleteComment, blockUserOnPage } = await import("@/lib/fb-graph.server");
  const { containsBadWord, computeBlockExpiry } = await import("@/lib/moderation.server");

  // Messenger DMs
  for (const m of entry.messaging ?? []) {
    if (!m.message || m.message.is_echo) continue;
    const psid: string = m.sender?.id;
    if (!psid) continue;
    const text: string = m.message.text ?? "[attachment]";
    const profile = await fetchUserProfile(psid, page.access_token, pageId);
    const convId = await upsertConversation(supabaseAdmin, {
      pageId,
      source: "messenger",
      fbUserId: psid,
      userName: profile.name,
      userAvatar: profile.avatar,
      postId: null,
      preview: text,
      workspaceId: page.workspace_id ?? null,
    });
    await supabaseAdmin.from("fb_messages").insert({
      conversation_id: convId,
      direction: "in",
      sender: "customer",
      kind: "text",
      text,
      fb_message_id: m.message.mid ?? null,
      workspace_id: page.workspace_id ?? null,
    });
    await maybeAutoReply(convId);
  }

  // Page feed comments
  for (const c of entry.changes ?? []) {
    if (c.field !== "feed") continue;
    const v = c.value ?? {};
    if (v.item !== "comment" || v.verb !== "add") continue;
    if (v.from?.id === pageId) continue; // skip our own
    const commentId: string = v.comment_id;
    const postId: string = v.post_id ?? null;
    const fromId: string = v.from?.id;
    const fromName: string = v.from?.name ?? null;
    if (!commentId || !fromId) continue;
    const text: string = v.message ?? "";
    // Fetch Facebook profile (name + avatar) like Messenger does, so the
    // commenter shows up with real name/picture instead of "Messenger user".
    const commenterProfile = await fetchUserProfile(fromId, page.access_token, pageId);
    const convId = await upsertConversation(supabaseAdmin, {
      pageId,
      source: "comment",
      // Group by user (per post) — was commentId, which created a new
      // thread for every single comment.
      fbUserId: fromId,
      userName: commenterProfile.name ?? fromName,
      userAvatar: commenterProfile.avatar,
      postId,
      preview: text,
      workspaceId: page.workspace_id ?? null,
    });
    await supabaseAdmin.from("fb_messages").insert({
      conversation_id: convId,
      direction: "in",
      sender: "customer",
      kind: "comment",
      text,
      fb_message_id: commentId,
      parent_comment_id: v.parent_id ?? null,
      workspace_id: page.workspace_id ?? null,
    });

    // Bad-word moderation (silent: no AI reply, just hide/delete + count + maybe block)
    let moderated = false;
    try {
      const { data: mod } = await supabaseAdmin
        .from("fb_settings")
        .select(
          "moderation_enabled, moderation_action, moderation_block_threshold, moderation_block_duration, moderation_match_threshold, bad_words, whitelist_words",
        )
        .eq("workspace_id", page.workspace_id)
        .maybeSingle();
      if (mod?.moderation_enabled && (mod.bad_words?.length ?? 0) > 0) {
        const hit = containsBadWord(text, mod.bad_words ?? [], mod.whitelist_words ?? [], (mod as any).moderation_match_threshold ?? 80);
        if (hit.matched) {
          moderated = true;
          try {
            if (mod.moderation_action === "delete") {
              await deleteComment(page.access_token, commentId);
            } else {
              await hideComment(page.access_token, commentId);
            }
          } catch (e) {
            console.error("moderation action failed", e);
          }

          const { data: existing } = await supabaseAdmin
            .from("fb_user_offenses")
            .select("id, offense_count, blocked_at")
            .eq("page_id", pageId)
            .eq("fb_user_id", fromId)
            .maybeSingle();
          const nextCount = (existing?.offense_count ?? 0) + 1;
          const shouldBlock =
            !existing?.blocked_at &&
            nextCount >= (mod.moderation_block_threshold ?? 3);
          let blockedAt: string | null = existing?.blocked_at ?? null;
          let blockExpires: string | null = null;
          if (shouldBlock) {
            try {
              await blockUserOnPage(page.access_token, pageId, fromId);
              blockedAt = new Date().toISOString();
              blockExpires = computeBlockExpiry(mod.moderation_block_duration ?? "permanent");
            } catch (e) {
              console.error("block user failed", e);
            }
          }
          await supabaseAdmin
            .from("fb_user_offenses")
            .upsert(
              {
                page_id: pageId,
                fb_user_id: fromId,
                user_name: fromName,
                offense_count: nextCount,
                last_offense_at: new Date().toISOString(),
                blocked_at: blockedAt,
                block_expires_at: blockExpires,
                workspace_id: page.workspace_id ?? null,
              },
              { onConflict: "page_id,fb_user_id" },
            );

          await supabaseAdmin.from("fb_messages").insert({
            conversation_id: convId,
            direction: "out",
            sender: "ai",
            kind: "comment",
            text: `[moderated: ${mod.moderation_action}${shouldBlock ? " + user blocked" : ""} | matched: ${hit.word ?? ""} | offense #${nextCount}]`,
            workspace_id: page.workspace_id ?? null,
          });
        }
      }
    } catch (e) {
      console.error("moderation pipeline error", e);
    }

    if (!moderated) await maybeAutoReply(convId);
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256",
};

export const Route = createFileRoute("/api/public/fb/webhook")({
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
        // Also accept the admin-managed token stored in branding_settings.
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: br } = await supabaseAdmin
            .from("branding_settings")
            .select("webhook_verify_token")
            .eq("singleton", true)
            .maybeSingle();
          if (br?.webhook_verify_token) candidates.push(br.webhook_verify_token);
        } catch (e) {
          console.error("webhook verify: branding lookup failed", e);
        }
        const receivedToken = token?.trim() ?? "";
        const verified =
          mode === "subscribe" &&
          !!receivedToken &&
          candidates.some((c) => (c ?? "").trim() === receivedToken);

        console.info("facebook webhook verification", {
          mode,
          receivedVerifyTokenLength: receivedToken.length,
          candidateCount: candidates.filter(Boolean).length,
          hasChallenge: !!challenge,
          verified,
        });

        if (verified) {
          return new Response(challenge ?? "", {
            status: 200,
            headers: {
              ...CORS,
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
        return new Response("forbidden", { status: 403, headers: CORS });
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        const skipSig = process.env.FACEBOOK_WEBHOOK_SKIP_SIGNATURE === "1";

        // Collect candidate secrets: env first, then per-page app_secret rows.
        const appSecrets = [
          normalizeSecret(process.env.FACEBOOK_APP_SECRET),
          normalizeSecret(process.env.FACEBOOK_APP_SECRET_2),
        ].filter(Boolean);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: rows } = await supabaseAdmin
            .from("fb_pages")
            .select("app_secret")
            .not("app_secret", "is", null);
          for (const r of rows ?? []) {
            const s = normalizeSecret((r as any).app_secret);
            if (s && !appSecrets.includes(s)) appSecrets.push(s);
          }
        } catch (e) {
          console.error("webhook: failed to load per-page app secrets", e);
        }

        if (appSecrets.length === 0 && !skipSig) {
          console.error("facebook webhook post rejected", {
            reason: "missing_app_secret",
            hasSha256Signature: !!request.headers.get("x-hub-signature-256"),
            hasSha1Signature: !!request.headers.get("x-hub-signature"),
            bodyLength: raw.length,
          });
          return new Response("unauthorized", { status: 401, headers: CORS });
        }
        const signature = skipSig
          ? { ok: true, headerName: "skipped", algorithm: "skipped" as const }
          : verifyMetaSignature(raw, appSecrets, request);
        if (!signature.ok) {
          console.error("facebook webhook post rejected", {
            reason: signature.headerName ? "invalid_signature" : "missing_signature",
            checkedHeader: signature.headerName,
            algorithm: signature.algorithm,
            hasSha256Signature: !!request.headers.get("x-hub-signature-256"),
            hasSha1Signature: !!request.headers.get("x-hub-signature"),
            secretsTried: appSecrets.length,
            expectedPreview: (signature as any).expectedPreview ?? null,
            receivedPreview: (signature as any).receivedPreview ?? null,
            bodyLength: raw.length,
          });
          return new Response("invalid signature", { status: 401, headers: CORS });
        }
        console.info("facebook webhook post accepted", {
          signatureHeader: signature.headerName,
          algorithm: signature.algorithm,
          bodyLength: raw.length,
        });
        let body: any;
        try {
          body = JSON.parse(raw);
        } catch {
          return new Response("bad json", { status: 400, headers: CORS });
        }
        if (body.object !== "page") {
          return new Response("ignored", { status: 200, headers: CORS });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        for (const entry of body.entry ?? []) {
          try {
            await processEntry(supabaseAdmin, entry);
          } catch (e) {
            console.error("processEntry", e);
          }
        }
        return new Response("ok", { status: 200, headers: CORS });
      },
    },
  },
});