import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listBilling, getInvoiceDetail } from "@/lib/admin-views.functions";
import { createPlan, togglePlan, deletePlan, createInvoice, markInvoicePaid, seedDefaultPlans } from "@/lib/admin-mutations.functions";
import { listTenants } from "@/lib/admin-views.functions";
import { AdminTable, fmtDate, fmtMoney } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({ meta: [{ title: "Billing — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listBilling);
  const tenantsFn = useServerFn(listTenants);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-billing"], queryFn: () => fn() });
  const { data: tenantsData } = useQuery({ queryKey: ["admin-tenants"], queryFn: () => tenantsFn() });

  const refetch = () => qc.invalidateQueries({ queryKey: ["admin-billing"] });

  const seedFn = useServerFn(seedDefaultPlans);
  const togglePlanFn = useServerFn(togglePlan);
  const deletePlanFn = useServerFn(deletePlan);
  const markPaidFn = useServerFn(markInvoicePaid);

  const seedMut = useMutation({ mutationFn: () => seedFn(), onSuccess: () => { toast.success("Seeded default plans"); refetch(); } });
  const togglePlanMut = useMutation({ mutationFn: (d: { id: string; is_public: boolean }) => togglePlanFn({ data: d }), onSuccess: refetch });
  const deletePlanMut = useMutation({ mutationFn: (id: string) => deletePlanFn({ data: { id } }), onSuccess: () => { toast.success("Plan deleted"); refetch(); } });
  const markPaidMut = useMutation({ mutationFn: (id: string) => markPaidFn({ data: { id } }), onSuccess: () => { toast.success("Invoice marked paid"); refetch(); } });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  const invoices = data?.invoices ?? [];
  const tx = data?.tx ?? [];
  const plans = data?.plans ?? [];
  const tenants = tenantsData?.tenants ?? [];

  const totalRevenue = tx
    .filter((t: any) => t.status === "succeeded" || t.status === "paid")
    .reduce((s: number, t: any) => s + (t.amount_cents || 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Billing & Revenue</h1>
          <p className="text-sm text-muted-foreground">Plans, invoices, transactions।</p>
          <div className="mt-2 text-sm">Total collected: <span className="font-semibold">{fmtMoney(totalRevenue)}</span></div>
        </div>
        <div className="flex gap-2">
          {plans.length === 0 && <Button variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>Seed default plans</Button>}
          <NewPlanDialog onCreated={refetch} />
          <NewInvoiceDialog tenants={tenants} onCreated={refetch} />
        </div>
      </div>

      <AdminTable
        title="Plans"
        rows={plans}
        cols={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "monthly_price_cents", label: "Price", render: (r: any) => fmtMoney(r.monthly_price_cents, r.currency) },
          { key: "is_public", label: "Public", render: (r: any) => (r.is_public ? "Yes" : "No") },
          { key: "actions", label: "", render: (r: any) => (
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => togglePlanMut.mutate({ id: r.id, is_public: !r.is_public })}>{r.is_public ? "Hide" : "Show"}</Button>
              <Button size="sm" variant="destructive" onClick={() => confirm(`Delete plan "${r.name}"?`) && deletePlanMut.mutate(r.id)}>Delete</Button>
            </div>
          )},
        ]}
      />

      <AdminTable
        title="Invoices"
        rows={invoices}
        cols={[
          { key: "invoice_no", label: "Invoice #" },
          { key: "status", label: "Status", render: (r: any) => <Badge variant="secondary">{r.status}</Badge> },
          { key: "total_cents", label: "Amount", render: (r: any) => fmtMoney(r.total_cents, r.currency) },
          { key: "due_at", label: "Due", render: (r: any) => fmtDate(r.due_at) },
          { key: "created_at", label: "Created", render: (r: any) => fmtDate(r.created_at) },
          { key: "actions", label: "", render: (r: any) => (
            <div className="flex gap-2 justify-end">
              <ViewInvoiceButton id={r.id} />
              {r.status !== "paid" && <Button size="sm" onClick={() => markPaidMut.mutate(r.id)}>Mark paid</Button>}
            </div>
          )},
        ]}
      />

      <AdminTable
        title="Recent transactions"
        rows={tx}
        cols={[
          { key: "provider", label: "Provider" },
          { key: "amount_cents", label: "Amount", render: (r: any) => fmtMoney(r.amount_cents, r.currency) },
          { key: "status", label: "Status" },
          { key: "created_at", label: "When", render: (r: any) => fmtDate(r.created_at) },
        ]}
      />
    </div>
  );
}

function NewPlanDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const create = useServerFn(createPlan);
  const mut = useMutation({
    mutationFn: () => create({ data: { name, monthly_price_cents: Math.round(parseFloat(price || "0") * 100) } }),
    onSuccess: () => { toast.success("Plan created"); setOpen(false); setName(""); setPrice("0"); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>New plan</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create plan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" /></div>
          <div><Label>Monthly price (USD)</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => mut.mutate()} disabled={!name || mut.isPending}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewInvoiceDialog({ tenants, onCreated }: { tenants: any[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [amount, setAmount] = useState("0");
  const create = useServerFn(createInvoice);
  const mut = useMutation({
    mutationFn: () => create({ data: { tenant_id: tenantId, total_cents: Math.round(parseFloat(amount || "0") * 100) } }),
    onSuccess: () => { toast.success("Invoice created"); setOpen(false); setAmount("0"); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">New invoice</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tenant</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>{tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Amount (USD)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => mut.mutate()} disabled={!tenantId || mut.isPending}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewInvoiceButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(getInvoiceDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fn({ data: { id } }),
    enabled: open,
  });
  const inv = data?.invoice;
  const items = data?.items ?? [];
  const tx = data?.tx ?? [];
  const paid = tx
    .filter((t: any) => t.status === "succeeded" || t.status === "paid")
    .reduce((s: number, t: any) => s + (t.amount_cents || 0), 0);
  const total = inv?.total_cents ?? 0;
  const due = Math.max(0, total - paid);
  const payState =
    inv?.status === "paid" || (total > 0 && due === 0) ? "Fully paid" : paid > 0 ? "Partially paid" : "Unpaid";

  const handlePrint = () => {
    const node = document.getElementById(`invoice-print-${id}`);
    if (!node) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<html><head><title>Invoice ${inv?.invoice_no ?? ""}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:ui-sans-serif,system-ui,Arial;color:#111;padding:40px;margin:0}
        h1,h2,h3{margin:0}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px}
        th{background:#f8fafc;text-transform:uppercase;font-size:11px;letter-spacing:.05em;color:#475569}
        .right{text-align:right}
        .muted{color:#64748b;font-size:12px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:20px 0}
        .totals{margin-left:auto;width:280px;margin-top:16px}
        .totals div{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
        .totals .grand{border-top:2px solid #111;font-weight:700;font-size:15px;padding-top:10px;margin-top:6px}
        .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#e0f2fe;color:#075985}
        .paid{background:#dcfce7;color:#166534}
        .unpaid{background:#fee2e2;color:#991b1b}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px}
      </style></head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">View</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Invoice {inv?.invoice_no ?? ""}</DialogTitle>
          {inv && <Button size="sm" variant="outline" onClick={handlePrint}>🖨 Print</Button>}
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !inv ? (
          <p className="text-sm">Not found</p>
        ) : (
          <div id={`invoice-print-${id}`} className="bg-white text-black p-6 rounded-md">
            <div className="header flex items-start justify-between border-b-2 border-black pb-4">
              <div>
                <h1 className="text-2xl font-bold">INVOICE</h1>
                <div className="muted text-xs text-slate-500 mt-1">#{inv.invoice_no}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">Kortex Business</div>
                <div className="muted text-xs text-slate-500">kortex.business</div>
                <div className="mt-2">
                  <span className={`badge ${payState === "Fully paid" ? "paid" : payState === "Unpaid" ? "unpaid" : ""}`}>
                    {payState}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid grid-cols-2 gap-6 my-5">
              <div>
                <div className="muted text-xs uppercase tracking-wide text-slate-500">Billed to</div>
                <div className="font-semibold mt-1">{data?.tenant?.name ?? "—"}</div>
                <div className="text-sm">{data?.tenant?.billing_email ?? "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-sm"><span className="muted text-slate-500">Issued:</span> {fmtDate(inv.created_at)}</div>
                <div className="text-sm"><span className="muted text-slate-500">Due:</span> {fmtDate(inv.due_at)}</div>
                {inv.period_start && <div className="text-sm"><span className="muted text-slate-500">Period start:</span> {fmtDate(inv.period_start)}</div>}
                {inv.period_end && <div className="text-sm"><span className="muted text-slate-500">Period end:</span> {fmtDate(inv.period_end)}</div>}
                <div className="text-sm"><span className="muted text-slate-500">Status:</span> {inv.status}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="right">Qty</th>
                  <th className="right">Unit</th>
                  <th className="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="muted">Plan / subscription charge</td>
                    <td /></tr>
                ) : items.map((it: any) => (
                  <tr key={it.id}>
                    <td>{it.description ?? "—"}</td>
                    <td className="right">{it.quantity ?? 1}</td>
                    <td className="right">{fmtMoney(it.unit_price_cents, inv.currency)}</td>
                    <td className="right">{fmtMoney(it.amount_cents ?? (it.unit_price_cents ?? 0) * (it.quantity ?? 1), inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals ml-auto w-72 mt-4">
              <div className="flex justify-between py-1"><span className="muted text-slate-500">Subtotal</span><span>{fmtMoney(inv.subtotal_cents ?? total, inv.currency)}</span></div>
              {inv.tax_cents ? <div className="flex justify-between py-1"><span className="muted text-slate-500">Tax</span><span>{fmtMoney(inv.tax_cents, inv.currency)}</span></div> : null}
              {(inv as any).discount_cents ? <div className="flex justify-between py-1"><span className="muted text-slate-500">Discount</span><span>-{fmtMoney((inv as any).discount_cents, inv.currency)}</span></div> : null}
              <div className="grand flex justify-between border-t-2 border-black pt-2 mt-2 font-bold"><span>Total</span><span>{fmtMoney(total, inv.currency)}</span></div>
              <div className="flex justify-between py-1"><span className="muted text-slate-500">Paid</span><span>{fmtMoney(paid, inv.currency)}</span></div>
              <div className="flex justify-between py-1 font-semibold"><span>Balance due</span><span>{fmtMoney(due, inv.currency)}</span></div>
            </div>

            {tx.length > 0 && (
              <div className="mt-6">
                <div className="muted text-xs uppercase tracking-wide text-slate-500 mb-2">Payment history</div>
                <table>
                  <thead><tr><th>Date</th><th>Provider</th><th>Status</th><th className="right">Amount</th></tr></thead>
                  <tbody>
                    {tx.map((t: any) => (
                      <tr key={t.id}>
                        <td>{fmtDate(t.created_at)}</td>
                        <td>{t.provider}</td>
                        <td>{t.status}</td>
                        <td className="right">{fmtMoney(t.amount_cents, t.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-8 text-xs text-slate-500 border-t pt-3">
              Thank you for your business. For any questions, contact billing@kortex.business.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
