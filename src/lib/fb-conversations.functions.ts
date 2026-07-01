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

const ListSchema = z.object({
  folder: z.enum(["all", "messenger", "comment", "unread"]).default("all"),
});

export const listFbConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    let q = context.supabase
      .from("fb_conversations")
      .select(
        "id, page_id, source, fb_user_id, user_name, user_avatar_url, post_id, last_message_at, last_message_preview, unread_count, ai_enabled",
      )
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (data.folder === "messenger") q = q.eq("source", "messenger");
    else if (data.folder === "comment") q = q.eq("source", "comment");
    else if (data.folder === "unread") q = q.gt("unread_count", 0);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const ToggleSchema = z.object({
  conversationId: z.string().uuid(),
  ai_enabled: z.boolean().nullable(),
});

export const setConversationAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase
      .from("fb_conversations")
      .update({ ai_enabled: data.ai_enabled })
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MarkSchema = z.object({ conversationId: z.string().uuid() });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MarkSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    await context.supabase
      .from("fb_conversations")
      .update({ unread_count: 0 })
      .eq("id", data.conversationId);
    return { ok: true };
  });

const PostCtxSchema = z.object({ conversationId: z.string().uuid() });

export const getConversationPostContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PostCtxSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv } = await supabaseAdmin
      .from("fb_conversations")
      .select("id, page_id, source, post_id")
      .eq("id", data.conversationId)
      .single();
    if (!conv || conv.source !== "comment" || !conv.post_id) {
      return { ok: false as const, reason: "not a comment thread" };
    }
    const { data: page } = await supabaseAdmin
      .from("fb_pages")
      .select("access_token")
      .eq("page_id", conv.page_id)
      .single();
    if (!page) return { ok: false as const, reason: "page not connected" };
    const { fetchPostContext } = await import("./fb-graph.server");
    const post = await fetchPostContext(page.access_token, conv.post_id);
    if (!post) return { ok: false as const, reason: "post not found" };
    return { ok: true as const, post };
  });

const RefreshSchema = z.object({ conversationId: z.string().uuid() });

export const refreshConversationProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RefreshSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv } = await supabaseAdmin
      .from("fb_conversations")
      .select("id, page_id, source, fb_user_id")
      .eq("id", data.conversationId)
      .single();
    if (!conv) throw new Error("Conversation not found");
    const { data: page } = await supabaseAdmin
      .from("fb_pages")
      .select("access_token")
      .eq("page_id", conv.page_id)
      .single();

    if (!page) throw new Error("Page not connected");
    const { fetchUserProfile } = await import("./fb-graph.server");
    const profile = await fetchUserProfile(conv.fb_user_id, page.access_token, conv.page_id);
    if (!profile.name && !profile.avatar) {
      return { ok: false, reason: "profile unavailable (app may be in dev mode)" };
    }
    await supabaseAdmin
      .from("fb_conversations")
      .update({
        user_name: profile.name ?? undefined,
        user_avatar_url: profile.avatar ?? undefined,
      })
      .eq("id", conv.id);
    return { ok: true, name: profile.name, avatar: profile.avatar };
  });

const SaveNameSchema = z.object({
  conversationId: z.string().uuid(),
  userName: z.string().trim().max(120).nullable(),
});

export const saveConversationName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveNameSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const cleanName = data.userName?.trim() || null;
    const { error } = await context.supabase
      .from("fb_conversations")
      .update({ user_name: cleanName })
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true, name: cleanName };
  });