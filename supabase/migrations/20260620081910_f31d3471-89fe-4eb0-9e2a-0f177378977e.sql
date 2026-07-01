CREATE TABLE public.branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_settings TO authenticated;
GRANT ALL ON public.branding_settings TO service_role;

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read branding"
ON public.branding_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage branding"
ON public.branding_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER branding_settings_touch
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.branding_settings (brand_name, phone, website) VALUES ('', '', '');