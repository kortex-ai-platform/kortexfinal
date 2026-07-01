import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function resolveTenant(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No tenant found for user");
  return data.tenant_id as string;
}

export const listMyWhatsapp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await resolveTenant(context);
    const db = context.supabase;
    const [{ data: accounts }, { data: numbers }] = await Promise.all([
      db.from("whatsapp_accounts")
        .select("id,waba_id,business_id,name,status,is_connected,created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      db.from("whatsapp_phone_numbers")
        .select("id,whatsapp_account_id,phone_number_id,display_phone_number,verified_name,code_verification_status,quality_rating,is_default,created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);
    return { accounts: accounts ?? [], numbers: numbers ?? [], tenantId };
  });

export const connectMyWhatsappAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name: string;
    waba_id: string;
    business_id?: string;
    access_token?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenant(context);
    const { data: row, error } = await context.supabase
      .from("whatsapp_accounts")
      .insert({
        tenant_id: tenantId,
        waba_id: data.waba_id.trim(),
        name: data.name.trim(),
        business_id: data.business_id?.trim() || null,
        access_token: data.access_token?.trim() || null,
        status: "active",
        is_connected: !!data.access_token,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMyWhatsappAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("whatsapp_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addMyWhatsappNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    whatsapp_account_id: string;
    phone_number_id: string;
    display_phone_number: string;
    verified_name?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const tenantId = await resolveTenant(context);
    const { data: acc, error: ae } = await context.supabase
      .from("whatsapp_accounts")
      .select("id,tenant_id")
      .eq("id", data.whatsapp_account_id)
      .eq("tenant_id", tenantId)
      .single();
    if (ae || !acc) throw new Error("Account not found");
    const { data: row, error } = await context.supabase
      .from("whatsapp_phone_numbers")
      .insert({
        tenant_id: tenantId,
        whatsapp_account_id: data.whatsapp_account_id,
        phone_number_id: data.phone_number_id.trim(),
        display_phone_number: data.display_phone_number.trim(),
        verified_name: data.verified_name?.trim() || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMyWhatsappNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("whatsapp_phone_numbers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
