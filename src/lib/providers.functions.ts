import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIES = ["text", "image", "voice_tts", "voice_stt"] as const;
const VENDORS = [
  "gemini",
  "openai",
  "grok",
  "claude",
  "openrouter",
  "openai_image",
  "stability",
  "openai_tts",
  "openai_stt",
  "elevenlabs",
] as const;

function mask(k: string | null | undefined) {
  if (!k) return "";
  if (k.length <= 6) return "••••";
  return "••••••••" + k.slice(-4);
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden");
}

export const listProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // AI providers are configured centrally by the platform admin and
    // shared with every workspace automatically. Read with the admin
    // client so RLS does not hide them from regular users.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: providers, error } = await supabaseAdmin
      .from("ai_providers")
      .select(
        "id,name,slug,vendor,category,base_url,model,api_key,priority,weight,enabled,is_primary,timeout_ms,max_retries,notes,created_at,updated_at",
      )
      .order("category", { ascending: true })
      .order("priority", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: health } = await supabaseAdmin
      .from("ai_provider_health")
      .select("*");
    const hMap = new Map<string, any>(
      (health ?? []).map((h: any) => [h.provider_id, h]),
    );
    // For non-admins: only show the platform-managed providers that
    // actually have a key (so the user sees a "ready" OpenRouter instead
    // of their own empty workspace duplicates).
    const rows = (providers ?? []).filter((p: any) =>
      isAdmin ? true : Boolean(p.api_key),
    );
    // De-duplicate by slug for non-admins (admin-owned row wins because
    // it has the key and is ordered first by priority).
    const seen = new Set<string>();
    const deduped = isAdmin
      ? rows
      : rows.filter((p: any) => {
          const k = `${p.category}:${p.slug}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
    return deduped.map((p: any) => {
      const { api_key, ...rest } = p;
      return {
        ...rest,
        maskedKey: mask(api_key),
        hasKey: Boolean(api_key),
        readOnly: !isAdmin,
        health: hMap.get(p.id) ?? null,
      };
    });
  });


const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80),
  vendor: z.enum(VENDORS),
  category: z.enum(CATEGORIES),
  base_url: z.string().url().nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  api_key: z.string().optional(),
  priority: z.number().int().min(0).max(10000),
  weight: z.number().int().min(1).max(100),
  enabled: z.boolean(),
  timeout_ms: z.number().int().min(1000).max(120000),
  notes: z.string().max(500).nullable().optional(),
});

export const upsertProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const base: any = {
      name: data.name,
      slug: data.slug,
      vendor: data.vendor,
      category: data.category,
      base_url: data.base_url ?? null,
      model: data.model ?? null,
      priority: data.priority,
      weight: data.weight,
      enabled: data.enabled,
      timeout_ms: data.timeout_ms,
      notes: data.notes ?? null,
    };
    if (data.api_key && data.api_key.trim() !== "") base.api_key = data.api_key.trim();
    if (data.id) {
      const { error } = await context.supabase
        .from("ai_providers")
        .update(base)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("ai_providers")
      .insert(base)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase
      .from("ai_providers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase
      .from("ai_providers")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPrimaryProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { data: row, error: e0 } = await context.supabase
      .from("ai_providers")
      .select("category")
      .eq("id", data.id)
      .single();
    if (e0) throw new Error(e0.message);
    const { error: e1 } = await context.supabase
      .from("ai_providers")
      .update({ is_primary: false })
      .eq("category", row.category);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await context.supabase
      .from("ai_providers")
      .update({ is_primary: true })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const reorderProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { data: cur, error: e0 } = await context.supabase
      .from("ai_providers")
      .select("id,category,priority")
      .eq("id", data.id)
      .single();
    if (e0) throw new Error(e0.message);
    const delta = data.direction === "up" ? -1 : 1;
    const newPriority = Math.max(0, Number(cur.priority) + delta);
    const { error } = await context.supabase
      .from("ai_providers")
      .update({ priority: newPriority })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pingProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { pingProviderById } = await import("@/lib/ai/router.server");
    return pingProviderById(context.supabase, data.id);
  });

export const runTestPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.enum(CATEGORIES),
        prompt: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { aiRoute } = await import("@/lib/ai/router.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const r = await aiRoute(supabaseAdmin, {
      category: data.category,
      messageType: data.category as any,
      workspaceId: member?.workspace_id ?? null,
      payload:
        data.category === "text"
          ? { prompt: data.prompt }
          : data.category === "image"
            ? { prompt: data.prompt }
            : data.category === "voice_tts"
              ? { input: data.prompt }
              : { audioBase64: data.prompt },
    });
    return {
      providerName: r.providerName,
      attempts: r.attempts,
      failovers: r.failovers,
      responseMs: r.responseMs,
      text: r.text ?? null,
      imageUrl: r.imageUrl ?? null,
      hasImage: Boolean(r.imageBase64 || r.imageUrl),
      hasAudio: Boolean(r.audioBase64),
    };
  });

const seedPresets = [
  { name: "Google Gemini", slug: "gemini", vendor: "gemini", category: "text", model: "gemini-2.5-flash", priority: 10 },
  { name: "OpenAI", slug: "openai", vendor: "openai", category: "text", model: "gpt-4o-mini", priority: 20 },
  { name: "Anthropic Claude", slug: "claude", vendor: "claude", category: "text", model: "claude-3-5-sonnet-latest", priority: 30 },
  { name: "xAI Grok", slug: "grok", vendor: "grok", category: "text", model: "grok-2-latest", priority: 40 },
  { name: "OpenRouter", slug: "openrouter", vendor: "openrouter", category: "text", model: "openai/gpt-4o-mini", priority: 5 },
  { name: "OpenAI Image", slug: "openai-image", vendor: "openai_image", category: "image", model: "gpt-image-1", priority: 10 },
  { name: "Stability AI", slug: "stability", vendor: "stability", category: "image", model: "stable-image-core", priority: 20 },
  { name: "OpenAI TTS", slug: "openai-tts", vendor: "openai_tts", category: "voice_tts", model: "gpt-4o-mini-tts", priority: 10 },
  { name: "ElevenLabs", slug: "elevenlabs", vendor: "elevenlabs", category: "voice_tts", priority: 20 },
  { name: "OpenAI Whisper", slug: "openai-whisper", vendor: "openai_stt", category: "voice_stt", model: "gpt-4o-mini-transcribe", priority: 10 },
];

export const seedDefaultProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const { data: existing } = await context.supabase
      .from("ai_providers")
      .select("slug");
    const have = new Set((existing ?? []).map((r: any) => r.slug));
    const rows = seedPresets
      .filter((p) => !have.has(p.slug))
      .map((p) => ({
        ...p,
        enabled: false,
        weight: 1,
        timeout_ms: 30000,
      }));
    if (rows.length === 0) return { inserted: 0 };
    const { error } = await context.supabase
      .from("ai_providers")
      .insert(rows as any);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

export const listLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.enum(CATEGORIES).optional(),
        status: z.string().optional(),
        providerId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    let q = context.supabase
      .from("ai_request_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.category) q = q.eq("category", data.category);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.providerId) q = q.eq("provider_id", data.providerId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
