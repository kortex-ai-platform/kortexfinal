
-- Restore Data API grants on every public table (lost during project remix)
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT c.relname AS table_name
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind = 'r' AND n.nspname = 'public'
    LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
    END LOOP;
END;
$$;

-- Public-readable tables that should also be visible to anon (landing/shop)
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.branding_settings TO anon;

-- Sequence usage (needed when inserts use serial/identity defaults)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Lock down SECURITY DEFINER helpers from public/anon execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.assign_order_no() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_provider_health() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
