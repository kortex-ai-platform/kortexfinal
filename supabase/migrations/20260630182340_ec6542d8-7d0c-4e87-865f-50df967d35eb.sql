
-- 1. tenant role enum
DO $$ BEGIN
  CREATE TYPE public.tenant_member_role AS ENUM ('owner','admin','billing','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER touch_tenants BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. tenant_members
CREATE TABLE public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.tenant_member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 4. helpers
CREATE OR REPLACE FUNCTION public.is_tenant_member(_t uuid, _u uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_members WHERE tenant_id=_t AND user_id=_u)
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_t uuid, _u uuid, _role public.tenant_member_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id=_t AND user_id=_u
      AND (role=_role
        OR (_role='member' AND role IN ('billing','admin','owner'))
        OR (_role='billing' AND role IN ('admin','owner'))
        OR (_role='admin' AND role='owner'))
  )
$$;

-- 5. RLS policies for tenants/tenant_members
CREATE POLICY "tenants member read" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_tenant_member(id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tenants owner insert" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "tenants admin write" ON public.tenants FOR UPDATE TO authenticated
  USING (public.has_tenant_role(id, auth.uid(),'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_tenant_role(id, auth.uid(),'admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tenants owner delete" ON public.tenants FOR DELETE TO authenticated
  USING (public.has_tenant_role(id, auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "tenant_members read" ON public.tenant_members FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tenant_members admin write" ON public.tenant_members FOR ALL TO authenticated
  USING (public.has_tenant_role(tenant_id, auth.uid(),'admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(),'admin') OR public.has_role(auth.uid(),'admin'));

-- 6. workspaces.tenant_id
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_id ON public.workspaces(tenant_id);

-- 7. backfill: each owner gets one tenant; all their workspaces under it
DO $$
DECLARE r record; new_tenant uuid;
BEGIN
  FOR r IN SELECT DISTINCT owner_id FROM public.workspaces WHERE tenant_id IS NULL LOOP
    INSERT INTO public.tenants (name, owner_id, billing_email)
    VALUES (
      COALESCE((SELECT email FROM auth.users WHERE id=r.owner_id), 'Tenant') || ' Org',
      r.owner_id,
      (SELECT email FROM auth.users WHERE id=r.owner_id)
    )
    RETURNING id INTO new_tenant;
    INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES (new_tenant, r.owner_id, 'owner')
      ON CONFLICT DO NOTHING;
    UPDATE public.workspaces SET tenant_id = new_tenant WHERE owner_id = r.owner_id AND tenant_id IS NULL;
  END LOOP;
END $$;

ALTER TABLE public.workspaces ALTER COLUMN tenant_id SET NOT NULL;

-- 8. updated handle_new_user trigger: create tenant + workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE
  ws_id uuid;
  tn_id uuid;
  is_first boolean;
  display_name text;
BEGIN
  SELECT count(*) = 1 INTO is_first FROM auth.users;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;

  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;

  display_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(NEW.email,'@',1));

  -- create tenant first
  INSERT INTO public.tenants (name, owner_id, billing_email)
  VALUES (display_name || ' Org', NEW.id, NEW.email)
  RETURNING id INTO tn_id;
  INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES (tn_id, NEW.id, 'owner');

  -- workspace under tenant
  INSERT INTO public.workspaces (name, owner_id, tenant_id)
  VALUES (display_name || '''s Workspace', NEW.id, tn_id)
  RETURNING id INTO ws_id;
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, NEW.id, 'owner');

  INSERT INTO public.ai_settings (workspace_id, model, temperature, max_tokens)
  VALUES (ws_id, 'google/gemini-2.5-flash', 0.7, 1024)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.branding_settings (workspace_id, singleton)
  VALUES (ws_id, false)
  ON CONFLICT (workspace_id) DO NOTHING;

  RETURN NEW;
END;
$$;
