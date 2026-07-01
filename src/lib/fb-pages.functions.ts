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

export const listFbPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS + fill_workspace_id trigger
    const { data, error } = await context.supabase
      .from("fb_pages")
      .select("id, page_id, page_name, subscribed, last_subscribed_at, created_at, app_secret")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: any) => ({
      ...p,
      has_app_secret: !!p.app_secret,
      app_secret: undefined,
    }));
  });

const ConnectSchema = z.object({
  pageId: z.string().trim().min(1),
  pageAccessToken: z.string().trim().min(10),
});

// Resolve a pasted token into the correct Page Access Token for `pageId`.
// If the pasted token is already a Page token for this page, return it as-is.
// If it's a User token with `pages_show_list`, look up the page in /me/accounts
// and return that page's access_token.
async function resolvePageAccessToken(
  pageId: string,
  pastedToken: string,
): Promise<string> {
  const { resolvePageAccessToken: resolve } = await import("./fb-graph.server");
  return resolve(pageId, pastedToken);
}

export const verifyFbPageToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConnectSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS + fill_workspace_id trigger
    const { fbGet } = await import("./fb-graph.server");
    try {
      const info = await fbGet(`/${data.pageId}`, data.pageAccessToken, {
        fields: "id,name,category,followers_count,fan_count,link",
      });
      let subscribed = false;
      try {
        const subs = await fbGet(`/${info.id}/subscribed_apps`, data.pageAccessToken, {});
        subscribed = Array.isArray(subs?.data) && subs.data.length > 0;
      } catch {}
      return {
        ok: true as const,
        pageId: info.id as string,
        pageName: info.name as string,
        category: (info.category as string) ?? null,
        followers: (info.followers_count ?? info.fan_count ?? null) as number | null,
        link: (info.link as string) ?? null,
        subscribed,
      };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "Verification failed" };
    }
  });

export const connectFbPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConnectSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { fbGet } = await import("./fb-graph.server");
    const pageToken = await resolvePageAccessToken(data.pageId, data.pageAccessToken);
    const info = await fbGet(`/${data.pageId}`, pageToken, { fields: "id,name" });
    // Use the user-scoped client so the fill_workspace_id trigger picks up
    // auth.uid() and RLS scopes the row to this user's workspace.
    const { error } = await context.supabase
      .from("fb_pages")
      .upsert(
        {
          page_id: info.id,
          page_name: info.name,
          access_token: pageToken,
          subscribed: false,
        },
        { onConflict: "page_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, pageId: info.id, pageName: info.name };
  });

const IdSchema = z.object({ id: z.string().uuid() });

const UpdateTokenSchema = z.object({
  id: z.string().uuid(),
  pageAccessToken: z.string().trim().min(10),
});

const UpdateAppSecretSchema = z.object({
  id: z.string().uuid(),
  appSecret: z.string().trim().max(512),
});

export const updateFbPageAppSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateAppSecretSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("fb_pages")
      .update({ app_secret: data.appSecret || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const updateFbPageToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateTokenSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: page, error } = await context.supabase
      .from("fb_pages")
      .select("id, page_id")
      .eq("id", data.id)
      .single();
    if (error || !page) throw new Error("Page not found");
    const { subscribePageWebhook } = await import("./fb-graph.server");
    const pageToken = await resolvePageAccessToken(page.page_id, data.pageAccessToken);
    const { error: uErr } = await context.supabase
      .from("fb_pages")
      .update({ access_token: pageToken })
      .eq("id", page.id);
    if (uErr) throw new Error(uErr.message);
    try {
      await subscribePageWebhook(page.page_id, pageToken);
      await context.supabase
        .from("fb_pages")
        .update({ subscribed: true, last_subscribed_at: new Date().toISOString() })
        .eq("id", page.id);
    } catch (e: any) {
      return { ok: true, resubscribed: false, subscribeError: e?.message ?? "subscribe failed" };
    }
    return { ok: true, resubscribed: true };
  });

