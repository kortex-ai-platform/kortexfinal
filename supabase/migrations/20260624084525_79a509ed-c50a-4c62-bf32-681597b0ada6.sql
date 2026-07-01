ALTER TABLE public.fb_settings
  ADD COLUMN IF NOT EXISTS humanize_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS strip_markdown boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS comment_max_lines integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS messenger_length text NOT NULL DEFAULT 'auto';