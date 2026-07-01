
-- 1) brand_memory (one canonical brand profile per tenant)
CREATE TABLE IF NOT EXISTS public.brand_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name TEXT,
  about TEXT,
  tone TEXT,
  voice TEXT,
  policy TEXT,
  do_list TEXT[] NOT NULL DEFAULT '{}',
  dont_list TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{bn,en}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_memory TO authenticated;
GRANT ALL ON public.brand_memory TO service_role;
ALTER TABLE public.brand_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage brand_memory" ON public.brand_memory
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER brand_memory_touch BEFORE UPDATE ON public.brand_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) knowledge_bases
CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'general', -- general|faq|docs|policy
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_bases TO authenticated;
GRANT ALL ON public.knowledge_bases TO service_role;
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage knowledge_bases" ON public.knowledge_bases
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS knowledge_bases_tenant_idx ON public.knowledge_bases(tenant_id) WHERE deleted_at IS NULL;
CREATE TRIGGER knowledge_bases_touch BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) knowledge_documents
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'file', -- file|url|text|faq
  source_url TEXT,
  storage_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending|processing|ready|failed
  error TEXT,
  token_count INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage knowledge_documents" ON public.knowledge_documents
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS knowledge_docs_kb_idx ON public.knowledge_documents(knowledge_base_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS knowledge_docs_tenant_idx ON public.knowledge_documents(tenant_id) WHERE deleted_at IS NULL;
CREATE TRIGGER knowledge_documents_touch BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) prompt_templates
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = platform-shared
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                    -- reply|comment|summary|classify
  content TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_templates TO authenticated;
GRANT ALL ON public.prompt_templates TO service_role;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read prompt_templates (own + shared)" ON public.prompt_templates
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "write own prompt_templates" ON public.prompt_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "update own prompt_templates" ON public.prompt_templates
  FOR UPDATE TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "delete own prompt_templates" ON public.prompt_templates
  FOR DELETE TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "admins manage shared prompt_templates" ON public.prompt_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER prompt_templates_touch BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) ai_personalities
CREATE TABLE IF NOT EXISTS public.ai_personalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = platform preset
  name TEXT NOT NULL,
  description TEXT,
  tone TEXT,                        -- friendly|professional|playful|formal
  system_prompt TEXT NOT NULL,
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_personalities TO authenticated;
GRANT ALL ON public.ai_personalities TO service_role;
ALTER TABLE public.ai_personalities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ai_personalities (own + shared)" ON public.ai_personalities
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "write own ai_personalities" ON public.ai_personalities
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "update own ai_personalities" ON public.ai_personalities
  FOR UPDATE TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "delete own ai_personalities" ON public.ai_personalities
  FOR DELETE TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "admins manage shared ai_personalities" ON public.ai_personalities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER ai_personalities_touch BEFORE UPDATE ON public.ai_personalities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed shared personality presets
INSERT INTO public.ai_personalities (tenant_id, name, tone, system_prompt, temperature)
VALUES
  (NULL, 'Friendly', 'friendly', 'You are a warm, friendly assistant. Use casual, encouraging language.', 0.8),
  (NULL, 'Professional', 'professional', 'You are a concise, professional assistant. Be precise and polite.', 0.5),
  (NULL, 'Playful', 'playful', 'You are a witty, playful assistant. Use light humor when appropriate.', 0.9),
  (NULL, 'Formal', 'formal', 'You are a formal assistant. Use respectful, structured language.', 0.4)
ON CONFLICT DO NOTHING;
