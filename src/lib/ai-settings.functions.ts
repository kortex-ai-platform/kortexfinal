import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function mask(key: string | null | undefined): string {
  if (!key) return "";
  if (key.length <= 6) return "••••";
  return "••••••••" + key.slice(-4);
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden");
}

export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const { data, error } = await context.supabase
      .from("ai_settings")
      .select("id, model, temperature, max_tokens, gemini_api_key, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      model: data?.model ?? "google/gemini-3-flash-preview",
      temperature: Number(data?.temperature ?? 0.7),
      max_tokens: data?.max_tokens ?? 1024,
      hasKey: Boolean(data?.gemini_api_key),
      maskedKey: mask(data?.gemini_api_key),
      updated_at: data?.updated_at ?? null,
    };
  });

const UpdateSchema = z.object({
  model: z.string().min(1).max(120),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().min(64).max(8192),
  gemini_api_key: z.string().optional(),
});

export const updateAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const update: {
      model: string;
      temperature: number;
      max_tokens: number;
      gemini_api_key?: string;
    } = {
      model: data.model,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
    };
    if (data.gemini_api_key && data.gemini_api_key.trim() !== "") {
      update.gemini_api_key = data.gemini_api_key.trim();
    }
    const { error } = await context.supabase
      .from("ai_settings")
      .update(update)
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testGeminiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const { data: row, error } = await context.supabase
      .from("ai_settings")
      .select("gemini_api_key")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const key = row?.gemini_api_key;
    if (!key) return { ok: false, message: "No API key saved." };

    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?key=" +
          encodeURIComponent(key),
      );
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, message: `Gemini API error (${res.status}): ${txt.slice(0, 200)}` };
      }
      const json = (await res.json()) as { models?: unknown[] };
      const count = Array.isArray(json.models) ? json.models.length : 0;
      return { ok: true, message: `Key is valid. ${count} models available.` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { ok: false, message: msg };
    }
  });