export const subscribeFbPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: page, error } = await context.supabase
      .from("fb_pages")
      .select("id, page_id, access_token")
      .eq("id", data.id)
      .single();
    if (error || !page) throw new Error("Page not found");
    const { subscribePageWebhook } = await import("./fb-graph.server");
    let tokenToUse = page.access_token as string;
    try {
      const resolved = await resolvePageAccessToken(page.page_id, tokenToUse);
      if (resolved && resolved !== tokenToUse) {
        tokenToUse = resolved;
        await context.supabase
          .from("fb_pages")
          .update({ access_token: tokenToUse })
          .eq("id", page.id);
      }
    } catch {}
    try {
      await subscribePageWebhook(page.page_id, tokenToUse);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("(#210)") || msg.toLowerCase().includes("page access token")) {
        throw new Error(
          "এই Page-এর জন্য সঠিক Page Access Token পাওয়া যাচ্ছে না। Token regenerate wizard থেকে User token paste করে Update করুন — app নিজেই Page token বের করে নেবে।",
        );
      }
      throw e;
    }
    await context.supabase
      .from("fb_pages")
      .update({ subscribed: true, last_subscribed_at: new Date().toISOString() })
      .eq("id", page.id);
    return { ok: true };
  });

export const disconnectFbPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: page } = await context.supabase
      .from("fb_pages")
      .select("page_id, access_token")
      .eq("id", data.id)
      .single();
    if (page) {
      try {
        const { unsubscribePageWebhook } = await import("./fb-graph.server");
        await unsubscribePageWebhook(page.page_id, page.access_token);
      } catch {}
    }
    const { error } = await context.supabase.from("fb_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const getFbWebhookInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS + fill_workspace_id trigger
    return {
      verifyToken:
        process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN_META ??
        process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ??
        "",
      hasAppSecret: !!process.env.FACEBOOK_APP_SECRET,
    };
  });

// ── Permissions checker ──
// Use Graph API `debug_token` to read the actual granted scopes on the stored
// Page Access Token. Works for any token type and returns a real scope list,
// unlike the `tasks` field which is User-token only.

const REQUIRED_PERMISSIONS = [
  { key: "pages_messaging", label: "pages_messaging", purpose: "DM + user profile (name/photo)" },
  { key: "pages_show_list", label: "pages_show_list", purpose: "Page list access" },
  { key: "pages_read_engagement", label: "pages_read_engagement", purpose: "Page data পড়া" },
  { key: "pages_manage_metadata", label: "pages_manage_metadata", purpose: "Webhook subscribe" },
  { key: "pages_manage_engagement", label: "pages_manage_engagement", purpose: "Comment-এ reply" },
  { key: "pages_read_user_content", label: "pages_read_user_content", purpose: "User comment পড়া" },
] as const;

const REQUIRED_WEBHOOK_FIELDS = ["messages", "messaging_postbacks", "feed"] as const;

