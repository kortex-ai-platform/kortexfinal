
-- 1) facebook_page_tokens (token rotation history)
CREATE TABLE IF NOT EXISTS public.facebook_page_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fb_page_id UUID NOT NULL REFERENCES public.fb_pages(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'page',     -- page|user|system_user
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  rotated_from UUID REFERENCES public.facebook_page_tokens(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facebook_page_tokens TO authenticated;
GRANT ALL ON public.facebook_page_tokens TO service_role;
ALTER TABLE public.facebook_page_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage fb tokens" ON public.facebook_page_tokens
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS fb_tokens_page_idx ON public.facebook_page_tokens(fb_page_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS fb_tokens_active_idx ON public.facebook_page_tokens(fb_page_id) WHERE is_active AND deleted_at IS NULL;
CREATE TRIGGER fb_tokens_touch BEFORE UPDATE ON public.facebook_page_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) whatsapp_accounts (WABA)
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,                       -- Meta WABA id
  business_id TEXT,
  name TEXT NOT NULL,
  currency TEXT,
  timezone TEXT,
  access_token TEXT,                           -- system user token
  status TEXT NOT NULL DEFAULT 'active',       -- active|disabled|pending
  is_connected BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, waba_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_accounts TO authenticated;
GRANT ALL ON public.whatsapp_accounts TO service_role;
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage wa accounts" ON public.whatsapp_accounts
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS wa_accounts_tenant_idx ON public.whatsapp_accounts(tenant_id) WHERE deleted_at IS NULL;
CREATE TRIGGER wa_accounts_touch BEFORE UPDATE ON public.whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) whatsapp_phone_numbers
CREATE TABLE IF NOT EXISTS public.whatsapp_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_account_id UUID NOT NULL REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,               -- Meta phone_number_id
  display_phone_number TEXT NOT NULL,
  verified_name TEXT,
  quality_rating TEXT,                         -- GREEN|YELLOW|RED|UNKNOWN
  code_verification_status TEXT,               -- VERIFIED|NOT_VERIFIED
  messaging_limit_tier TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (whatsapp_account_id, phone_number_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_phone_numbers TO authenticated;
GRANT ALL ON public.whatsapp_phone_numbers TO service_role;
ALTER TABLE public.whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage wa numbers" ON public.whatsapp_phone_numbers
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS wa_numbers_account_idx ON public.whatsapp_phone_numbers(whatsapp_account_id) WHERE deleted_at IS NULL;
CREATE TRIGGER wa_numbers_touch BEFORE UPDATE ON public.whatsapp_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) channel_webhooks (unified webhook config: fb/wa/instagram/etc.)
CREATE TABLE IF NOT EXISTS public.channel_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,                       -- facebook|whatsapp|instagram
  channel_ref_id UUID,                         -- fb_page_id / whatsapp_account_id
  callback_url TEXT NOT NULL,
  verify_token TEXT NOT NULL,
  app_secret TEXT,
  subscribed_events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status TEXT,                   -- ok|signature_failed|error
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_webhooks TO authenticated;
GRANT ALL ON public.channel_webhooks TO service_role;
ALTER TABLE public.channel_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage channel webhooks" ON public.channel_webhooks
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS channel_webhooks_tenant_idx ON public.channel_webhooks(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS channel_webhooks_channel_idx ON public.channel_webhooks(channel, channel_ref_id) WHERE deleted_at IS NULL;
CREATE TRIGGER channel_webhooks_touch BEFORE UPDATE ON public.channel_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
