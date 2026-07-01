import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden");
}

export const listPublicProducts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,description,features,price,stock,status,gallery,created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPublicProduct = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("products")
      .select("id,name,slug,description,features,price,stock,status,gallery")
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Product not found");
    return row;
  });

export const listProductsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens"),
  description: z.string().max(5000).default(""),
  features: z.string().max(5000).default(""),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  status: z.enum(["active", "draft"]),
  gallery: z.array(z.string().url()).max(20).default([]),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    if (data.id) {
      const { error } = await context.supabase
        .from("products")
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description,
          features: data.features,
          price: data.price,
          stock: data.stock,
          status: data.status,
          gallery: data.gallery,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("products")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description,
        features: data.features,
        price: data.price,
        stock: data.stock,
        status: data.status,
        gallery: data.gallery,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });