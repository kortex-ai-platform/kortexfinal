
-- Enums
CREATE TYPE public.order_status AS ENUM (
  'pending_verification','call_pending','confirmed','processing','packed','shipped','delivered','cancelled'
);
CREATE TYPE public.order_source AS ENUM (
  'facebook_messenger','whatsapp','website_direct','ai_chatbot','facebook_ads','google_ads','other'
);
CREATE TYPE public.product_status AS ENUM ('active','draft');

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  features TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  status public.product_status NOT NULL DEFAULT 'draft',
  gallery TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER products_touch_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  note TEXT,
  status public.order_status NOT NULL DEFAULT 'pending_verification',
  source public.order_source NOT NULL DEFAULT 'website_direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an order (no SELECT — privacy)
CREATE POLICY "Anyone can submit orders"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER orders_touch_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Order number generator: ORD-YYYYMMDD-0001
CREATE OR REPLACE FUNCTION public.assign_order_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_str TEXT;
  next_n INT;
BEGIN
  IF NEW.order_no IS NOT NULL AND NEW.order_no <> '' THEN
    RETURN NEW;
  END IF;
  today_str := to_char((now() AT TIME ZONE 'UTC')::date, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(order_no, '^ORD-' || today_str || '-', ''), '')::INT
  ), 0) + 1
    INTO next_n
    FROM public.orders
   WHERE order_no LIKE 'ORD-' || today_str || '-%';
  NEW.order_no := 'ORD-' || today_str || '-' || lpad(next_n::TEXT, 4, '0');
  RETURN NEW;
END $$;

CREATE TRIGGER orders_assign_no
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_no();

CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_created_idx ON public.orders(created_at DESC);
CREATE INDEX orders_product_idx ON public.orders(product_id);
