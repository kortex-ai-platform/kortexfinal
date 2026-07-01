import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Col<T> = { key: keyof T | string; label: string; render?: (row: T) => any };

export function AdminTable<T extends Record<string, any>>({
  title, rows, cols, empty = "No data yet",
}: { title: string; rows: T[]; cols: Col<T>[]; empty?: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="secondary">{rows.length}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {cols.map((c) => (
                    <th key={String(c.key)} className="py-2 pr-4 font-medium">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={(r.id as string) ?? i} className="border-b border-border/40 last:border-0">
                    {cols.map((c) => (
                      <td key={String(c.key)} className="py-2 pr-4 align-top">
                        {c.render ? c.render(r) : String(r[c.key as keyof T] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

export function fmtMoney(cents?: number | null, currency = "BDT") {
  if (cents == null) return "—";
  return `${currency} ${(cents / 100).toLocaleString()}`;
}
