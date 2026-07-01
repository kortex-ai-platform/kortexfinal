import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { listLogs, listProviders } from "@/lib/providers.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "Request Logs — kortex Ai" }] }),
  component: LogsPage,
});

const CATEGORIES = ["text", "image", "voice_tts", "voice_stt"] as const;
const STATUSES = [
  "success",
  "timeout",
  "rate_limit",
  "api_error",
  "invalid",
  "server_down",
] as const;

function statusVariant(s: string) {
  if (s === "success") return "default";
  return "destructive";
}

function LogsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [providerId, setProviderId] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const r = await listLogs({
        data: {
          category: (category || undefined) as any,
          status: status || undefined,
          providerId: providerId || undefined,
          limit: 200,
        },
      });
      setRows(r as any);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listProviders().then((r) => setProviders(r as any)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, providerId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Request Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every AI call with its provider, response time, status, and any
            failover.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Filter
            label="Category"
            value={category}
            onChange={setCategory}
            options={[
              { value: "", label: "All" },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "All" },
              ...STATUSES.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Filter
            label="Provider"
            value={providerId}
            onChange={setProviderId}
            options={[
              { value: "", label: "All" },
              ...providers.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Provider</th>
                  <th className="px-3 py-2 text-left">Attempt</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Response</th>
                  <th className="px-3 py-2 text-left">Error / Note</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No requests yet. Run a test on the Providers page.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2">
                        {r.provider_name ?? "—"}
                        {r.failover_from && (
                          <Badge
                            variant="outline"
                            className="ml-2 h-5 text-[10px]"
                          >
                            failover
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">{r.attempt}</td>
                      <td className="px-3 py-2">
                        <Badge variant={statusVariant(r.status) as any}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.response_ms}ms
                      </td>
                      <td className="px-3 py-2 max-w-[28ch] truncate text-xs text-muted-foreground">
                        {r.error_message || r.prompt_preview || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Select value={value || "__all"} onValueChange={(v) => onChange(v === "__all" ? "" : v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || "__all"} value={o.value || "__all"}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
