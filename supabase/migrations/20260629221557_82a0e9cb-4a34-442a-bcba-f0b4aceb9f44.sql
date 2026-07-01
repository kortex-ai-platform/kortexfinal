ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS webhook_base_url TEXT NOT NULL DEFAULT 'https://codex.business',
  ADD COLUMN IF NOT EXISTS webhook_verify_token TEXT NOT NULL DEFAULT '';

INSERT INTO public.branding_settings (singleton, brand_name, phone, website, webhook_base_url, webhook_verify_token)
VALUES (true, 'CodeX', '', 'https://codex.business', 'https://codex.business', '')
ON CONFLICT (singleton) DO NOTHING;