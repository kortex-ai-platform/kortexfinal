ALTER TABLE public.fb_settings ADD COLUMN IF NOT EXISTS moderation_match_threshold INT NOT NULL DEFAULT 80;
UPDATE public.fb_settings SET moderation_enabled = true WHERE id = true;
INSERT INTO public.fb_settings (id, moderation_enabled, moderation_match_threshold) VALUES (true, true, 80) ON CONFLICT (id) DO UPDATE SET moderation_enabled = true;