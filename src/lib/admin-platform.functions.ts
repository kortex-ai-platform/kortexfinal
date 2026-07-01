import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function gate(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ============ API Logs ============
export const listApiLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: api }, { data: webhooks }] = await Promise.all([
      db.from("api_usage").select("id,tenant_id,endpoint,method,status_code,duration_ms,created_at").order("created_at", { ascending: false }).limit(200),
      db.from("webhook_logs").select("id,provider,event_type,status_code,error,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    return { api: api ?? [], webhooks: webhooks ?? [] };
  });

// ============ Analytics ============
export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: tenantsData, count: tenantsTotal },
      { data: invoicesData },
      { data: subsData },
      { data: aiUsage },
      { count: customersTotal },
      { count: convosTotal },
    ] = await Promise.all([
      db.from("tenants").select("id,created_at", { count: "exact" }).gte("created_at", since),
      db.from("invoices").select("total_cents,currency,status,created_at").gte("created_at", since),
      db.from("subscriptions").select("status"),
      db.from("ai_usage_stats").select("usage_date,request_count,total_tokens,cost_cents").gte("usage_date", since.slice(0, 10)),
      db.from("customers").select("*", { count: "exact", head: true }),
      db.from("conversations").select("*", { count: "exact", head: true }),
    ]);
    const paidRevenue = (invoicesData ?? []).filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + (r.total_cents ?? 0), 0);
    const activeSubs = (subsData ?? []).filter((r: any) => r.status === "active").length;
    const aiTotals = (aiUsage ?? []).reduce(
      (acc: any, r: any) => {
        acc.requests += r.request_count ?? 0;
        acc.tokens += r.total_tokens ?? 0;
        acc.cost += r.cost_cents ?? 0;
        return acc;
      },
      { requests: 0, tokens: 0, cost: 0 },
    );
    // Daily buckets
    const byDay: Record<string, { tenants: number; revenue: number; aiCost: number; aiReq: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      byDay[d] = { tenants: 0, revenue: 0, aiCost: 0, aiReq: 0 };
    }
    for (const t of tenantsData ?? []) {
      const d = String(t.created_at).slice(0, 10);
      if (byDay[d]) byDay[d].tenants++;
    }
    for (const i of invoicesData ?? []) {
      if (i.status !== "paid") continue;
      const d = String(i.created_at).slice(0, 10);
      if (byDay[d]) byDay[d].revenue += i.total_cents ?? 0;
    }
    for (const u of aiUsage ?? []) {
      const d = String(u.usage_date);
      if (byDay[d]) {
        byDay[d].aiCost += u.cost_cents ?? 0;
        byDay[d].aiReq += u.request_count ?? 0;
      }
    }
    return {
      totals: {
        tenants30d: tenantsTotal ?? 0,
        paidRevenue,
        activeSubs,
        aiRequests: aiTotals.requests,
        aiTokens: aiTotals.tokens,
        aiCostCents: aiTotals.cost,
        customers: customersTotal ?? 0,
        conversations: convosTotal ?? 0,
      },
      daily: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
    };
  });

// ============ System Health ============
export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ data: whAll }, { data: sysAll }, { data: apiAll }, { data: providers }] = await Promise.all([
      db.from("webhook_logs").select("status_code,created_at").gte("created_at", since24h),
      db.from("system_logs").select("level,created_at").gte("created_at", since24h),
      db.from("api_usage").select("status_code,duration_ms,created_at").gte("created_at", since24h),
      db.from("ai_provider_health").select("provider_id,is_healthy,last_checked_at,latency_ms,error_message").order("last_checked_at", { ascending: false }),
    ]);
    const total = (whAll ?? []).length;
    const ok = (whAll ?? []).filter((r: any) => r.status_code && r.status_code < 400).length;
    const errCount = (sysAll ?? []).filter((r: any) => ["error", "fatal"].includes(String(r.level).toLowerCase())).length;
    const apiTotal = (apiAll ?? []).length;
    const apiErr = (apiAll ?? []).filter((r: any) => r.status_code >= 400).length;
    const avgLatency = apiTotal ? Math.round((apiAll ?? []).reduce((s: number, r: any) => s + (r.duration_ms ?? 0), 0) / apiTotal) : 0;
    return {
      webhook: { total, success: ok, successRate: total ? Math.round((ok / total) * 100) : 100 },
      logs: { errors24h: errCount, total24h: (sysAll ?? []).length },
      api: { total: apiTotal, errors: apiErr, errorRate: apiTotal ? Math.round((apiErr / apiTotal) * 100) : 0, avgLatencyMs: avgLatency },
      providers: providers ?? [],
    };
  });

// ============ Feature Flags ============
export const listFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const { data } = await db.from("feature_flags").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; key: string; name: string; description?: string; enabled: boolean; rollout_percent: number }) => d)
  .handler(async ({ context, data }) => {
    const db = await gate(context);
    if (data.id) {
      const { error } = await db.from("feature_flags").update({
        name: data.name, description: data.description ?? null, enabled: data.enabled, rollout_percent: data.rollout_percent,
      }).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await db.from("feature_flags").insert({
        key: data.key, name: data.name, description: data.description ?? null,
        enabled: data.enabled, rollout_percent: data.rollout_percent,
      });
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await gate(context);
    const { error } = await db.from("feature_flags").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ Announcements ============
export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const { data } = await db.from("announcements").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; title: string; body: string; severity: string; audience: string; is_published: boolean; expires_at?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const db = await gate(context);
    const payload: any = {
      title: data.title, body: data.body, severity: data.severity, audience: data.audience,
      is_published: data.is_published,
      published_at: data.is_published ? new Date().toISOString() : null,
      expires_at: data.expires_at || null,
    };
    if (data.id) {
      const { error } = await db.from("announcements").update(payload).eq("id", data.id);
      if (error) throw error;
    } else {
      payload.created_by = context.userId;
      const { error } = await db.from("announcements").insert(payload);
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await gate(context);
    const { error } = await db.from("announcements").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============ Support ============
export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const [{ data: tickets }, { data: tenants }, { data: profiles }] = await Promise.all([
      db.from("support_tickets").select("*").order("last_activity_at", { ascending: false }).limit(200),
      db.from("tenants").select("id,name"),
      db.from("profiles").select("id,email,full_name"),
    ]);
    return { tickets: tickets ?? [], tenants: tenants ?? [], profiles: profiles ?? [] };
  });

export const getTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const db = await gate(context);
    const [{ data: ticket }, { data: messages }] = await Promise.all([
      db.from("support_tickets").select("*").eq("id", data.id).maybeSingle(),
      db.from("support_messages").select("*").eq("ticket_id", data.id).order("created_at", { ascending: true }),
    ]);
    return { ticket, messages: messages ?? [] };
  });

export const updateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status?: string; priority?: string; assignee_id?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const db = await gate(context);
    const patch: any = { last_activity_at: new Date().toISOString() };
    if (data.status) patch.status = data.status;
    if (data.priority) patch.priority = data.priority;
    if ("assignee_id" in data) patch.assignee_id = data.assignee_id;
    const { error } = await db.from("support_tickets").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticket_id: string; body: string; is_internal?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const db = await gate(context);
    const { error } = await db.from("support_messages").insert({
      ticket_id: data.ticket_id, author_id: context.userId, body: data.body, is_internal: !!data.is_internal,
    });
    if (error) throw error;
    await db.from("support_tickets").update({ last_activity_at: new Date().toISOString() }).eq("id", data.ticket_id);
    return { ok: true };
  });
