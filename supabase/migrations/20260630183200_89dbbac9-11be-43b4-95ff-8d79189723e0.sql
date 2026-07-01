
-- 1) Add deleted_at to all existing public tables (soft delete)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', r.table_name);
  END LOOP;
END $$;

-- 2) Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft|open|paid|void|uncollectible
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  tax_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL DEFAULT 0,
  amount_paid_cents BIGINT NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  provider TEXT,
  provider_invoice_id TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members read invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS invoices_tenant_idx ON public.invoices(tenant_id) WHERE deleted_at IS NULL;
CREATE TRIGGER invoices_touch BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Invoice items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_amount_cents BIGINT NOT NULL DEFAULT 0,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  metric TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read invoice items via invoice" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
      AND (public.is_tenant_member(i.tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
  ));
CREATE POLICY "admins manage invoice items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON public.invoice_items(invoice_id) WHERE deleted_at IS NULL;
CREATE TRIGGER invoice_items_touch BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) Payment transactions (bKash/Nagad/Stripe/Paddle)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,                 -- bkash|nagad|stripe|paddle|manual
  provider_txn_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|succeeded|failed|refunded
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payer_reference TEXT,                   -- phone/email/customer id
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (provider, provider_txn_id)
);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members read txns" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage txns" ON public.payment_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS payment_txns_tenant_idx ON public.payment_transactions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS payment_txns_invoice_idx ON public.payment_transactions(invoice_id);
CREATE TRIGGER payment_txns_touch BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Auto invoice number: INV-YYYYMM-####
CREATE OR REPLACE FUNCTION public.assign_invoice_no()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prefix TEXT; next_n INT;
BEGIN
  IF NEW.invoice_no IS NOT NULL AND NEW.invoice_no <> '' THEN RETURN NEW; END IF;
  prefix := 'INV-' || to_char((now() AT TIME ZONE 'UTC')::date, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_no, '^'||prefix, ''),'')::INT),0)+1
    INTO next_n FROM public.invoices WHERE invoice_no LIKE prefix||'%';
  NEW.invoice_no := prefix || lpad(next_n::TEXT, 4, '0');
  RETURN NEW;
END $$;
CREATE TRIGGER invoices_assign_no BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_no();
