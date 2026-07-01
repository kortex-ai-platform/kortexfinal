
-- 1) Stop falling back to Admin Workspace for users without membership.
--    Each user gets ONLY their own workspace.
CREATE OR REPLACE FUNCTION public.resolve_default_workspace_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws
  FROM public.workspace_members
  WHERE user_id = auth.uid()
  ORDER BY created_at LIMIT 1;
  RETURN ws; -- may be NULL; do NOT leak Admin Workspace
END;
$function$;

-- 2) Remove non-owner members from Admin Workspace (revoke previously-granted access).
DELETE FROM public.workspace_members wm
USING public.workspaces w
WHERE wm.workspace_id = w.id
  AND w.name = 'Admin Workspace'
  AND wm.user_id <> w.owner_id;

-- 3) Ensure every auth user has their own personal workspace + membership.
INSERT INTO public.workspaces (name, owner_id)
SELECT COALESCE(NULLIF(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1)) || '''s Workspace', u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.owner_id = u.id
);

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members m
  WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
)
ON CONFLICT DO NOTHING;

-- 4) Seed default ai_settings + branding_settings for any new personal workspace.
INSERT INTO public.ai_settings (workspace_id, model, temperature, max_tokens)
SELECT w.id, 'google/gemini-2.5-flash', 0.7, 1024
FROM public.workspaces w
WHERE NOT EXISTS (SELECT 1 FROM public.ai_settings a WHERE a.workspace_id = w.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.branding_settings (workspace_id, singleton)
SELECT w.id, false
FROM public.workspaces w
WHERE NOT EXISTS (SELECT 1 FROM public.branding_settings b WHERE b.workspace_id = w.id)
ON CONFLICT DO NOTHING;
