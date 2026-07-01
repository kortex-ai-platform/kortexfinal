# Phase 1 — Foundation Audit + Gap-Fix

বর্তমান codebase-এ already আছে: `workspaces`, `workspace_members`, RLS-based isolation, `fb_*`, `ai_*`, `brand_memory_*`, `products`, `orders`, admin/user panel split. গাঢ় যে gap আছে — Tenant layer, Billing, WhatsApp, Master Admin separation, per-tenant Analytics।

## ১. Tenant Layer (নতুন hierarchy)

বর্তমানে `workspace = tenant`. নতুন model:

```text
tenant (company/agency)
  └── workspaces (brand 1, brand 2, ...)
        └── existing data (fb_pages, products, ...)
```

### Schema changes (single migration)

- নতুন table `tenants` — id, name, slug, owner_id, plan_id, status, billing_email, created_at
- নতুন table `tenant_members` — tenant_id, user_id, role (`owner|admin|billing|member`)
- `workspaces`-এ add: `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- Helper fn: `current_tenant_id()`, `is_tenant_member(_t, _u)`, `has_tenant_role(_t, _u, _r)`
- Data migration: প্রতিটা existing workspace owner-এর জন্য একটা auto-tenant তৈরি করে workspace সেখানে assign
- `handle_new_user()` trigger update — signup-এ tenant + default workspace দুটোই বানাবে

RLS update: workspace-level policies অপরিবর্তিত, কিন্তু tenant-level resource (billing, members) `is_tenant_member` দিয়ে gated।

## ২. Billing Module

### Schema
- `plans` — id, name, slug, monthly_price, features (jsonb), limits (jsonb: workspaces, ai_calls, fb_pages, wa_numbers)
- `subscriptions` — tenant_id, plan_id, status (`active|trialing|past_due|cancelled`), current_period_end, provider, provider_subscription_id
- `usage_counters` — tenant_id, month, metric (`ai_calls|messages|fb_pages|wa_numbers`), count
- Trigger: `ai_request_logs` insert → increment `usage_counters`

### Provider
Recommend `enable_paddle_payments` (subscription-friendly, MoR). Webhook → `/api/public/billing/paddle.ts` updates subscription state। Enforce limits via DB function `assert_within_limit(tenant_id, metric)` called from server fns।

### UI
- `/app/billing` — current plan, usage bars, upgrade button
- `/admin/plans` — admin manages plan catalog
- `/admin/tenants/:id/billing` — manual override

## ৩. WhatsApp Integration

Mirror Facebook architecture:

### Schema
- `wa_numbers` — workspace_id, phone_number_id, display_phone, waba_id, access_token, app_secret, verified_name, status
- `wa_conversations`, `wa_messages` — mirror `fb_conversations`/`fb_messages`
- `wa_settings` per-workspace (system prompt, auto-reply toggle)

### Backend
- `src/lib/wa-oauth.functions.ts` — Embedded Signup (Meta WhatsApp Business Platform)
- `src/lib/wa-graph.server.ts` — send message, fetch profile via Graph API
- `src/lib/wa-ai.server.ts` — reuse `aiRoute` + brand memory
- `src/routes/api/public/wa/webhook.ts` — same verify/signature pattern as FB

### UI
- `/app/whatsapp` — connect number, per-number settings, chat thread view in `/app/chats` (tab beside FB)

Secrets needed (will request via add_secret after approval): `WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`।

## ৪. Master Admin Separation

বর্তমান `/admin/*` mixed — workspace data + platform mgmt। Split:

- `/admin` (platform owner only, `app_role = 'super_admin'`):
  - `/admin/tenants` — সব tenant list, impersonate, suspend
  - `/admin/users` — সব user, role grants
  - `/admin/plans` — plan catalog
  - `/admin/usage` — platform-wide AI/message volume
  - `/admin/health` — provider health, error logs
- নতুন role: `super_admin` (existing `admin` → renamed to tenant-level)
- নতুন migration: `app_role` enum-এ `super_admin` add, designated user(s) seed

Existing `admin` role workspace-scoped কাজ করবে; `super_admin` সব tenant cross-cut।

## ৫. Per-Tenant Analytics

### Schema
- Materialized view `tenant_analytics_daily` — tenant_id, date, messages_in, messages_out, ai_calls, ai_cost_cents, conversations_started, orders_count, revenue_cents
- Daily refresh via pg_cron (`SELECT cron.schedule(...)`)

### UI
- `/app/analytics` — line charts (Recharts) — messages, AI cost, conversion funnel
- `/admin/tenants/:id` impersonation view shows same charts

## ৬. API Layer (public REST for tenants)

- `/api/public/v1/messages` (POST) — send message via tenant API key
- `/api/public/v1/conversations` (GET) — list
- নতুন table `api_keys` — tenant_id, key_hash, scopes, last_used_at
- Auth: `Authorization: Bearer kx_live_...` → hash lookup → resolve tenant
- Rate limit: per-tenant via `usage_counters`

UI: `/app/settings/api-keys` — generate/revoke।

## Implementation Order (sequential migrations)

```text
1. Migration: tenants + tenant_members + workspaces.tenant_id + backfill + trigger update
2. Migration: plans + subscriptions + usage_counters + super_admin role
3. Migration: wa_* tables (mirror fb_*)
4. Migration: api_keys + tenant_analytics_daily MV + cron
5. Backend: wa-*.functions.ts, billing.functions.ts, analytics.functions.ts, api-keys.functions.ts
6. Backend: limit enforcement helper, webhook routes (wa/webhook, billing/paddle, v1/*)
7. UI: tenant switcher in header, /app/billing, /app/whatsapp, /app/analytics, /app/settings/api-keys
8. UI: /admin restructure (tenants, plans, usage, health), impersonation flow
9. Payments: enable_paddle_payments + plan seeding + webhook wiring
10. Secrets request: WhatsApp credentials
```

## Out of scope (later phases)

- White-label / per-tenant custom domain
- Audit log, SSO/SAML for tenants
- Email/SMS notifications for billing events
- Tenant-level RBAC granular permissions UI

---

বড় migration sequence — approve করলে step-by-step শুরু করব (১ → ২ → ৩...) এবং প্রতিটার পর আপনাকে verify করতে বলব। কোন step বাদ দিতে বা reorder করতে চাইলে বলুন।
