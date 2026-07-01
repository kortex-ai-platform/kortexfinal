
-- Drop singleton constraints
ALTER TABLE public.fb_settings DROP CONSTRAINT IF EXISTS singleton_row;
ALTER TABLE public.fb_settings DROP CONSTRAINT IF EXISTS fb_settings_pkey;
ALTER TABLE public.fb_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fb_settings ALTER COLUMN id DROP NOT NULL;
ALTER TABLE public.fb_settings DROP COLUMN id;

-- New PK on workspace_id
ALTER TABLE public.fb_settings ADD COLUMN IF NOT EXISTS row_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.fb_settings ADD PRIMARY KEY (row_id);
CREATE UNIQUE INDEX IF NOT EXISTS fb_settings_workspace_uniq ON public.fb_settings(workspace_id);

-- Auto-fill workspace_id
DROP TRIGGER IF EXISTS fb_settings_fill_ws ON public.fb_settings;
CREATE TRIGGER fb_settings_fill_ws BEFORE INSERT ON public.fb_settings
  FOR EACH ROW EXECUTE FUNCTION public.fill_workspace_id();
