
-- super_admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- plans
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.plans FOR SELECT USING (is_public OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans admin write" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_plans BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trialing',
  provider text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs tenant read" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "subs admin write" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_subs_tenant ON public.subscriptions(tenant_id);
CREATE TRIGGER touch_subs BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- usage_counters
CREATE TABLE public.usage_counters (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  metric text NOT NULL,
  count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, period_month, metric)
);
GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage tenant read" ON public.usage_counters FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- helper: increment usage
CREATE OR REPLACE FUNCTION public.bump_usage(_tenant uuid, _metric text, _amount bigint DEFAULT 1)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.usage_counters (tenant_id, period_month, metric, count)
  VALUES (_tenant, date_trunc('month', now())::date, _metric, _amount)
  ON CONFLICT (tenant_id, period_month, metric)
    DO UPDATE SET count = usage_counters.count + EXCLUDED.count, updated_at = now();
END $$;

-- seed default plans
INSERT INTO public.plans (name, slug, monthly_price_cents, features, limits, sort_order) VALUES
  ('Free','free',0,
    '["1 workspace","100 AI replies/mo","1 FB page","Community support"]'::jsonb,
    '{"workspaces":1,"ai_calls":100,"fb_pages":1,"wa_numbers":0,"members":1}'::jsonb, 1),
  ('Starter','starter',1900,
    '["3 workspaces","2,000 AI replies/mo","3 FB pages","1 WhatsApp number","Email support"]'::jsonb,
    '{"workspaces":3,"ai_calls":2000,"fb_pages":3,"wa_numbers":1,"members":3}'::jsonb, 2),
  ('Pro','pro',4900,
    '["10 workspaces","10,000 AI replies/mo","10 FB pages","5 WhatsApp numbers","Priority support","Brand memory","API access"]'::jsonb,
    '{"workspaces":10,"ai_calls":10000,"fb_pages":10,"wa_numbers":5,"members":10}'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

-- backfill: every existing tenant gets a Free subscription
INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
SELECT t.id, p.id, 'active', now(), now() + interval '100 years'
FROM public.tenants t
CROSS JOIN public.plans p
WHERE p.slug = 'free'
ON CONFLICT (tenant_id) DO NOTHING;
