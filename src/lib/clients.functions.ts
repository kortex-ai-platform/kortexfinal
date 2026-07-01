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

const CredentialsSchema = z
  .object({
    fb_page_name: z.string().optional().nullable(),
    fb_access_note: z.string().optional().nullable(),
    ai_provider_name: z.string().optional().nullable(),
    extra: z.string().optional().nullable(),
  })
  .partial()
  .passthrough();

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable().or(z.literal("")),
  company: z.string().trim().max(160).optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable().or(z.literal("")),
  services: z.array(z.string()).default([]),
  credentials: CredentialsSchema.default({}),
  fb_page_id: z.string().optional().nullable().or(z.literal("")),
  ai_provider_id: z.string().uuid().optional().nullable().or(z.literal("")),
  started_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable().or(z.literal("")),
  status: z.enum(["active", "paused", "expired", "cancelled"]).default("active"),
  monthly_fee: z.number().nonnegative().optional().nullable(),
});

const IdSchema = z.object({ id: z.string().uuid() });

function emptyToNull<T extends Record<string, any>>(obj: T): T {
  const out: any = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }
  return out;
}

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const { data, error } = await context.supabase
      .from("clients")
      .select(
        "id, name, email, phone, company, notes, services, credentials, fb_page_id, ai_provider_id, started_at, expires_at, status, monthly_fee, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const row = emptyToNull(data);
    if (!row.started_at) row.started_at = new Date().toISOString();
    const payload: any = { ...row };
    delete payload.id;
    if (data.id) {
      const { error } = await context.supabase
        .from("clients")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("clients")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (created as any).id as string };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "paused", "expired", "cancelled"]),
});

export const setClientStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase
      .from("clients")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listClientOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const [pages, providers] = await Promise.all([
      context.supabase.from("fb_pages").select("page_id, page_name").order("page_name"),
      context.supabase.from("ai_providers").select("id, name, vendor").order("name"),
    ]);
    return {
      fb_pages: (pages.data ?? []) as { page_id: string; page_name: string }[],
      ai_providers: (providers.data ?? []) as { id: string; name: string; vendor: string }[],
    };
  });
