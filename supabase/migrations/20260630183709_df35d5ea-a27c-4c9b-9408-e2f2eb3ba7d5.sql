
-- 1) ai_models catalog
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = platform shared
  slug TEXT NOT NULL,                 -- e.g. google/gemini-2.5-pro
  display_name TEXT NOT NULL,
  family TEXT,                        -- gpt|gemini|claude|llama
  modality TEXT NOT NULL DEFAULT 'text', -- text|image|audio|embedding|multimodal
  context_window INT,
  max_output_tokens INT,
  input_cost_per_1k NUMERIC(12,6) NOT NULL DEFAULT 0,
  output_cost_per_1k NUMERIC(12,6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  supports_tools BOOLEAN NOT NULL DEFAULT false,
  supports_vision BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (provider_id, slug, tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_models TO authenticated;
GRANT ALL ON public.ai_models TO service_role;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ai_models (shared + own)" ON public.ai_models
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tenant members write own ai_models" ON public.ai_models
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "tenant members update own ai_models" ON public.ai_models
  FOR UPDATE TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "tenant members delete own ai_models" ON public.ai_models
  FOR DELETE TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "admins manage shared ai_models" ON public.ai_models
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS ai_models_provider_idx ON public.ai_models(provider_id) WHERE deleted_at IS NULL;
CREATE TRIGGER ai_models_touch BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) ai_usage_stats daily rollup
CREATE TABLE IF NOT EXISTS public.ai_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  model_slug TEXT NOT NULL,
  usage_date DATE NOT NULL,
  request_count BIGINT NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  cost_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, provider_id, model_slug, usage_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_stats TO authenticated;
GRANT ALL ON public.ai_usage_stats TO service_role;
ALTER TABLE public.ai_usage_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members read usage" ON public.ai_usage_stats
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage usage" ON public.ai_usage_stats
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS ai_usage_tenant_date_idx ON public.ai_usage_stats(tenant_id, usage_date DESC) WHERE deleted_at IS NULL;
CREATE TRIGGER ai_usage_stats_touch BEFORE UPDATE ON public.ai_usage_stats
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) bump_ai_usage helper (called from server after each AI request)
CREATE OR REPLACE FUNCTION public.bump_ai_usage(
  _tenant UUID, _provider UUID, _model TEXT,
  _in BIGINT, _out BIGINT, _cost_cents BIGINT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.ai_usage_stats(tenant_id, provider_id, model_slug, usage_date,
    request_count, input_tokens, output_tokens, total_tokens, cost_cents)
  VALUES (_tenant, _provider, _model, (now() AT TIME ZONE 'UTC')::date,
    1, _in, _out, _in + _out, _cost_cents)
  ON CONFLICT (tenant_id, provider_id, model_slug, usage_date) DO UPDATE
    SET request_count = ai_usage_stats.request_count + 1,
        input_tokens  = ai_usage_stats.input_tokens  + EXCLUDED.input_tokens,
        output_tokens = ai_usage_stats.output_tokens + EXCLUDED.output_tokens,
        total_tokens  = ai_usage_stats.total_tokens  + EXCLUDED.total_tokens,
        cost_cents    = ai_usage_stats.cost_cents    + EXCLUDED.cost_cents,
        updated_at    = now();
END $$;
