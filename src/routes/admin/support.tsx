import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listTickets, getTicket, updateTicket, replyTicket } from "@/lib/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/components/admin/data-table";
import { Send, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support — Admin" }] }),
  component: Page,
});

const statusColor: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};
const prioColor: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  normal: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
};

function Page() {
  const listFn = useServerFn(listTickets);
  const { data } = useQuery({ queryKey: ["admin-tickets"], queryFn: () => listFn(), refetchInterval: 20000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const tickets = (data?.tickets ?? []).filter((t: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.subject.toLowerCase().includes(s) || (t.ticket_no ?? "").toLowerCase().includes(s);
  });

  const nameOf = (id: string | null) => {
    if (!id) return "—";
    const p = data?.profiles.find((x: any) => x.id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };
  const tenantOf = (id: string | null) => {
    if (!id) return "—";
    return data?.tenants.find((x: any) => x.id === id)?.name ?? id.slice(0, 8);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tenant support tickets & conversations.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-[380px_1fr]">
        <Card className="rounded-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Tickets ({tickets.length})</CardTitle>
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </CardHeader>
          <CardContent className="max-h-[65vh] overflow-y-auto p-0">
            {tickets.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No tickets.</p> :
              tickets.map((t: any) => (
                <button key={t.id} onClick={() => setSelectedId(t.id)}
                  className={`w-full border-b px-4 py-3 text-left transition hover:bg-muted/50 ${selectedId === t.id ? "bg-muted" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{t.ticket_no}</span>
                    <Badge className={statusColor[t.status]}>{t.status}</Badge>
                    <Badge className={prioColor[t.priority]} variant="outline">{t.priority}</Badge>
                  </div>
                  <div className="mt-1 truncate font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">{tenantOf(t.tenant_id)} · {nameOf(t.requester_id)}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtDate(t.last_activity_at)}</div>
                </button>
              ))}
          </CardContent>
        </Card>
        {selectedId ? <TicketDetail id={selectedId} nameOf={nameOf} /> :
          <Card className="rounded-2xl"><CardContent className="grid place-items-center py-24 text-sm text-muted-foreground">Select a ticket to view.</CardContent></Card>
        }
      </div>
    </div>
  );
}

function TicketDetail({ id, nameOf }: { id: string; nameOf: (id: string | null) => string }) {
  const fn = useServerFn(getTicket);
  const upd = useServerFn(updateTicket);
  const rep = useServerFn(replyTicket);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-ticket", id], queryFn: () => fn({ data: { id } }), refetchInterval: 15000 });
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-ticket", id] }); qc.invalidateQueries({ queryKey: ["admin-tickets"] }); };
  if (!data?.ticket) return <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  const t = data.ticket;
  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t.subject}</CardTitle>
          <span className="font-mono text-xs text-muted-foreground">{t.ticket_no}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={t.status} onValueChange={async (v) => { await upd({ data: { id, status: v } }); refresh(); toast.success("Status updated"); }}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{["open","pending","resolved","closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={t.priority} onValueChange={async (v) => { await upd({ data: { id, priority: v } }); refresh(); }}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{["low","normal","high","urgent"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-[45vh] space-y-3 overflow-y-auto rounded-lg border p-3">
          {data.messages.length === 0 ? <p className="text-sm text-muted-foreground">No replies yet.</p> :
            data.messages.map((m: any) => (
              <div key={m.id} className={`rounded-lg p-3 ${m.is_internal ? "border border-dashed border-amber-500/50 bg-amber-500/5" : "bg-muted/50"}`}>
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="font-medium">{nameOf(m.author_id)}</span>
                  {m.is_internal && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Internal</Badge>}
                  <span className="text-muted-foreground">{fmtDate(m.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">{m.body}</div>
              </div>
            ))
          }
        </div>
        <Textarea placeholder="Type reply…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            Internal note (hidden from requester)
          </label>
          <Button disabled={!body.trim()} onClick={async () => {
            try { await rep({ data: { ticket_id: id, body, is_internal: internal } });
              setBody(""); setInternal(false); refresh(); toast.success("Reply sent"); }
            catch (e: any) { toast.error(e.message ?? "Failed"); }
          }}><Send className="mr-1 h-4 w-4" />Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}
