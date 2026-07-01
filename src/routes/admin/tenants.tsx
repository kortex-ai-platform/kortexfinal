import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listTenants, listBilling } from "@/lib/admin-views.functions";
import { assignSubscription, cancelSubscription } from "@/lib/admin-mutations.functions";
import { AdminTable, fmtDate } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tenants")({
  head: () => ({ meta: [{ title: "Tenants — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listTenants);
  const billFn = useServerFn(listBilling);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-tenants"], queryFn: () => fn() });
  const { data: billData } = useQuery({ queryKey: ["admin-billing"], queryFn: () => billFn() });

  const cancelFn = useServerFn(cancelSubscription);
  const cancelMut = useMutation({
    mutationFn: (tenant_id: string) => cancelFn({ data: { tenant_id } }),
    onSuccess: () => { toast.success("Subscription canceled"); qc.invalidateQueries({ queryKey: ["admin-tenants"] }); },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  const tenants = data?.tenants ?? [];
  const members = data?.members ?? [];
  const subs = data?.subs ?? [];
  const plans = billData?.plans ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Tenants / Organizations</h1>
        <p className="text-sm text-muted-foreground">All organizations on the platform with subscription controls.</p>
      </div>
      <AdminTable
        title="Tenants"
        rows={tenants}
        cols={[
          { key: "name", label: "Name" },
          { key: "billing_email", label: "Billing email" },
          { key: "members", label: "Members", render: (r: any) => members.filter((m: any) => m.tenant_id === r.id).length },
          {
            key: "sub", label: "Subscription",
            render: (r: any) => {
              const s = subs.find((x: any) => x.tenant_id === r.id);
              const plan = s ? plans.find((p: any) => p.id === s.plan_id) : null;
              return s ? <span className="flex items-center gap-2"><Badge variant="secondary">{s.status}</Badge>{plan && <span className="text-xs text-muted-foreground">{plan.name}</span>}</span> : <span className="text-muted-foreground">none</span>;
            },
          },
          { key: "created_at", label: "Created", render: (r: any) => fmtDate(r.created_at) },
          { key: "actions", label: "", render: (r: any) => {
            const hasSub = subs.find((x: any) => x.tenant_id === r.id);
            return (
              <div className="flex gap-2 justify-end">
                <AssignPlanDialog tenant={r} plans={plans} currentPlanId={hasSub?.plan_id} onDone={() => qc.invalidateQueries({ queryKey: ["admin-tenants"] })} />
                {hasSub && hasSub.status !== "canceled" && <Button size="sm" variant="outline" onClick={() => confirm(`Cancel subscription for "${r.name}"?`) && cancelMut.mutate(r.id)}>Cancel</Button>}
              </div>
            );
          }},
        ]}
      />
    </div>
  );
}

function AssignPlanDialog({ tenant, plans, currentPlanId, onDone }: { tenant: any; plans: any[]; currentPlanId?: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(currentPlanId || "");
  const assign = useServerFn(assignSubscription);
  const mut = useMutation({
    mutationFn: () => assign({ data: { tenant_id: tenant.id, plan_id: planId } }),
    onSuccess: () => { toast.success("Plan assigned"); setOpen(false); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Assign plan</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign plan to {tenant.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder={plans.length ? "Select plan" : "No plans — seed defaults from Billing"} /></SelectTrigger>
              <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={() => mut.mutate()} disabled={!planId || mut.isPending}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
