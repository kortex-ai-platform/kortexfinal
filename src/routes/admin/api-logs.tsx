import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApiLogs } from "@/lib/admin-platform.functions";
import { AdminTable, fmtDate } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/api-logs")({
  head: () => ({ meta: [{ title: "API Logs — Admin" }] }),
  component: Page,
});

function statusBadge(code: number | null | undefined) {
  if (code == null) return <Badge variant="outline">—</Badge>;
  if (code < 300) return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">{code}</Badge>;
  if (code < 400) return <Badge variant="secondary">{code}</Badge>;
  return <Badge variant="destructive">{code}</Badge>;
}

function Page() {
  const fn = useServerFn(listApiLogs);
  const { data, isLoading } = useQuery({ queryKey: ["admin-api-logs"], queryFn: () => fn(), refetchInterval: 15000 });
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">API Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">External API + webhook call log (auto-refresh every 15s).</p>
      </div>
      <AdminTable
        title="API usage (latest 200)"
        rows={data?.api ?? []}
        cols={[
          { key: "method", label: "Method" },
          { key: "endpoint", label: "Endpoint" },
          { key: "status_code", label: "Status", render: (r: any) => statusBadge(r.status_code) },
          { key: "duration_ms", label: "Duration", render: (r: any) => `${r.duration_ms ?? 0} ms` },
          { key: "tenant_id", label: "Tenant", render: (r: any) => r.tenant_id?.slice(0, 8) ?? "—" },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
      <AdminTable
        title="Webhook logs"
        rows={data?.webhooks ?? []}
        cols={[
          { key: "provider", label: "Provider" },
          { key: "event_type", label: "Event" },
          { key: "status_code", label: "Status", render: (r: any) => statusBadge(r.status_code) },
          { key: "error", label: "Error", render: (r: any) => r.error ?? "—" },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
    </div>
  );
}
