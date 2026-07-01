
-- =========================
-- fb_pages
-- =========================
CREATE TABLE public.fb_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  last_subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fb_pages TO authenticated;
GRANT ALL ON public.fb_pages TO service_role;
ALTER TABLE public.fb_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fb_pages" ON public.fb_pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER fb_pages_touch BEFORE UPDATE ON public.fb_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- fb_conversations
-- =========================
CREATE TABLE public.fb_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('messenger','comment')),
  fb_user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar_url TEXT,
  post_id TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  unread_count INT NOT NULL DEFAULT 0,
  ai_enabled BOOLEAN, -- NULL = follow global
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, source, fb_user_id, post_id)
);
CREATE INDEX fb_conversations_last_msg_idx ON public.fb_conversations (last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fb_conversations TO authenticated;
GRANT ALL ON public.fb_conversations TO service_role;
ALTER TABLE public.fb_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fb_conversations" ON public.fb_conversations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER fb_conversations_touch BEFORE UPDATE ON public.fb_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- fb_messages
-- =========================
CREATE TABLE public.fb_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.fb_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  sender TEXT NOT NULL CHECK (sender IN ('customer','human','ai')),
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','comment')),
  text TEXT,
  attachment_url TEXT,
  fb_message_id TEXT,
  parent_comment_id TEXT,
  ai_provider TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX fb_messages_conv_idx ON public.fb_messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fb_messages TO authenticated;
GRANT ALL ON public.fb_messages TO service_role;
ALTER TABLE public.fb_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fb_messages" ON public.fb_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- fb_settings (singleton)
-- =========================
CREATE TABLE public.fb_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  ai_global_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_system_prompt TEXT NOT NULL DEFAULT '',
  reply_delay_ms INT NOT NULL DEFAULT 1500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton_row CHECK (id = TRUE)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fb_settings TO authenticated;
GRANT ALL ON public.fb_settings TO service_role;
ALTER TABLE public.fb_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fb_settings" ON public.fb_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER fb_settings_touch BEFORE UPDATE ON public.fb_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.fb_settings (id, ai_global_enabled, ai_system_prompt)
VALUES (
  TRUE,
  TRUE,
  'আপনি একটি বাংলাদেশী ই-কমার্স ব্র্যান্ডের সহায়ক Messenger এজেন্ট। বিনয়ীভাবে বাংলায় উত্তর দিন, পণ্যের সুবিধা তুলে ধরুন, প্রাসঙ্গিক হলে ওয়েবসাইটের checkout লিঙ্ক দিন। মিথ্যা ছাড়, ভুল তথ্য বা অপ্রয়োজনীয় প্রতিশ্রুতি দেবেন না। সংক্ষিপ্ত এবং পরিষ্কার থাকুন।'
)
ON CONFLICT (id) DO NOTHING;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fb_conversations;
