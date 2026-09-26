import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2, CreditCard, Brain, MessageCircle, BookOpen, Activity,
  UserSquare2, Workflow, FileText, Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminOverview } from "@/lib/admin-views.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — kortex Ai" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const fn = useServerFn(adminOverview);
  const { data } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  const widgets = [
    { label: "Tenants", value: data?.tenants ?? 0, icon: Building2, to: "/admin/tenants" },
    { label: "Subscriptions", value: data?.subs ?? 0, icon: CreditCard, to: "/admin/billing" },
    { label: "Invoices", value: data?.invoices ?? 0, icon: FileText, to: "/admin/billing" },
    { label: "FB pages", value: data?.fbPages ?? 0, icon: MessageCircle, to: "/admin/clients" },
    
    
    { label: "Automation rules", value: data?.rules ?? 0, icon: Workflow, to: "/admin/automation-view" },
    { label: "Customers", value: data?.customers ?? 0, icon: UserSquare2, to: "/admin/crm" },
  ];

  const sections = [
    { to: "/admin/clients", label: "Clients", icon: Users, desc: "Manage client list & credentials" },
    { to: "/admin/tenants", label: "Tenants / Orgs", icon: Building2, desc: "Organizations & members" },
    { to: "/admin/billing", label: "Billing", icon: CreditCard, desc: "Invoices, plans, transactions" },
    { to: "/admin/ai-models", label: "AI Providers", icon: Brain, desc: "Models, usage, cost" },
    
    
    { to: "/admin/crm", label: "CRM", icon: UserSquare2, desc: "Customers, labels, notes" },
    { to: "/admin/automation-view", label: "Automation", icon: Workflow, desc: "Rules, triggers, actions" },
    { to: "/admin/monitoring", label: "Monitoring", icon: Activity, desc: "Webhooks, logs, audit" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Command Center</p>
          <h1 className="font-display text-3xl font-semibold">Admin Control Panel</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
          Platform-wide visibility across tenants, billing, AI, channels, and operations.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="size-2 rounded-full bg-success shadow-[0_0_0_4px_color-mix(in_oklab,var(--success)_14%,transparent)]" />
          Live workspace data
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {widgets.map((w) => (
          <Link key={w.label} to={w.to} className="block">
            <Card className="group h-full rounded-lg border-border/80 bg-card/90 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {w.label}
                </CardTitle>
                <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <w.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-semibold text-foreground">{w.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">All admin sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">Access every area of the control panel.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group flex min-h-24 items-start gap-3 rounded-lg border border-border/80 bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">{s.label}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{s.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
