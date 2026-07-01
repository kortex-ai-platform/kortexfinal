
-- Feature Flags
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percent INT NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  tenant_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read flags authenticated" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage flags" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_feature_flags BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','critical')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','admins','tenants')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published or admin" ON public.announcements FOR SELECT TO authenticated
  USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_announcements BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Support Tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no TEXT UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requester or admin reads ticket" ON public.support_tickets FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "authenticated creates own ticket" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "admin updates ticket" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_support_tickets BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.assign_ticket_no()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix TEXT; next_n INT;
BEGIN
  IF NEW.ticket_no IS NOT NULL AND NEW.ticket_no <> '' THEN RETURN NEW; END IF;
  prefix := 'TKT-' || to_char((now() AT TIME ZONE 'UTC')::date, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_no, '^'||prefix, ''),'')::INT),0)+1
    INTO next_n FROM public.support_tickets WHERE ticket_no LIKE prefix||'%';
  NEW.ticket_no := prefix || lpad(next_n::TEXT, 4, '0');
  RETURN NEW;
END $$;
CREATE TRIGGER assign_ticket_no_trg BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.assign_ticket_no();

-- Support Messages
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read messages if ticket accessible" ON public.support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.requester_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
        AND (NOT is_internal OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "post messages if ticket accessible" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.requester_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status, last_activity_at DESC);
