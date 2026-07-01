import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFbSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS — at most one row visible per user
    const { data, error } = await context.supabase
      .from("fb_settings")
      .select("ai_global_enabled, ai_system_prompt, reply_delay_ms, humanize_enabled, strip_markdown, comment_max_lines, messenger_length, moderation_enabled, moderation_action, moderation_block_threshold, moderation_block_duration, moderation_match_threshold, bad_words, whitelist_words")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        ai_global_enabled: true,
        ai_system_prompt: "",
        reply_delay_ms: 1500,
        humanize_enabled: true,
        strip_markdown: true,
        comment_max_lines: 3,
        messenger_length: "auto",
        moderation_enabled: false,
        moderation_action: "hide",
        moderation_block_threshold: 3,
        moderation_block_duration: "permanent",
        moderation_match_threshold: 80,
        bad_words: [],
        whitelist_words: [],
      }
    );
  });

const UpdateSchema = z.object({
  ai_global_enabled: z.boolean().optional(),
  ai_system_prompt: z.string().max(8000).optional(),
  reply_delay_ms: z.number().int().min(0).max(60000).optional(),
  humanize_enabled: z.boolean().optional(),
  strip_markdown: z.boolean().optional(),
  comment_max_lines: z.number().int().min(1).max(10).optional(),
  messenger_length: z.enum(["auto", "short", "detailed"]).optional(),
  moderation_enabled: z.boolean().optional(),
  moderation_action: z.enum(["hide", "delete"]).optional(),
  moderation_block_threshold: z.number().int().min(1).max(10).optional(),
  moderation_block_duration: z.enum(["permanent", "24h", "7d"]).optional(),
  moderation_match_threshold: z.number().int().min(50).max(100).optional(),
  bad_words: z.array(z.string().min(1).max(100)).max(500).optional(),
  whitelist_words: z.array(z.string().min(1).max(100)).max(500).optional(),
});

export const updateFbSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Find existing row for this workspace (RLS scopes to caller's workspace).
    const { data: existing, error: selErr } = await context.supabase
      .from("fb_settings")
      .select("row_id")
      .limit(1)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    if (existing?.row_id) {
      const { error } = await context.supabase
        .from("fb_settings")
        .update(data)
        .eq("row_id", existing.row_id);
      if (error) throw new Error(error.message);
    } else {
      // workspace_id is auto-filled by the fill_workspace_id trigger.
      const { error } = await context.supabase
        .from("fb_settings")
        .insert(data as any);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
