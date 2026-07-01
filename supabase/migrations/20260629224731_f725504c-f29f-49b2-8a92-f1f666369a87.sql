
-- =========================================================
-- 1. Extend app_role enum (add 'user' if missing)
-- =========================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'user') THEN
    ALTER TYPE public.app_role ADD VALUE 'user';
  END IF;
END $$;

-- =========================================================
-- 2. workspaces table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. workspace_member_role enum + workspace_members table
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.workspace_member_role AS ENUM ('owner','admin','editor','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_member_role NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_wsm_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wsm_ws ON public.workspace_members(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 4. Helper functions (security definer)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _ws AND user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_ws uuid, _uid uuid, _role public.workspace_member_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _ws AND user_id = _uid
      AND (role = _role
        OR (_role = 'viewer' AND role IN ('editor','admin','owner'))
        OR (_role = 'editor' AND role IN ('admin','owner'))
        OR (_role = 'admin' AND role = 'owner'))
  )
$$;

-- =========================================================
-- 5. RLS for workspaces + members
-- =========================================================
DROP POLICY IF EXISTS "ws_select" ON public.workspaces;
CREATE POLICY "ws_select" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "ws_insert" ON public.workspaces;
CREATE POLICY "ws_insert" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "ws_update" ON public.workspaces;
CREATE POLICY "ws_update" ON public.workspaces FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, auth.uid(),'admin') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "ws_delete" ON public.workspaces;
CREATE POLICY "ws_delete" ON public.workspaces FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "wsm_select" ON public.workspace_members;
CREATE POLICY "wsm_select" ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "wsm_manage" ON public.workspace_members;
CREATE POLICY "wsm_manage" ON public.workspace_members FOR ALL TO authenticated
  USING (public.has_workspace_role(workspace_id, auth.uid(),'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(),'admin') OR public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 6. Add workspace_id columns (nullable for now) to tenant tables
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fb_pages','fb_settings','fb_conversations','fb_messages','fb_user_offenses',
    'brand_memory_sources','brand_memory_chunks',
    'ai_providers','ai_provider_health','ai_request_logs',
    'prompts','products','orders'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_ws ON public.%I(workspace_id)', t, t);
  END LOOP;
END $$;

-- ai_settings and branding_settings: singletons → per-workspace
ALTER TABLE public.ai_settings ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.branding_settings ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- =========================================================
-- 7. Seed: create "Admin Workspace" for first admin, assign existing rows
-- =========================================================
DO $$
DECLARE
  admin_uid uuid;
  ws_id uuid;
BEGIN
  SELECT user_id INTO admin_uid FROM public.user_roles WHERE role='admin' ORDER BY created_at LIMIT 1;
  IF admin_uid IS NULL THEN
    -- fallback: first user in auth.users
    SELECT id INTO admin_uid FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  IF admin_uid IS NOT NULL THEN
    -- create or reuse Admin Workspace
    SELECT id INTO ws_id FROM public.workspaces WHERE owner_id = admin_uid AND name = 'Admin Workspace' LIMIT 1;
    IF ws_id IS NULL THEN
      INSERT INTO public.workspaces (name, slug, owner_id) VALUES ('Admin Workspace', 'admin-workspace', admin_uid) RETURNING id INTO ws_id;
    END IF;
    INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, admin_uid, 'owner') ON CONFLICT DO NOTHING;

    -- backfill all existing data
    UPDATE public.fb_pages SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.fb_settings SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.fb_conversations SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.fb_messages SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.fb_user_offenses SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.brand_memory_sources SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.brand_memory_chunks SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.ai_providers SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.ai_provider_health SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.ai_request_logs SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.prompts SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.products SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.orders SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.ai_settings SET workspace_id = ws_id WHERE workspace_id IS NULL;
    UPDATE public.branding_settings SET workspace_id = ws_id WHERE workspace_id IS NULL;
  END IF;
END $$;

-- =========================================================
-- 8. Enforce NOT NULL on workspace_id
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fb_pages','fb_settings','fb_conversations','fb_messages','fb_user_offenses',
    'brand_memory_sources','brand_memory_chunks',
    'ai_providers','ai_provider_health','ai_request_logs',
    'prompts','products','orders'
  ] LOOP
    -- only enforce if no NULLs remain (defensive)
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id SET NOT NULL', t);
  END LOOP;
END $$;

-- ai_settings: drop old singleton id=1 PK semantic, add unique on workspace_id
ALTER TABLE public.ai_settings ALTER COLUMN workspace_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_settings_ws ON public.ai_settings(workspace_id);

-- branding_settings: drop singleton constraint, add unique on workspace_id
ALTER TABLE public.branding_settings ALTER COLUMN workspace_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_branding_ws ON public.branding_settings(workspace_id);

-- =========================================================
-- 9. Rewrite RLS policies for tenant tables
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fb_pages','fb_settings','fb_conversations','fb_messages','fb_user_offenses',
    'brand_memory_sources','brand_memory_chunks',
    'ai_providers','ai_provider_health','ai_request_logs',
    'ai_settings','branding_settings',
    'prompts','products','orders'
  ] LOOP
    -- drop ALL existing policies on the table
    EXECUTE (
      SELECT COALESCE(string_agg(format('DROP POLICY IF EXISTS %I ON public.%I;', polname, t), ' '), '')
      FROM pg_policy WHERE polrelid = format('public.%I', t)::regclass
    );
    -- new tenant policy
    EXECUTE format($f$
      CREATE POLICY "tenant_all" ON public.%I FOR ALL TO authenticated
        USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
        WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) OR public.has_role(auth.uid(),'admin'))
    $f$, t);
  END LOOP;
END $$;

-- products + branding_settings: keep anon read for public shop / landing
DROP POLICY IF EXISTS "products_anon_read" ON public.products;
CREATE POLICY "products_anon_read" ON public.products FOR SELECT TO anon USING (true);
GRANT SELECT ON public.products TO anon;

DROP POLICY IF EXISTS "branding_anon_read" ON public.branding_settings;
CREATE POLICY "branding_anon_read" ON public.branding_settings FOR SELECT TO anon USING (true);
GRANT SELECT ON public.branding_settings TO anon;

-- =========================================================
-- 10. Replace handle_new_user trigger — no more "single admin" lock
--     Auto-create personal workspace + 'user' role for every new signup.
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $fn$
DECLARE
  ws_id uuid;
  is_first boolean;
BEGIN
  SELECT count(*) = 1 INTO is_first FROM auth.users;  -- this new row counts

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;

  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;

  -- auto-create a personal workspace
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(NEW.email,'@',1)) || '''s Workspace', NEW.id)
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, NEW.id, 'owner');

  -- seed default ai_settings + branding_settings for this workspace
  INSERT INTO public.ai_settings (workspace_id, model, temperature, max_tokens)
  VALUES (ws_id, 'google/gemini-2.5-flash', 0.7, 1024)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.branding_settings (workspace_id, singleton)
  VALUES (ws_id, false)
  ON CONFLICT (workspace_id) DO NOTHING;

  RETURN NEW;
END;
$fn$;

-- ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger on workspaces
DROP TRIGGER IF EXISTS workspaces_touch ON public.workspaces;
CREATE TRIGGER workspaces_touch BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
