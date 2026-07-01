import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";

const GRAPH = "https://graph.facebook.com/v21.0";

function redirectTo(origin: string, params: Record<string, string>) {
  const url = new URL("/facebook", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

export const Route = createFileRoute("/api/public/fb/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const stateParam = url.searchParams.get("state");
        const fbError = url.searchParams.get("error");
        const fbErrorMsg = url.searchParams.get("error_description");

        if (fbError) {
          return redirectTo(origin, { fb_oauth: "error", msg: fbErrorMsg || fbError });
        }

        const stateCookie = getCookie("fb_oauth_state");
        deleteCookie("fb_oauth_state", { path: "/" });
        if (!code || !stateParam || !stateCookie || stateCookie !== stateParam) {
          return redirectTo(origin, { fb_oauth: "error", msg: "Invalid OAuth state" });
        }

        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        if (!appId || !appSecret) {
          return redirectTo(origin, { fb_oauth: "error", msg: "Facebook app not configured" });
        }

        const redirectUri = `${origin}/api/public/fb/oauth/callback`;

        try {
          // 1) Exchange code → short-lived user access token
          const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
          tokenUrl.searchParams.set("client_id", appId);
          tokenUrl.searchParams.set("client_secret", appSecret);
          tokenUrl.searchParams.set("redirect_uri", redirectUri);
          tokenUrl.searchParams.set("code", code);
          const tokRes = await fetch(tokenUrl.toString());
          const tokJson: any = await tokRes.json();
          if (!tokRes.ok || !tokJson.access_token) {
            throw new Error(tokJson?.error?.message ?? "Token exchange failed");
          }
          let userToken: string = tokJson.access_token;

          // 2) Upgrade to long-lived user token (60 days)
          const llUrl = new URL(`${GRAPH}/oauth/access_token`);
          llUrl.searchParams.set("grant_type", "fb_exchange_token");
          llUrl.searchParams.set("client_id", appId);
          llUrl.searchParams.set("client_secret", appSecret);
          llUrl.searchParams.set("fb_exchange_token", userToken);
          const llRes = await fetch(llUrl.toString());
          const llJson: any = await llRes.json();
          if (llRes.ok && llJson.access_token) userToken = llJson.access_token;

          // 3) List the user's pages with per-page tokens
          const acctsUrl = new URL(`${GRAPH}/me/accounts`);
          acctsUrl.searchParams.set("access_token", userToken);
          acctsUrl.searchParams.set("fields", "id,name,access_token,category");
          acctsUrl.searchParams.set("limit", "200");
          const acctsRes = await fetch(acctsUrl.toString());
          const acctsJson: any = await acctsRes.json();
          if (!acctsRes.ok) {
            throw new Error(acctsJson?.error?.message ?? "Could not list pages");
          }
          const pages: Array<{ id: string; name: string; access_token: string }> =
            acctsJson.data ?? [];

          if (pages.length === 0) {
            return redirectTo(origin, { fb_oauth: "error", msg: "No Pages found for this account" });
          }

          // 4) Save each page + subscribe webhook
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { subscribePageWebhook } = await import("@/lib/fb-graph.server");
          let saved = 0;
          let subscribed = 0;
          for (const p of pages) {
            if (!p.access_token) continue;
            let subOk = false;
            try {
              await subscribePageWebhook(p.id, p.access_token);
              subOk = true;
              subscribed += 1;
            } catch (e) {
              console.error("subscribe failed", p.id, e);
            }
            const { error } = await supabaseAdmin.from("fb_pages").upsert(
              {
                page_id: p.id,
                page_name: p.name,
                access_token: p.access_token,
                subscribed: subOk,
                last_subscribed_at: subOk ? new Date().toISOString() : null,
              },
              { onConflict: "page_id" },
            );
            if (!error) saved += 1;
          }

          return redirectTo(origin, {
            fb_oauth: "success",
            saved: String(saved),
            subscribed: String(subscribed),
          });
        } catch (e: any) {
          console.error("fb oauth callback error", e);
          return redirectTo(origin, { fb_oauth: "error", msg: e?.message ?? "OAuth failed" });
        }
      },
    },
  },
});
