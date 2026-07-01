
ALTER TABLE public.fb_settings
  ADD COLUMN IF NOT EXISTS moderation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_action text NOT NULL DEFAULT 'hide',
  ADD COLUMN IF NOT EXISTS moderation_block_threshold int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS moderation_block_duration text NOT NULL DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS bad_words text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS whitelist_words text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.fb_settings
  DROP CONSTRAINT IF EXISTS fb_settings_moderation_action_check,
  ADD CONSTRAINT fb_settings_moderation_action_check CHECK (moderation_action IN ('hide','delete'));

ALTER TABLE public.fb_settings
  DROP CONSTRAINT IF EXISTS fb_settings_moderation_block_duration_check,
  ADD CONSTRAINT fb_settings_moderation_block_duration_check CHECK (moderation_block_duration IN ('permanent','24h','7d'));

CREATE TABLE IF NOT EXISTS public.fb_user_offenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,
  fb_user_id text NOT NULL,
  user_name text,
  offense_count int NOT NULL DEFAULT 0,
  last_offense_at timestamptz,
  blocked_at timestamptz,
  block_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, fb_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fb_user_offenses TO authenticated;
GRANT ALL ON public.fb_user_offenses TO service_role;

ALTER TABLE public.fb_user_offenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage offenses" ON public.fb_user_offenses;
CREATE POLICY "Admins manage offenses" ON public.fb_user_offenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_fb_user_offenses_updated_at ON public.fb_user_offenses;
CREATE TRIGGER trg_fb_user_offenses_updated_at
  BEFORE UPDATE ON public.fb_user_offenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
