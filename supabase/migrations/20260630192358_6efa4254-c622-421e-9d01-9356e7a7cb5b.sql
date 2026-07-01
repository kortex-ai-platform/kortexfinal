
CREATE TABLE IF NOT EXISTS public.wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  wa_user_id text NOT NULL,
  user_name text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_count int NOT NULL DEFAULT 0,
  ai_enabled boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_number_id, wa_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_conversations TO authenticated;
GRANT ALL ON public.wa_conversations TO service_role;
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_conv tenant members" ON public.wa_conversations
  FOR ALL TO authenticated
  USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id, auth.uid()));

CREATE TRIGGER wa_conv_touch BEFORE UPDATE ON public.wa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  sender text NOT NULL CHECK (sender IN ('customer','ai','human')),
  text text,
  wa_message_id text,
  error text,
  ai_provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_messages TO authenticated;
GRANT ALL ON public.wa_messages TO service_role;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_msg tenant members" ON public.wa_messages
  FOR ALL TO authenticated
  USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (tenant_id IS NULL OR public.is_tenant_member(tenant_id, auth.uid()));

CREATE INDEX IF NOT EXISTS wa_messages_conv_idx ON public.wa_messages(conversation_id, created_at);
