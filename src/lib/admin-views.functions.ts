import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function gate(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: tenants }, { data: members }, { data: subs }] = await Promise.all([
      db.from("tenants").select("id,name,owner_id,billing_email,created_at").order("created_at", { ascending: false }),
      db.from("tenant_members").select("tenant_id,user_id,role"),
      db.from("subscriptions").select("tenant_id,plan_id,status,current_period_end"),
    ]);
    return { tenants: tenants ?? [], members: members ?? [], subs: subs ?? [] };
  });

export const getInvoiceDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await gate(context);
    const [{ data: invoice }, { data: items }, { data: tx }] = await Promise.all([
      db.from("invoices").select("*").eq("id", data.id).maybeSingle(),
      db.from("invoice_items").select("*").eq("invoice_id", data.id).order("created_at", { ascending: true }),
      db.from("payment_transactions").select("*").eq("invoice_id", data.id).order("created_at", { ascending: false }),
    ]);
    let tenant: any = null;
    if (invoice?.tenant_id) {
      const { data: t } = await db.from("tenants").select("id,name,billing_email").eq("id", invoice.tenant_id).maybeSingle();
      tenant = t;
    }
    return { invoice, items: items ?? [], tx: tx ?? [], tenant };
  });

export const listBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: invoices }, { data: tx }, { data: plans }] = await Promise.all([
      db.from("invoices").select("id,invoice_no,tenant_id,status,total_cents,currency,due_at,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("payment_transactions").select("id,tenant_id,provider,amount_cents,currency,status,created_at").order("created_at", { ascending: false }).limit(50),
      db.from("plans").select("id,name,slug,monthly_price_cents,currency,is_public,sort_order").order("sort_order"),
    ]);
    return { invoices: invoices ?? [], tx: tx ?? [], plans: plans ?? [] };
  });

export const listAiModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: providers }, { data: models }, { data: usage }] = await Promise.all([
      db.from("ai_providers").select("id,name,slug,vendor,enabled,api_key,base_url,is_primary").order("created_at"),
      db.from("ai_models").select("id,provider_id,slug,display_name,is_active,context_window").order("created_at", { ascending: false }),
      db.from("ai_usage_stats").select("provider_id,model_slug,usage_date,request_count,total_tokens,cost_cents").order("usage_date", { ascending: false }).limit(100),
    ]);
    return {
      providers: (providers ?? []).map((p: any) => ({ ...p, has_key: !!p.api_key, api_key: undefined })),
      models: models ?? [],
      usage: usage ?? [],
    };
  });

export const listWhatsapp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: accounts }, { data: numbers }, { data: tenants }] = await Promise.all([
      db.from("whatsapp_accounts").select("id,tenant_id,waba_id,business_id,name,status,is_connected,created_at").order("created_at", { ascending: false }),
      db.from("whatsapp_phone_numbers").select("id,whatsapp_account_id,phone_number_id,display_phone_number,verified_name,code_verification_status,quality_rating,is_default,created_at").order("created_at", { ascending: false }),
      db.from("tenants").select("id,name").order("name"),
    ]);
    return { accounts: accounts ?? [], numbers: numbers ?? [], tenants: tenants ?? [] };
  });

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: bases }, { data: docs }, { data: brand }] = await Promise.all([
      db.from("knowledge_bases").select("id,tenant_id,name,description,created_at").order("created_at", { ascending: false }),
      db.from("knowledge_documents").select("id,kb_id,title,source_type,status,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("brand_memory").select("id,tenant_id,key,value,updated_at").order("updated_at", { ascending: false }).limit(50),
    ]);
    return { bases: bases ?? [], docs: docs ?? [], brand: brand ?? [] };
  });

export const listMonitoring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: webhooks }, { data: system }, { data: audit }, { data: notifs }, { data: api }] = await Promise.all([
      db.from("webhook_logs").select("id,provider,event_type,status_code,created_at").order("created_at", { ascending: false }).limit(50),
      db.from("system_logs").select("id,level,message,created_at").order("created_at", { ascending: false }).limit(50),
      db.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,created_at").order("created_at", { ascending: false }).limit(50),
      db.from("notifications").select("id,user_id,title,body,read_at,created_at").order("created_at", { ascending: false }).limit(50),
      db.from("api_usage").select("tenant_id,endpoint,status_code,duration_ms,created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    return { webhooks: webhooks ?? [], system: system ?? [], audit: audit ?? [], notifs: notifs ?? [], api: api ?? [] };
  });

export const listCrm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: customers }, { data: labels }, { data: assigns }, { data: notes }, { data: tenants }, { data: members }, { data: profiles }, { data: convos }] = await Promise.all([
      db.from("customers").select("id,tenant_id,full_name,email,phone,fb_user_id,wa_phone,tags,last_seen_at,created_at").order("created_at", { ascending: false }).limit(200),
      db.from("conversation_labels").select("id,tenant_id,label,color,created_at"),
      db.from("conversation_assignments").select("id,tenant_id,conversation_id,assignee_user_id,role,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("internal_notes").select("id,tenant_id,conversation_id,author_user_id,body,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("tenants").select("id,name,billing_email"),
      db.from("tenant_members").select("tenant_id,user_id,role,created_at"),
      db.from("profiles").select("id,email,full_name"),
      db.from("conversations").select("id,tenant_id,channel,status,customer_id,last_message_at").order("last_message_at", { ascending: false, nullsFirst: false }).limit(200),
    ]);
    return {
      customers: customers ?? [], labels: labels ?? [], assigns: assigns ?? [], notes: notes ?? [],
      tenants: tenants ?? [], members: members ?? [], profiles: profiles ?? [], conversations: convos ?? [],
    };
  });

export const listAutomation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: rules }, { data: triggers }, { data: actions }, { data: logs }] = await Promise.all([
      db.from("automation_rules").select("id,tenant_id,name,is_active,priority,created_at").order("created_at", { ascending: false }),
      db.from("automation_triggers").select("id,rule_id,trigger_type,config"),
      db.from("automation_actions").select("id,rule_id,action_type,config,order_index"),
      db.from("automation_logs").select("id,rule_id,status,error,created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    return { rules: rules ?? [], triggers: triggers ?? [], actions: actions ?? [], logs: logs ?? [] };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const counts = async (t: string) => {
      const { count } = await (db as any).from(t).select("*", { count: "exact", head: true });
      return count ?? 0;
    };
    const [tenants, subs, invoices, fbPages, waNumbers, kb, rules, customers] = await Promise.all([
      counts("tenants"), counts("subscriptions"), counts("invoices"),
      counts("fb_pages"), counts("whatsapp_phone_numbers"), counts("knowledge_documents"),
      counts("automation_rules"), counts("customers"),
    ]);
    return { tenants, subs, invoices, fbPages, waNumbers, kb, rules, customers };
  });
