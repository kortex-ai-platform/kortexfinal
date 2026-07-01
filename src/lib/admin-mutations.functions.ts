import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function gate(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------------- Billing ---------------- */

export const createPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; monthly_price_cents: number; currency?: string; is_public?: boolean; slug?: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { data: row, error } = await db.from("plans").insert({
      name: data.name,
      slug: data.slug || slugify(data.name),
      monthly_price_cents: data.monthly_price_cents,
      currency: data.currency || "USD",
      is_public: data.is_public ?? true,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const togglePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_public: boolean }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { error } = await db.from("plans").update({ is_public: data.is_public }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { error } = await db.from("plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string; total_cents: number; currency?: string; status?: string; due_at?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { data: row, error } = await db.from("invoices").insert({
      tenant_id: data.tenant_id,
      subtotal_cents: data.total_cents,
      total_cents: data.total_cents,
      currency: data.currency || "USD",
      status: data.status || "open",
      due_at: data.due_at || null,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const markInvoicePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { data: inv } = await db.from("invoices").select("tenant_id,total_cents,currency").eq("id", data.id).single();
    const { error } = await db.from("invoices").update({ status: "paid", paid_at: new Date().toISOString(), amount_paid_cents: inv?.total_cents ?? 0 }).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (inv) {
      await db.from("payment_transactions").insert({
        tenant_id: inv.tenant_id, invoice_id: data.id, provider: "manual",
        amount_cents: inv.total_cents, currency: inv.currency, status: "succeeded",
      });
    }
    return { ok: true };
  });

/* ---------------- Tenants / Subscriptions ---------------- */

export const assignSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string; plan_id: string; status?: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const now = new Date();
    const end = new Date(now); end.setMonth(end.getMonth() + 1);
    const { data: existing } = await db.from("subscriptions").select("id").eq("tenant_id", data.tenant_id).maybeSingle();
    if (existing) {
      const { error } = await db.from("subscriptions").update({
        plan_id: data.plan_id, status: data.status || "active",
        current_period_start: now.toISOString(), current_period_end: end.toISOString(),
      }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("subscriptions").insert({
        tenant_id: data.tenant_id, plan_id: data.plan_id, status: data.status || "active",
        current_period_start: now.toISOString(), current_period_end: end.toISOString(),
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { error } = await db.from("subscriptions").update({ status: "canceled" }).eq("tenant_id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- AI providers / models ---------------- */

export const upsertProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; slug: string; vendor: string; api_key?: string; base_url?: string; enabled?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const patch: any = { name: data.name, slug: data.slug, vendor: data.vendor, enabled: data.enabled ?? true };
    if (data.base_url !== undefined) patch.base_url = data.base_url;
    if (data.api_key) patch.api_key = data.api_key;
    if (data.id) {
      const { error } = await db.from("ai_providers").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    } else {
      const { data: row, error } = await db.from("ai_providers").insert(patch).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
  });

export const toggleProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; enabled: boolean }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { error } = await db.from("ai_providers").update({ enabled: data.enabled }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider_id: string; slug: string; display_name: string; context_window?: number; is_active?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { data: row, error } = await db.from("ai_models").insert({
      provider_id: data.provider_id, slug: data.slug, display_name: data.display_name,
      context_window: data.context_window || null, is_active: data.is_active ?? true,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_active: boolean }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { error } = await db.from("ai_models").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { error } = await db.from("ai_models").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const seedDefaultPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const presets = [
      { name: "Free", slug: "free", monthly_price_cents: 0, currency: "USD", is_public: true, sort_order: 0 },
      { name: "Starter", slug: "starter", monthly_price_cents: 1900, currency: "USD", is_public: true, sort_order: 1 },
      { name: "Pro", slug: "pro", monthly_price_cents: 4900, currency: "USD", is_public: true, sort_order: 2 },
      { name: "Business", slug: "business", monthly_price_cents: 14900, currency: "USD", is_public: true, sort_order: 3 },
    ];
    for (const p of presets) {
      const { data: exists } = await db.from("plans").select("id").eq("slug", p.slug).maybeSingle();
      if (!exists) await db.from("plans").insert(p);
    }
    return { ok: true };
  });

export const seedDefaultModels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const { data: provider } = await db.from("ai_providers").select("id").eq("slug", "openrouter").maybeSingle();
    if (!provider) throw new Error("OpenRouter provider not found");
    const presets = [
      { slug: "google/gemini-3-flash-preview", display_name: "Gemini 3 Flash (Preview)", context_window: 1000000 },
      { slug: "google/gemini-2.5-pro", display_name: "Gemini 2.5 Pro", context_window: 2000000 },
      { slug: "google/gemini-2.5-flash", display_name: "Gemini 2.5 Flash", context_window: 1000000 },
      { slug: "google/gemini-2.5-flash-lite", display_name: "Gemini 2.5 Flash Lite", context_window: 1000000 },
      { slug: "openai/gpt-5", display_name: "GPT-5", context_window: 400000 },
      { slug: "openai/gpt-5-mini", display_name: "GPT-5 Mini", context_window: 400000 },
      { slug: "openai/gpt-5-nano", display_name: "GPT-5 Nano", context_window: 400000 },
      { slug: "anthropic/claude-sonnet-4", display_name: "Claude Sonnet 4", context_window: 200000 },
    ];
    let inserted = 0;
    for (const p of presets) {
      const { data: exists } = await db.from("ai_models").select("id").eq("slug", p.slug).maybeSingle();
      if (!exists) {
        await db.from("ai_models").insert({ ...p, provider_id: provider.id, is_active: true });
        inserted++;
      }
    }
    return { ok: true, inserted };
  });

/* ---------------- WhatsApp ---------------- */

export const createWhatsappAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string; waba_id: string; name: string; business_id?: string; access_token?: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { data: row, error } = await db.from("whatsapp_accounts").insert({
      tenant_id: data.tenant_id, waba_id: data.waba_id, name: data.name,
      business_id: data.business_id || null, access_token: data.access_token || null,
      status: "active", is_connected: !!data.access_token,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWhatsappAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { error } = await db.from("whatsapp_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createWhatsappNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { whatsapp_account_id: string; phone_number_id: string; display_phone_number: string; verified_name?: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { data: acc, error: ae } = await db.from("whatsapp_accounts").select("tenant_id").eq("id", data.whatsapp_account_id).single();
    if (ae || !acc) throw new Error("Account not found");
    const { data: row, error } = await db.from("whatsapp_phone_numbers").insert({
      tenant_id: acc.tenant_id, whatsapp_account_id: data.whatsapp_account_id,
      phone_number_id: data.phone_number_id, display_phone_number: data.display_phone_number,
      verified_name: data.verified_name || null,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWhatsappNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await gate(context);
    const { error } = await db.from("whatsapp_phone_numbers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- CRM demo seed ---------------- */

export const seedDemoCrm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await gate(context);
    const { data: tenants } = await db.from("tenants").select("id,name,billing_email");
    if (!tenants || tenants.length === 0) return { ok: false, message: "No tenants" };

    const firstNames = ["Rahim", "Karim", "Nusrat", "Sabina", "Tanvir", "Farhan", "Mitu", "Sadia", "Rakib", "Ayesha"];
    const lastNames = ["Ahmed", "Hossain", "Khan", "Islam", "Rahman", "Chowdhury", "Akter", "Alam"];
    const tags = [["vip"], ["new"], ["returning"], ["lead"], ["cod"], ["wholesale"]];
    const labelPresets = [
      { label: "VIP", color: "#f59e0b" },
      { label: "New lead", color: "#3b82f6" },
      { label: "Follow-up", color: "#10b981" },
      { label: "Complaint", color: "#ef4444" },
      { label: "Order pending", color: "#8b5cf6" },
    ];

    let customers = 0, labels = 0, convos = 0, notes = 0;

    for (const t of tenants) {
      // Labels
      for (const l of labelPresets) {
        const { data: exists } = await db.from("conversation_labels")
          .select("id").eq("tenant_id", t.id).eq("label", l.label).maybeSingle();
        if (!exists) {
          await db.from("conversation_labels").insert({ tenant_id: t.id, label: l.label, color: l.color });
          labels++;
        }
      }

      // Customers (skip if tenant already has >= 5)
      const { count } = await db.from("customers").select("*", { count: "exact", head: true }).eq("tenant_id", t.id);
      if ((count ?? 0) < 5) {
        for (let i = 0; i < 6; i++) {
          const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
          const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
          const full_name = `${fn} ${ln}`;
          const phone = "+8801" + Math.floor(300000000 + Math.random() * 699999999);
          const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`;
          const { data: cust } = await db.from("customers").insert({
            tenant_id: t.id, full_name, email, phone, wa_phone: phone,
            tags: tags[Math.floor(Math.random() * tags.length)],
            last_seen_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
          }).select("id").single();
          customers++;

          if (cust && i < 3) {
            const { data: conv } = await db.from("conversations").insert({
              tenant_id: t.id, customer_id: cust.id,
              channel: i % 2 === 0 ? "facebook" : "whatsapp",
              status: "open", priority: "normal",
              last_message_preview: "Bhai product ta available ase?",
              last_message_at: new Date().toISOString(),
              unread_count: Math.floor(Math.random() * 4),
            }).select("id").single();
            if (conv) {
              convos++;
              await db.from("internal_notes").insert({
                tenant_id: t.id, conversation_id: conv.id,
                body: "Customer পুরাতন — আগের order-এ COD refuse করছিল, সাবধানে handle করতে হবে।",
              });
              notes++;
            }
          }
        }
      }
    }
    return { ok: true, customers, labels, convos, notes };
  });
