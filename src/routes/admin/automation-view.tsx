import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAutomation } from "@/lib/admin-views.functions";
import { AdminTable, fmtDate } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/automation-view")({
  head: () => ({ meta: [{ title: "Automation — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listAutomation);
  const { data, isLoading } = useQuery({ queryKey: ["admin-auto"], queryFn: () => fn() });
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Automation Engine</h1>
      </div>
      <AdminTable
        title="Rules"
        rows={data?.rules ?? []}
        cols={[
          { key: "name", label: "Rule" },
          { key: "priority", label: "Priority" },
          { key: "is_active", label: "Active", render: (r: any) => (r.is_active ? <Badge>On</Badge> : <Badge variant="outline">Off</Badge>) },
          { key: "created_at", label: "Created", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
      <AdminTable
        title="Triggers"
        rows={data?.triggers ?? []}
        cols={[
          { key: "rule_id", label: "Rule" },
          { key: "trigger_type", label: "Type" },
        ]}
      />
      <AdminTable
        title="Actions"
        rows={data?.actions ?? []}
        cols={[
          { key: "rule_id", label: "Rule" },
          { key: "action_type", label: "Action" },
          { key: "order_index", label: "Order" },
        ]}
      />
      <AdminTable
        title="Execution logs"
        rows={data?.logs ?? []}
        cols={[
          { key: "rule_id", label: "Rule" },
          { key: "status", label: "Status" },
          { key: "error", label: "Error", render: (r: any) => r.error ?? "—" },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
    </div>
  );
}
