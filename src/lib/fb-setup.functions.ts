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

export const getFbSetupStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const hasVerifyToken = !!(
      process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN_META ??
      process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN
    );
    const hasAppSecret = !!process.env.FACEBOOK_APP_SECRET;
    const hasAppId = !!process.env.FACEBOOK_APP_ID;
    const hasLovableAi = !!process.env.LOVABLE_API_KEY;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count: providerCount } = await supabaseAdmin
      .from("ai_providers")
      .select("id", { count: "exact", head: true })
      .eq("category", "text")
      .eq("enabled", true)
      .not("api_key", "is", null);
    const hasAiProvider = (providerCount ?? 0) > 0;

    const { data: pages } = await context.supabase
      .from("fb_pages")
      .select("id, page_id, page_name, subscribed");
    const { data: settings } = await context.supabase
      .from("fb_settings")
      .select("ai_global_enabled, ai_system_prompt")
      .limit(1)
      .maybeSingle();

    const pageCount = pages?.length ?? 0;
    const subscribedCount = pages?.filter((p: any) => p.subscribed).length ?? 0;

    const { count: msgCount } = await context.supabase
      .from("fb_messages")
      .select("id", { count: "exact", head: true });


    return {
      env: { hasVerifyToken, hasAppSecret, hasAppId, hasLovableAi, hasAiProvider },
      pages: pages ?? [],
      pageCount,
      subscribedCount,
      aiEnabled: !!settings?.ai_global_enabled,
      hasPrompt: !!settings?.ai_system_prompt?.trim(),
      messageCount: msgCount ?? 0,
    };
  });

const ConnectAndSubscribeSchema = z.object({
  pageId: z.string().trim().min(1),
  pageAccessToken: z.string().trim().min(10),
});

/**
 * One-click: verify the token, save the page, AND subscribe the webhook.
 */
export const connectAndSubscribeFbPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConnectAndSubscribeSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { fbGet, resolvePageAccessToken, subscribePageWebhook } = await import("./fb-graph.server");
    const pageToken = await resolvePageAccessToken(data.pageId, data.pageAccessToken);
    const info = await fbGet(`/${data.pageId}`, pageToken, {
      fields: "id,name,category",
    });
    let subscribed = false;
    let subscribeError: string | null = null;
    try {
      await subscribePageWebhook(info.id, pageToken);
      subscribed = true;
    } catch (e: any) {
      subscribeError = e?.message ?? "Subscribe failed";
    }
    const { error } = await context.supabase
      .from("fb_pages")
      .upsert(
        {
          page_id: info.id,
          page_name: info.name,
          access_token: pageToken,
          subscribed,
          last_subscribed_at: subscribed ? new Date().toISOString() : null,
        },
        { onConflict: "page_id" },
      );

    if (error) throw new Error(error.message);
    return {
      ok: true,
      pageId: info.id,
      pageName: info.name,
      subscribed,
      subscribeError,
    };
  });

const TestSchema = z.object({
  pageId: z.string().min(1),
  recipientPsid: z.string().min(1),
  text: z.string().min(1).max(500),
});

/**
 * Send a test Messenger message from a connected page to a known PSID.
 * The PSID must have messaged the page within the last 24h (FB policy).
 */
export const sendFbTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TestSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { data: page, error } = await context.supabase
      .from("fb_pages")
      .select("access_token")
      .eq("page_id", data.pageId)
      .single();

    if (error || !page) throw new Error("Page not found");
    const { sendMessengerMessage } = await import("./fb-graph.server");
    try {
      const r = await sendMessengerMessage(page.access_token, data.recipientPsid, data.text);
      return { ok: true as const, messageId: r?.message_id ?? null };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "Send failed" };
    }
  });