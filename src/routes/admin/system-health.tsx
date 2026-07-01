import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSystemHealth } from "@/lib/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/components/admin/data-table";
import { CheckCircle2, AlertTriangle, Activity, Timer } from "lucide-react";

export const Route = createFileRoute("/admin/system-health")({
  head: () => ({ meta: [{ title: "System Health — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(getSystemHealth);
  const { data, isLoading } = useQuery({ queryKey: ["admin-health"], queryFn: () => fn(), refetchInterval: 20000 });
  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  const healthy = data.webhook.successRate >= 95 && data.api.errorRate < 5;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">System Health</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live 24h operational metrics.</p>
        </div>
        <Badge variant={healthy ? "default" : "destructive"} className={healthy ? "bg-green-500/20 text-green-700 dark:text-green-400" : ""}>
          {healthy ? "All Systems Operational" : "Degraded"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Webhook success</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl font-bold">{data.webhook.successRate}%</div>
            <div className="text-xs text-muted-foreground">{data.webhook.success} / {data.webhook.total}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">API errors 24h</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl font-bold">{data.api.errorRate}%</div>
            <div className="text-xs text-muted-foreground">{data.api.errors} / {data.api.total}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Avg latency</CardTitle>
            <Timer className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="font-display text-2xl font-bold">{data.api.avgLatencyMs} ms</div></CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Error logs 24h</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl font-bold">{data.logs.errors24h}</div>
            <div className="text-xs text-muted-foreground">of {data.logs.total24h}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle>AI Provider Health</CardTitle></CardHeader>
        <CardContent>
          {data.providers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No provider health checks yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2 pr-4">Provider</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Latency</th><th className="py-2 pr-4">Last check</th><th className="py-2 pr-4">Error</th></tr>
              </thead>
              <tbody>
                {data.providers.map((p: any) => (
                  <tr key={p.provider_id} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{p.provider_id.slice(0, 8)}</td>
                    <td className="py-2 pr-4">{p.is_healthy ? <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">Healthy</Badge> : <Badge variant="destructive">Down</Badge>}</td>
                    <td className="py-2 pr-4">{p.latency_ms ?? "—"} ms</td>
                    <td className="py-2 pr-4">{fmtDate(p.last_checked_at)}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{p.error_message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
