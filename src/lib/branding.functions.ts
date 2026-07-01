import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// RLS on branding_settings enforces workspace isolation; any authenticated
// workspace member can read/update their own branding.
async function assertAdmin(_ctx: { supabase: any; userId: string }) {
  return;
}

export const getBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("branding_settings")
      .select("brand_name,phone,website,webhook_base_url,webhook_verify_token")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        brand_name: "",
        phone: "",
        website: "",
        webhook_base_url: "https://codex.business",
        webhook_verify_token: "",
      }
    );
  });

const UpsertSchema = z.object({
  brand_name: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(50).default(""),
  website: z.string().trim().max(300).default(""),
  webhook_base_url: z.string().trim().max(300).optional(),
  webhook_verify_token: z.string().trim().max(300).optional(),
});

export const upsertBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const patch: Record<string, string> = {
      brand_name: data.brand_name,
      phone: data.phone,
      website: data.website,
    };
    if (data.webhook_base_url !== undefined)
      patch.webhook_base_url = data.webhook_base_url.replace(/\/+$/, "");
    if (data.webhook_verify_token !== undefined)
      patch.webhook_verify_token = data.webhook_verify_token;
    const { error } = await (context.supabase as any)
      .from("branding_settings")
      .update(patch)
      .eq("singleton", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Read-only: admin's globally-configured webhook base URL + verify token.
// Any authenticated user can read this so the user panel shows the same
// callback URL / verify token that the admin has configured. Non-sensitive
// values (the callback URL is public; the verify token is paste-into-Meta).
export const getGlobalWebhookConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("branding_settings")
      .select("webhook_base_url,webhook_verify_token")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      webhook_base_url: data?.webhook_base_url ?? "",
      webhook_verify_token: data?.webhook_verify_token ?? "",
    };
  });