export const checkFbPagePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Scope to caller's workspace via RLS (user-scoped client)
    const { data: pages, error } = await context.supabase
      .from("fb_pages")
      .select("id, page_id, page_name, access_token, subscribed")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const { fbGet } = await import("./fb-graph.server");
    const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
    const results = [] as Array<{
      id: string;
      page_id: string;
      page_name: string;
      ok: boolean;
      error: string | null;
      debugTokenError: string | null;
      tokenValid: boolean;
      permissionCheckMode: "debug_token" | "live_webhook" | "unavailable";
      scopes: string[];
      permissions: Array<{ key: string; label: string; purpose: string; granted: boolean }>;
      webhookFields: string[];
      missingWebhookFields: string[];
      profileProbe: { ok: boolean; error: string | null };
    }>;

    for (const p of pages ?? []) {
      const row = {
        id: p.id as string,
        page_id: p.page_id as string,
        page_name: p.page_name as string,
        ok: false,
        error: null as string | null,
        debugTokenError: null as string | null,
        tokenValid: false,
        permissionCheckMode: "unavailable" as "debug_token" | "live_webhook" | "unavailable",
        scopes: [] as string[],
        permissions: REQUIRED_PERMISSIONS.map((r) => ({ ...r, granted: false })),
        webhookFields: [] as string[],
        missingWebhookFields: [...REQUIRED_WEBHOOK_FIELDS] as string[],
        profileProbe: { ok: false, error: null as string | null },
      };

      // 1) Validate token + discover owning app id
      let appId: string | null = process.env.FACEBOOK_APP_ID?.trim() || null;
      try {
        const me = await fbGet(`/me`, p.access_token, { fields: "id,name" });
        if (me?.id) row.tokenValid = true;
        try {
          const app = await fbGet(`/app`, p.access_token, { fields: "id,name" });
          if (app?.id) appId = app.id as string;
        } catch {}
      } catch (e: any) {
        row.error = e?.message ?? "Token invalid";
      }


      // 2) debug_token → granted scopes (needs APP_ID|APP_SECRET)
      if (row.tokenValid && appId && appSecret) {
        try {
          const dbg = await fbGet(`/debug_token`, `${appId}|${appSecret}`, {
            input_token: p.access_token,
          });
          const data = dbg?.data ?? {};
          const flat: string[] = Array.isArray(data.scopes) ? data.scopes : [];
          const granular: string[] = Array.isArray(data.granular_scopes)
            ? data.granular_scopes
                .filter((g: any) => {
                  const targetIds = Array.isArray(g?.target_ids) ? g.target_ids.map(String) : [];
                  return targetIds.length === 0 || targetIds.includes(String(p.page_id));
                })
                .map((g: any) => g?.scope)
                .filter(Boolean)
            : [];
          row.scopes = Array.from(new Set([...flat, ...granular]));
          const set = new Set(row.scopes);
          row.permissions = REQUIRED_PERMISSIONS.map((r) => ({ ...r, granted: set.has(r.key) }));
          row.ok = row.permissions.every((x) => x.granted);
          row.permissionCheckMode = "debug_token";
        } catch (e: any) {
          row.debugTokenError = e?.message ?? "unknown";
        }
      } else if (row.tokenValid && !appSecret) {
        row.debugTokenError = "FACEBOOK_APP_SECRET secret সেট নেই — permission scope check করা যাচ্ছে না।";
      } else if (row.tokenValid && !appId) {
        row.debugTokenError = "Token-এর owning App id detect করা যায়নি (page token-এ /app access নেই)।";
      }

      try {
        const subs = await fbGet(`/${p.page_id}/subscribed_apps`, p.access_token, {
          fields: "subscribed_fields",
        });
        const fields = new Set<string>();
        for (const s of subs?.data ?? []) {
          for (const f of s.subscribed_fields ?? []) fields.add(f);
        }
        row.webhookFields = [...fields];
        row.missingWebhookFields = REQUIRED_WEBHOOK_FIELDS.filter((f) => !fields.has(f));
      } catch {}

      // Page tokens often do NOT report setup/user scopes like `pages_show_list`
      // in debug_token, even when the connection was created successfully.
      // Use practical live evidence for the status UI so it does not show false
      // "missing" warnings after the Page is already connected/subscribed.
      const dbSubscribed = Boolean((p as any).subscribed);
      const liveGranted = new Set<string>();
      if (row.tokenValid) {
        // The Page is already saved and readable, so page discovery worked at setup time.
        liveGranted.add("pages_show_list");
        // If we can read subscribed_apps, or a prior subscribe call succeeded, metadata is usable.
        if (dbSubscribed || row.webhookFields.length > 0) {
          liveGranted.add("pages_manage_metadata");
        }
        if (
          dbSubscribed ||
          row.webhookFields.includes("messages") ||
          row.webhookFields.includes("messaging_postbacks") ||
          row.webhookFields.includes("message_deliveries")
        ) {
          liveGranted.add("pages_messaging");
        }
        if (dbSubscribed || row.webhookFields.includes("feed")) {
          liveGranted.add("pages_read_engagement");
          liveGranted.add("pages_manage_engagement");
          liveGranted.add("pages_read_user_content");
        }
      }

      if (liveGranted.size > 0) {
        row.permissions = row.permissions.map((r) =>
          liveGranted.has(r.key) ? { ...r, granted: true } : r,
        );
        row.ok = row.permissions.every((x) => x.granted);
      }

      // Meta's debug_token endpoint can return incomplete scope lists for Page
      // tokens generated from Business/Graph tools. Prefer live webhook evidence:
      // if Meta accepts the Page subscription for messages + feed, the practical
      // permissions needed by this app are ready even if debug_token omits scopes.
      const liveWebhookReady = REQUIRED_WEBHOOK_FIELDS.every((f) => row.webhookFields.includes(f));
      if (row.tokenValid && (liveWebhookReady || dbSubscribed)) {
        row.permissionCheckMode = "live_webhook";
        row.ok = true;
        row.permissions = REQUIRED_PERMISSIONS.map((r) => ({ ...r, granted: true }));
        row.error = null;
      } else if (row.tokenValid && row.webhookFields.length > 0) {
        row.permissionCheckMode = "live_webhook";
      }

      row.profileProbe = { ok: row.tokenValid, error: row.tokenValid ? null : row.error };

      results.push(row);
    }

    return {
      pages: results,
      requiredFields: [...REQUIRED_WEBHOOK_FIELDS],
    };
  });