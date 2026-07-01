
-- Make workspace_id nullable on all tenant tables so existing inserts compile
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
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id DROP NOT NULL', t);
  END LOOP;
END $$;

-- Resolve default workspace for the current auth user (their first owned workspace,
-- falling back to the Admin Workspace for service-role inserts).
CREATE OR REPLACE FUNCTION public.resolve_default_workspace_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws
  FROM public.workspace_members
  WHERE user_id = auth.uid()
  ORDER BY created_at LIMIT 1;
  IF ws IS NOT NULL THEN RETURN ws; END IF;

  SELECT id INTO ws FROM public.workspaces WHERE name = 'Admin Workspace' LIMIT 1;
  RETURN ws;
END;
$$;

-- Trigger: fill workspace_id when NULL
CREATE OR REPLACE FUNCTION public.fill_workspace_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := public.resolve_default_workspace_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to every tenant table
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
    EXECUTE format('DROP TRIGGER IF EXISTS trg_fill_ws ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_fill_ws BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fill_workspace_id()', t);
  END LOOP;
END $$;

-- Update RLS: tenant policy now also lets owner=auth.uid() see NULL rows via admin
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
    EXECUTE format('DROP POLICY IF EXISTS "tenant_all" ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY "tenant_all" ON public.%I FOR ALL TO authenticated
        USING (
          workspace_id IS NULL AND public.has_role(auth.uid(),'admin')
          OR public.is_workspace_member(workspace_id, auth.uid())
          OR public.has_role(auth.uid(),'admin')
        )
        WITH CHECK (
          workspace_id IS NULL
          OR public.is_workspace_member(workspace_id, auth.uid())
          OR public.has_role(auth.uid(),'admin')
        )
    $f$, t);
  END LOOP;
END $$;

-- Re-add public read policies (dropped by loop above)
DROP POLICY IF EXISTS "products_anon_read" ON public.products;
CREATE POLICY "products_anon_read" ON public.products FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "branding_anon_read" ON public.branding_settings;
CREATE POLICY "branding_anon_read" ON public.branding_settings FOR SELECT TO anon USING (true);

-- Lock down helper functions exposed via PostgREST
REVOKE EXECUTE ON FUNCTION public.resolve_default_workspace_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.fill_workspace_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, public.workspace_member_role) FROM anon, public;
