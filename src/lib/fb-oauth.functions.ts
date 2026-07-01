import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { randomBytes } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "pages_read_engagement",
  "pages_manage_engagement",
  "pages_read_user_content",
  "pages_manage_metadata",
].join(",");

/**
 * Build the Facebook OAuth dialog URL and stash a CSRF state cookie.
 * Caller (admin) then sets window.location.href = url.
 */
export const getFbOAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d as { origin: string })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) throw new Error("FACEBOOK_APP_ID is not configured");

    const state = randomBytes(24).toString("hex");
    setCookie("fb_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60, // 10 minutes
    });

    const redirectUri = `${data.origin}/api/public/fb/oauth/callback`;
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("auth_type", "rerequest");

    return { url: url.toString(), redirectUri };
  });
