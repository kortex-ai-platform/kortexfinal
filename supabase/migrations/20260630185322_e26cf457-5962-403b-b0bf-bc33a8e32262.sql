
-- API USAGE
CREATE TABLE public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT,
  duration_ms INT,
  request_bytes BIGINT,
  response_bytes BIGINT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX api_usage_tenant_idx ON public.api_usage(tenant_id, created_at DESC);
CREATE INDEX api_usage_endpoint_idx ON public.api_usage(endpoint, created_at DESC);
GRANT SELECT, INSERT ON public.api_usage TO authenticated;
GRANT ALL ON public.api_usage TO service_role;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_usage_tenant_read" ON public.api_usage FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "api_usage_admin_read" ON public.api_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- WEBHOOK LOGS
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('facebook','instagram','whatsapp','stripe','paddle','bkash','nagad','rocket','other')),
  event_type TEXT,
  external_id TEXT,
  signature_ok BOOLEAN,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','processed','failed','ignored')),
  attempt_count INT NOT NULL DEFAULT 1,
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX webhook_logs_tenant_idx ON public.webhook_logs(tenant_id, created_at DESC);
CREATE INDEX webhook_logs_provider_idx ON public.webhook_logs(provider, created_at DESC);
GRANT SELECT, INSERT ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_logs_tenant_read" ON public.webhook_logs FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "webhook_logs_admin_read" ON public.webhook_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- SYSTEM LOGS (admin-only)
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('debug','info','warn','error','fatal')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id TEXT,
  stack TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX system_logs_level_idx ON public.system_logs(level, created_at DESC);
CREATE INDEX system_logs_source_idx ON public.system_logs(source, created_at DESC);
GRANT SELECT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_logs_admin_only" ON public.system_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','error')),
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, is_read, created_at DESC) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SETTINGS (global when tenant_id IS NULL, else per-tenant)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX settings_scope_key_uniq ON public.settings(COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), key) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_tenant_rw" ON public.settings FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "settings_admin_all" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before JSONB,
  after JSONB,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX audit_logs_tenant_idx ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_tenant_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (tenant_id IS NOT NULL AND public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
