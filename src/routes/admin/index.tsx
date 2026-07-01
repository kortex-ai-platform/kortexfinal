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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin Control Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide visibility across tenants, billing, AI, channels, and operations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map((w) => (
          <Link key={w.label} to={w.to} className="block">
            <Card className="rounded-2xl transition hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {w.label}
                </CardTitle>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                  <w.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl font-bold">{w.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>All admin sections</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex items-start gap-3 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
