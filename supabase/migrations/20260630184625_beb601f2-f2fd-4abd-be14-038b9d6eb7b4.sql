
-- CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  fb_user_id TEXT,
  ig_user_id TEXT,
  wa_phone TEXT,
  locale TEXT,
  timezone TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX customers_tenant_idx ON public.customers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX customers_fb_user_idx ON public.customers(tenant_id, fb_user_id) WHERE fb_user_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage customers" ON public.customers
  FOR ALL USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('messenger','instagram','whatsapp','comment','email','web')),
  channel_thread_id TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','snoozed','closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  ai_enabled BOOLEAN,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INT NOT NULL DEFAULT 0,
  snoozed_until TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX conversations_tenant_status_idx ON public.conversations(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX conversations_last_msg_idx ON public.conversations(tenant_id, last_message_at DESC) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX conversations_channel_thread_uniq ON public.conversations(tenant_id, channel, channel_thread_id) WHERE channel_thread_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage conversations" ON public.conversations
  FOR ALL USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  sender TEXT NOT NULL CHECK (sender IN ('customer','human','ai','system')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  text TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  channel_message_id TEXT,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued','sent','delivered','read','failed')),
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX messages_conv_idx ON public.messages(conversation_id, created_at);
CREATE UNIQUE INDEX messages_channel_uniq ON public.messages(conversation_id, channel_message_id) WHERE channel_message_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage messages" ON public.messages
  FOR ALL USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

-- COMMENTS (FB/IG post comments)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('facebook','instagram')),
  page_id TEXT,
  post_id TEXT,
  parent_comment_id TEXT,
  channel_comment_id TEXT NOT NULL,
  text TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_from_page BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX comments_channel_uniq ON public.comments(tenant_id, channel, channel_comment_id);
CREATE INDEX comments_post_idx ON public.comments(tenant_id, post_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage comments" ON public.comments
  FOR ALL USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

-- CONVERSATION LABELS
CREATE TABLE public.conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (conversation_id, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_labels TO authenticated;
GRANT ALL ON public.conversation_labels TO service_role;
ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage labels" ON public.conversation_labels
  FOR ALL USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

-- CONVERSATION ASSIGNMENTS
CREATE TABLE public.conversation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  assignee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent','observer','owner')),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX conv_assign_conv_idx ON public.conversation_assignments(conversation_id) WHERE unassigned_at IS NULL AND deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_assignments TO authenticated;
GRANT ALL ON public.conversation_assignments TO service_role;
ALTER TABLE public.conversation_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage assignments" ON public.conversation_assignments
  FOR ALL USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

-- INTERNAL NOTES
CREATE TABLE public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  mentions UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX internal_notes_conv_idx ON public.internal_notes(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_notes TO authenticated;
GRANT ALL ON public.internal_notes TO service_role;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant members manage notes" ON public.internal_notes
  FOR ALL USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER trg_internal_notes_updated BEFORE UPDATE ON public.internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
