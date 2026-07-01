import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCrm } from "@/lib/admin-views.functions";
import { seedDemoCrm } from "@/lib/admin-mutations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminTable, fmtDate } from "@/components/admin/data-table";
import { toast } from "sonner";
import { Users, Tag, MessageSquare, StickyNote, UserCog, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/crm")({
  head: () => ({ meta: [{ title: "CRM — Admin" }] }),
  component: Page,
});

function Stat({ icon: Icon, label, value }: any) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
        <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-bold">{value}</div></div>
      </CardContent>
    </Card>
  );
}

function Page() {
  const fn = useServerFn(listCrm);
  const seedFn = useServerFn(seedDemoCrm);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-crm"], queryFn: () => fn() });
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [q, setQ] = useState("");

  const seed = useMutation({
    mutationFn: () => seedFn(),
    onSuccess: (r: any) => {
      toast.success(`Demo data seeded — ${r.customers} customers, ${r.labels} labels, ${r.convos} conversations`);
      qc.invalidateQueries({ queryKey: ["admin-crm"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Seed failed"),
  });

  const view = useMemo(() => {
    const d = data ?? { customers: [], labels: [], assigns: [], notes: [], tenants: [], members: [], profiles: [], conversations: [] };
    const tenantById = new Map(d.tenants.map((t: any) => [t.id, t]));
    const profileById = new Map(d.profiles.map((p: any) => [p.id, p]));
    const convoTenant = new Map(d.conversations.map((c: any) => [c.id, c.tenant_id]));

    const filterT = (tid: string) => !tenantFilter || tid === tenantFilter;
    const matchesQ = (s?: string | null) => !q || (s ?? "").toLowerCase().includes(q.toLowerCase());

    const customers = d.customers
      .filter((c: any) => filterT(c.tenant_id))
      .filter((c: any) => matchesQ(c.full_name) || matchesQ(c.email) || matchesQ(c.phone))
      .map((c: any) => ({ ...c, tenant_name: (tenantById.get(c.tenant_id) as any)?.name ?? "—" }));

    const labels = d.labels.filter((l: any) => filterT(l.tenant_id))
      .map((l: any) => ({ ...l, tenant_name: (tenantById.get(l.tenant_id) as any)?.name ?? "—" }));

    const assigns = d.assigns
      .filter((a: any) => filterT(a.tenant_id))
      .map((a: any) => ({
        ...a,
        tenant_name: (tenantById.get(a.tenant_id) as any)?.name ?? "—",
        assignee: (profileById.get(a.assignee_user_id) as any)?.email ?? a.assignee_user_id?.slice(0, 8) ?? "—",
      }));

    const notes = d.notes
      .filter((n: any) => filterT(n.tenant_id))
      .map((n: any) => ({
        ...n,
        tenant_name: (tenantById.get(n.tenant_id) as any)?.name ?? "—",
        author: (profileById.get(n.author_user_id) as any)?.email ?? "system",
      }));

    const team = d.members
      .filter((m: any) => filterT(m.tenant_id))
      .map((m: any) => ({
        ...m,
        tenant_name: (tenantById.get(m.tenant_id) as any)?.name ?? "—",
        email: (profileById.get(m.user_id) as any)?.email ?? m.user_id?.slice(0, 8),
        full_name: (profileById.get(m.user_id) as any)?.full_name ?? "",
      }));

    return {
      customers, labels, assigns, notes, team,
      tenants: d.tenants,
      stats: {
        customers: customers.length,
        conversations: d.conversations.filter((c: any) => filterT(c.tenant_id)).length,
        labels: labels.length,
        notes: notes.length,
        team: team.length,
      },
    };
  }, [data, tenantFilter, q]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">CRM Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            প্রতিটা client-এর (tenant-এর) customer base, team members, labels, assignments ও internal notes এক জায়গায়। Support/audit-এর সময় কোন tenant-এ কী চলছে সেটা এখান থেকেই দেখা যাবে।
          </p>
        </div>
        <Button onClick={() => seed.mutate()} disabled={seed.isPending} className="gap-2">
          <Sparkles className="h-4 w-4" /> {seed.isPending ? "Seeding…" : "Seed demo data"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Users} label="Customers" value={view.stats.customers} />
        <Stat icon={MessageSquare} label="Conversations" value={view.stats.conversations} />
        <Stat icon={Tag} label="Labels" value={view.stats.labels} />
        <Stat icon={StickyNote} label="Notes" value={view.stats.notes} />
        <Stat icon={UserCog} label="Team members" value={view.stats.team} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
          >
            <option value="">All clients</option>
            {view.tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Input className="max-w-xs" placeholder="Search name / email / phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardContent>
      </Card>

      <AdminTable
        title="Team members (per client)"
        rows={view.team}
        cols={[
          { key: "tenant_name", label: "Client" },
          { key: "email", label: "Email" },
          { key: "full_name", label: "Name" },
          { key: "role", label: "Role", render: (r: any) => <Badge variant="outline">{r.role}</Badge> },
          { key: "created_at", label: "Joined", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />

      <AdminTable
        title="Customers"
        rows={view.customers}
        cols={[
          { key: "tenant_name", label: "Client" },
          { key: "full_name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "tags", label: "Tags", render: (r: any) => (r.tags ?? []).map((t: string) => <Badge key={t} variant="secondary" className="mr-1">{t}</Badge>) },
          { key: "last_seen_at", label: "Last seen", render: (r: any) => fmtDate(r.last_seen_at) },
        ]}
      />

      <AdminTable
        title="Labels"
        rows={view.labels}
        cols={[
          { key: "tenant_name", label: "Client" },
          { key: "label", label: "Label" },
          { key: "color", label: "Color", render: (r: any) => <span className="inline-block h-4 w-8 rounded" style={{ background: r.color }} /> },
        ]}
      />

      <AdminTable
        title="Recent assignments"
        rows={view.assigns}
        cols={[
          { key: "tenant_name", label: "Client" },
          { key: "assignee", label: "Assignee" },
          { key: "role", label: "Role" },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />

      <AdminTable
        title="Internal notes"
        rows={view.notes}
        cols={[
          { key: "tenant_name", label: "Client" },
          { key: "author", label: "Author" },
          { key: "body", label: "Note", render: (r: any) => String(r.body ?? "").slice(0, 120) },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
    </div>
  );
}
