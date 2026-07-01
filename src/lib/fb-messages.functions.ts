import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden");
}

const ListSchema = z.object({ conversationId: z.string().uuid() });

export const listFbMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { data: rows, error } = await context.supabase
      .from("fb_messages")
      .select("id, direction, sender, kind, text, attachment_url, ai_provider, error, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const SendSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
});

export const sendHumanReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv, error: cErr } = await supabaseAdmin
      .from("fb_conversations")
      .select("id, page_id, source, fb_user_id")
      .eq("id", data.conversationId)
      .single();
    if (cErr || !conv) throw new Error("Conversation not found");
    const { data: page, error: pErr } = await supabaseAdmin
      .from("fb_pages")
      .select("access_token")
      .eq("page_id", conv.page_id)
      .single();
    if (pErr || !page) throw new Error("Page not connected");
    const { sendMessengerMessage, sendCommentReply } = await import("./fb-graph.server");
    let fbMessageId: string | null = null;
    try {
      if (conv.source === "messenger") {
        const r = await sendMessengerMessage(page.access_token, conv.fb_user_id, data.text);
        fbMessageId = r?.message_id ?? null;
      } else {
        // For comment threads, reply to the LATEST inbound comment in this
        // conversation (fb_message_id = the FB comment node ID), not the
        // commenter's user id.
        const { data: lastComment } = await supabaseAdmin
          .from("fb_messages")
          .select("fb_message_id")
          .eq("conversation_id", conv.id)
          .eq("direction", "in")
          .not("fb_message_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const targetCommentId = lastComment?.fb_message_id;
        if (!targetCommentId) {
          throw new Error("No customer comment found to reply to in this thread.");
        }
        const r = await sendCommentReply(page.access_token, targetCommentId, data.text);
        fbMessageId = r?.id ?? null;
      }
    } catch (e: any) {
      const raw = e?.message ?? "send failed";
      let friendly = raw;
      if (conv.source === "comment") {
        if (/permission|OAuth|#200|#10|pages_manage_engagement/i.test(raw)) {
          friendly =
            "Comment reply ব্যর্থ — Page-এ 'pages_manage_engagement' permission নেই। Meta App Dashboard → App Review → Permissions and Features-এ এটা request করুন।";
        }
      } else if (/#10|#200|permission|pages_messaging/i.test(raw)) {
        friendly =
          "Message পাঠানো ব্যর্থ — 'pages_messaging' permission নেই অথবা 24-hour window শেষ। App Review-এ permission যোগ করুন।";
      }
      await supabaseAdmin.from("fb_messages").insert({
        conversation_id: conv.id,
        direction: "out",
        sender: "human",
        kind: conv.source === "comment" ? "comment" : "text",
        text: data.text,
        error: friendly,
      });
      throw new Error(friendly);
    }
    await supabaseAdmin.from("fb_messages").insert({
      conversation_id: conv.id,
      direction: "out",
      sender: "human",
      kind: conv.source === "comment" ? "comment" : "text",
      text: data.text,
      fb_message_id: fbMessageId,
    });
    await supabaseAdmin
      .from("fb_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: data.text.slice(0, 140),
      })
      .eq("id", conv.id);
    return { ok: true };
  });