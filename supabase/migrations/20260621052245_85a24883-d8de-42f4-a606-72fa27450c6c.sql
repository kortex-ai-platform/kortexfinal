
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read realtime messages" ON realtime.messages;
CREATE POLICY "Admins can read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
