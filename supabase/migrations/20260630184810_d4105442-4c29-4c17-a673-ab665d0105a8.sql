
-- PRODUCT VARIANTS
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(12,2),
  stock INT NOT NULL DEFAULT 0,
  weight_grams INT,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX product_variants_product_idx ON public.product_variants(product_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX product_variants_sku_uniq ON public.product_variants(workspace_id, sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT SELECT ON public.product_variants TO anon;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_anon_read" ON public.product_variants FOR SELECT TO anon USING (true);
CREATE POLICY "variants_tenant_all" ON public.product_variants FOR ALL TO authenticated
  USING (((workspace_id IS NULL) AND public.has_role(auth.uid(),'admin'))
         OR public.is_workspace_member(workspace_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'))
  WITH CHECK ((workspace_id IS NULL)
         OR public.is_workspace_member(workspace_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_variants_fill_ws BEFORE INSERT ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.fill_workspace_id();

-- PRODUCT IMAGES
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  alt TEXT,
  position INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX product_images_product_idx ON public.product_images(product_id, position) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT SELECT ON public.product_images TO anon;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images_anon_read" ON public.product_images FOR SELECT TO anon USING (true);
CREATE POLICY "images_tenant_all" ON public.product_images FOR ALL TO authenticated
  USING (((workspace_id IS NULL) AND public.has_role(auth.uid(),'admin'))
         OR public.is_workspace_member(workspace_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'))
  WITH CHECK ((workspace_id IS NULL)
         OR public.is_workspace_member(workspace_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_images_fill_ws BEFORE INSERT ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.fill_workspace_id();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_tenant_all" ON public.order_items FOR ALL TO authenticated
  USING (((workspace_id IS NULL) AND public.has_role(auth.uid(),'admin'))
         OR public.is_workspace_member(workspace_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'))
  WITH CHECK ((workspace_id IS NULL)
         OR public.is_workspace_member(workspace_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_order_items_fill_ws BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.fill_workspace_id();

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('cod','bkash','nagad','rocket','stripe','paddle','manual','other')),
  provider_txn_id TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','authorized','paid','failed','refunded','partial_refund','cancelled')),
  paid_at TIMESTAMPTZ,
  payer_name TEXT,
  payer_phone TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX payments_order_idx ON public.payments(order_id);
CREATE UNIQUE INDEX payments_provider_txn_uniq ON public.payments(provider, provider_txn_id) WHERE provider_txn_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_tenant_all" ON public.payments FOR ALL TO authenticated
  USING (((workspace_id IS NULL) AND public.has_role(auth.uid(),'admin'))
         OR public.is_workspace_member(workspace_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'))
  WITH CHECK ((workspace_id IS NULL)
         OR public.is_workspace_member(workspace_id, auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_payments_fill_ws BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fill_workspace_id();
