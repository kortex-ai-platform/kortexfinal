
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  services TEXT[] NOT NULL DEFAULT '{}',
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  fb_page_id TEXT,
  ai_provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','expired','cancelled')),
  monthly_fee NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage clients" ON public.clients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER clients_touch_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX clients_status_idx ON public.clients(status);
CREATE INDEX clients_expires_at_idx ON public.clients(expires_at);
