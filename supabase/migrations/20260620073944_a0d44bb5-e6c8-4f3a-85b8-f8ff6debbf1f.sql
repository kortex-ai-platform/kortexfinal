
-- enums
CREATE TYPE public.ai_provider_category AS ENUM ('text','image','voice_tts','voice_stt');
CREATE TYPE public.ai_provider_status AS ENUM ('unknown','online','degraded','offline','error');
CREATE TYPE public.ai_request_status AS ENUM ('success','timeout','rate_limit','api_error','invalid','server_down');
CREATE TYPE public.ai_message_type AS ENUM ('text','image','voice_tts','voice_stt','mixed');

-- providers
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  vendor text NOT NULL,
  category public.ai_provider_category NOT NULL,
  base_url text,
  model text,
  api_key text,
  priority int NOT NULL DEFAULT 100,
  weight int NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  timeout_ms int NOT NULL DEFAULT 30000,
  max_retries int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_providers TO authenticated;
GRANT ALL ON public.ai_providers TO service_role;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_providers" ON public.ai_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX ai_providers_cat_idx ON public.ai_providers(category, enabled, priority, weight);

-- health
CREATE TABLE public.ai_provider_health (
  provider_id uuid PRIMARY KEY REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  status public.ai_provider_status NOT NULL DEFAULT 'unknown',
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  avg_response_ms int NOT NULL DEFAULT 0,
  success_count bigint NOT NULL DEFAULT 0,
  failure_count bigint NOT NULL DEFAULT 0,
  consecutive_failures int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provider_health TO authenticated;
GRANT ALL ON public.ai_provider_health TO service_role;
ALTER TABLE public.ai_provider_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_provider_health" ON public.ai_provider_health
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_provider_health_updated_at BEFORE UPDATE ON public.ai_provider_health
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- create health row when provider is inserted
CREATE OR REPLACE FUNCTION public.create_provider_health()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.ai_provider_health(provider_id) VALUES (NEW.id)
  ON CONFLICT (provider_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ai_provider_create_health AFTER INSERT ON public.ai_providers
  FOR EACH ROW EXECUTE FUNCTION public.create_provider_health();

-- logs
CREATE TABLE public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.ai_provider_category NOT NULL,
  message_type public.ai_message_type NOT NULL,
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  provider_name text,
  attempt int NOT NULL DEFAULT 1,
  failover_from uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  status public.ai_request_status NOT NULL,
  response_ms int NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  prompt_preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_request_logs TO authenticated;
GRANT ALL ON public.ai_request_logs TO service_role;
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_request_logs" ON public.ai_request_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX ai_request_logs_created_idx ON public.ai_request_logs(created_at DESC);
CREATE INDEX ai_request_logs_provider_idx ON public.ai_request_logs(provider_id, created_at DESC);
