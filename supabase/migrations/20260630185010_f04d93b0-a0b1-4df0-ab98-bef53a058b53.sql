
-- AUTOMATION RULES
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  match_mode TEXT NOT NULL DEFAULT 'all' CHECK (match_mode IN ('all','any')),
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  stop_on_match BOOLEAN NOT NULL DEFAULT false,
  run_count BIGINT NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX automation_rules_tenant_idx ON public.automation_rules(tenant_id) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_tenant_all" ON public.automation_rules FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER trg_automation_rules_updated BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- AUTOMATION TRIGGERS
CREATE TABLE public.automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'message_received','message_sent','comment_received','conversation_opened',
    'conversation_assigned','conversation_resolved','keyword_matched','schedule','webhook'
  )),
  channel TEXT CHECK (channel IN ('messenger','instagram','whatsapp','comment','email','web','any')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX automation_triggers_rule_idx ON public.automation_triggers(rule_id) WHERE deleted_at IS NULL;
CREATE INDEX automation_triggers_event_idx ON public.automation_triggers(tenant_id, event_type) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_triggers TO authenticated;
GRANT ALL ON public.automation_triggers TO service_role;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "triggers_tenant_all" ON public.automation_triggers FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

-- AUTOMATION ACTIONS
CREATE TABLE public.automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_reply','send_template','assign_agent','add_label','remove_label',
    'set_status','set_priority','hide_comment','delete_comment','call_webhook',
    'ai_reply','notify_user','wait','custom'
  )),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INT NOT NULL DEFAULT 0,
  delay_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX automation_actions_rule_idx ON public.automation_actions(rule_id, position) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_actions TO authenticated;
GRANT ALL ON public.automation_actions TO service_role;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actions_tenant_all" ON public.automation_actions FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));

-- AUTOMATION LOGS
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  trigger_event TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','skipped','partial')),
  matched BOOLEAN NOT NULL DEFAULT true,
  actions_run INT NOT NULL DEFAULT 0,
  duration_ms INT,
  error TEXT,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX automation_logs_rule_idx ON public.automation_logs(rule_id, created_at DESC);
CREATE INDEX automation_logs_tenant_idx ON public.automation_logs(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_logs TO authenticated;
GRANT ALL ON public.automation_logs TO service_role;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_tenant_all" ON public.automation_logs FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
