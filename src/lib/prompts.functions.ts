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

export const listPrompts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const { data, error } = await context.supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  language: z.enum(["en", "bn", "both"]),
  content: z.string().min(1).max(8000),
  is_active: z.boolean().optional(),
});

export const upsertPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    if (data.id) {
      const { error } = await context.supabase
        .from("prompts")
        .update({
          name: data.name,
          language: data.language,
          content: data.content,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("prompts")
      .insert({
        name: data.name,
        language: data.language,
        content: data.content,
        is_active: data.is_active ?? false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deletePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase.from("prompts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setActivePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error: e1 } = await context.supabase
      .from("prompts")
      .update({ is_active: false })
      .neq("id", data.id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await context.supabase
      .from("prompts")
      .update({ is_active: true })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });