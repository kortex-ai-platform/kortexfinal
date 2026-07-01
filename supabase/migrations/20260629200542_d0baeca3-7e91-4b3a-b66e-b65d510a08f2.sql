
CREATE TYPE public.brand_source_kind AS ENUM ('fb_page','website','text','pdf');
CREATE TYPE public.brand_source_status AS ENUM ('idle','syncing','ready','error');

CREATE TABLE public.brand_memory_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.brand_source_kind NOT NULL,
  label TEXT NOT NULL,
  url TEXT,
  fb_page_id TEXT,
  status public.brand_source_status NOT NULL DEFAULT 'idle',
  error TEXT,
  item_count INT NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_memory_sources TO authenticated;
GRANT ALL ON public.brand_memory_sources TO service_role;
ALTER TABLE public.brand_memory_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage brand sources" ON public.brand_memory_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER brand_sources_touch BEFORE UPDATE ON public.brand_memory_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.brand_memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.brand_memory_sources(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  url TEXT,
  image_url TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_memory_chunks TO authenticated;
GRANT ALL ON public.brand_memory_chunks TO service_role;
ALTER TABLE public.brand_memory_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage brand chunks" ON public.brand_memory_chunks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX brand_chunks_source_idx ON public.brand_memory_chunks(source_id);
CREATE INDEX brand_chunks_created_idx ON public.brand_memory_chunks(source_id, created_at DESC);
