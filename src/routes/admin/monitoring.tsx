import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMonitoring } from "@/lib/admin-views.functions";
import { AdminTable, fmtDate } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/monitoring")({
  head: () => ({ meta: [{ title: "Monitoring — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listMonitoring);
  const { data, isLoading } = useQuery({ queryKey: ["admin-mon"], queryFn: () => fn(), refetchInterval: 15000 });
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Monitoring & Logs</h1>
        <p className="text-sm text-muted-foreground">Live webhook, system, API, audit, notifications।</p>
      </div>
      <AdminTable
        title="Webhook logs"
        rows={data?.webhooks ?? []}
        cols={[
          { key: "provider", label: "Provider" },
          { key: "event_type", label: "Event" },
          { key: "status_code", label: "Status", render: (r: any) => (
            <Badge variant={r.status_code >= 400 ? "destructive" : "secondary"}>{r.status_code ?? "—"}</Badge>
          ) },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
      <AdminTable
        title="System logs"
        rows={data?.system ?? []}
        cols={[
          { key: "level", label: "Level", render: (r: any) => (
            <Badge variant={r.level === "error" ? "destructive" : "secondary"}>{r.level}</Badge>
          ) },
          { key: "message", label: "Message", render: (r: any) => String(r.message ?? "").slice(0, 120) },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
      <AdminTable
        title="API usage"
        rows={data?.api ?? []}
        cols={[
          { key: "endpoint", label: "Endpoint" },
          { key: "status_code", label: "Status" },
          { key: "duration_ms", label: "Duration (ms)" },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
      <AdminTable
        title="Audit trail"
        rows={data?.audit ?? []}
        cols={[
          { key: "action", label: "Action" },
          { key: "entity_type", label: "Entity" },
          { key: "actor_id", label: "Actor" },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
      <AdminTable
        title="Notifications"
        rows={data?.notifs ?? []}
        cols={[
          { key: "title", label: "Title" },
          { key: "body", label: "Body", render: (r: any) => String(r.body ?? "").slice(0, 80) },
          { key: "read_at", label: "Read", render: (r: any) => (r.read_at ? "Yes" : "No") },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
    </div>
  );
}
