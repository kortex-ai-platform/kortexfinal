-- Backfill Facebook conversations/messages that were created by the public webhook without a workspace.
UPDATE public.fb_conversations AS c
SET workspace_id = p.workspace_id
FROM public.fb_pages AS p
WHERE c.page_id = p.page_id
  AND c.workspace_id IS NULL
  AND p.workspace_id IS NOT NULL;

UPDATE public.fb_messages AS m
SET workspace_id = c.workspace_id
FROM public.fb_conversations AS c
WHERE m.conversation_id = c.id
  AND m.workspace_id IS NULL
  AND c.workspace_id IS NOT NULL;

UPDATE public.fb_user_offenses AS o
SET workspace_id = p.workspace_id
FROM public.fb_pages AS p
WHERE o.page_id = p.page_id
  AND o.workspace_id IS NULL
  AND p.workspace_id IS NOT NULL;

-- Ensure every workspace with a connected Facebook Page has its own AI reply settings.
INSERT INTO public.fb_settings (
  workspace_id,
  ai_global_enabled,
  ai_system_prompt,
  reply_delay_ms,
  humanize_enabled,
  strip_markdown,
  comment_max_lines,
  messenger_length,
  moderation_enabled,
  moderation_action,
  moderation_block_threshold,
  moderation_block_duration,
  moderation_match_threshold,
  bad_words,
  whitelist_words
)
SELECT DISTINCT
  p.workspace_id,
  TRUE,
  'তুমি একজন সহায়ক কাস্টমার সাপোর্ট এজেন্ট। গ্রাহকের প্রশ্ন অনুযায়ী সহজ, ভদ্র এবং সংক্ষিপ্ত বাংলায় উত্তর দাও। তথ্য নিশ্চিত না হলে বানিয়ে বলবে না।',
  1500,
  TRUE,
  TRUE,
  3,
  'auto',
  FALSE,
  'hide',
  3,
  'permanent',
  80,
  ARRAY[]::text[],
  ARRAY[]::text[]
FROM public.fb_pages AS p
WHERE p.workspace_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.fb_settings AS s WHERE s.workspace_id = p.workspace_id
  );