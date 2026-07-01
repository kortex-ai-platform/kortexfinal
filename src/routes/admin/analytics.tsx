import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAnalytics } from "@/lib/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users2, DollarSign, Cpu, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: Page,
});

function Stat({ icon: Icon, label, value, hint }: any) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MiniBars({ series, valueKey, label }: { series: any[]; valueKey: string; label: string }) {
  const max = Math.max(1, ...series.map((s) => Number(s[valueKey]) || 0));
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="text-base">{label} (last 30 days)</CardTitle></CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-[2px]">
          {series.map((s) => (
            <div key={s.date} className="flex-1 rounded-t bg-primary/70 transition-all hover:bg-primary" style={{ height: `${((Number(s[valueKey]) || 0) / max) * 100}%`, minHeight: 2 }} title={`${s.date}: ${s[valueKey]}`} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{series[0]?.date}</span>
          <span>{series[series.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Page() {
  const fn = useServerFn(getAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["admin-analytics"], queryFn: () => fn() });
  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  const t = data.totals;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last 30 days snapshot.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users2} label="New Tenants" value={t.tenants30d} />
        <Stat icon={DollarSign} label="Paid Revenue" value={`${(t.paidRevenue / 100).toLocaleString()}`} hint="BDT" />
        <Stat icon={TrendingUp} label="Active Subs" value={t.activeSubs} />
        <Stat icon={Cpu} label="AI Requests" value={t.aiRequests.toLocaleString()} hint={`${t.aiTokens.toLocaleString()} tokens`} />
        <Stat icon={DollarSign} label="AI Cost" value={`${(t.aiCostCents / 100).toFixed(2)}`} hint="cents → dollars" />
        <Stat icon={MessageSquare} label="Total Customers" value={t.customers.toLocaleString()} />
        <Stat icon={MessageSquare} label="Conversations" value={t.conversations.toLocaleString()} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <MiniBars series={data.daily} valueKey="tenants" label="New tenants" />
        <MiniBars series={data.daily} valueKey="revenue" label="Revenue (cents)" />
        <MiniBars series={data.daily} valueKey="aiReq" label="AI requests" />
        <MiniBars series={data.daily} valueKey="aiCost" label="AI cost (cents)" />
      </div>
    </div>
  );
}
