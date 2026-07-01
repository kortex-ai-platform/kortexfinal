
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.prompt_lang AS ENUM ('en', 'bn', 'both');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ai_settings
CREATE TABLE public.ai_settings (
  id INT PRIMARY KEY DEFAULT 1,
  gemini_api_key TEXT,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  max_tokens INT NOT NULL DEFAULT 1024,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO public.ai_settings (id) VALUES (1);
GRANT SELECT, INSERT, UPDATE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_settings" ON public.ai_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- prompts
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  language public.prompt_lang NOT NULL DEFAULT 'both',
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompts TO authenticated;
GRANT ALL ON public.prompts TO service_role;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prompts" ON public.prompts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ai_settings_updated BEFORE UPDATE ON public.ai_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_prompts_updated BEFORE UPDATE ON public.prompts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile + grant admin role on FIRST signup; block subsequent signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  -- The new row is already in auth.users when this AFTER trigger fires
  IF user_count > 1 THEN
    RAISE EXCEPTION 'Signup is locked. Only one admin account is allowed.';
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
