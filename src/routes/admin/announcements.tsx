import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAnnouncements, upsertAnnouncement, deleteAnnouncement } from "@/lib/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/components/admin/data-table";
import { Plus, Trash2, Pencil, Megaphone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Admin" }] }),
  component: Page,
});

function Form({ item, onDone }: { item?: any; onDone: () => void }) {
  const save = useServerFn(upsertAnnouncement);
  const [f, setF] = useState({
    id: item?.id, title: item?.title ?? "", body: item?.body ?? "",
    severity: item?.severity ?? "info", audience: item?.audience ?? "all",
    is_published: item?.is_published ?? false,
    expires_at: item?.expires_at ? String(item.expires_at).slice(0, 16) : "",
  });
  return (
    <div className="space-y-3">
      <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div><Label>Body</Label><Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={4} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Severity</Label>
          <Select value={f.severity} onValueChange={(v) => setF({ ...f, severity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem><SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Audience</Label>
          <Select value={f.audience} onValueChange={(v) => setF({ ...f, audience: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem><SelectItem value="admins">Admins only</SelectItem>
              <SelectItem value="tenants">Tenants only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Expires at (optional)</Label>
        <Input type="datetime-local" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div><div className="font-medium">Publish</div><div className="text-xs text-muted-foreground">Visible to audience immediately</div></div>
        <Switch checked={f.is_published} onCheckedChange={(v) => setF({ ...f, is_published: v })} />
      </div>
      <DialogFooter>
        <Button onClick={async () => {
          try { await save({ data: { ...f, expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null } as any });
            toast.success("Saved"); onDone(); }
          catch (e: any) { toast.error(e.message ?? "Failed"); }
        }}>Save</Button>
      </DialogFooter>
    </div>
  );
}

const sevColor: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  success: "bg-green-500/15 text-green-700 dark:text-green-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function Page() {
  const fn = useServerFn(listAnnouncements);
  const del = useServerFn(deleteAnnouncement);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-ann"], queryFn: () => fn() });
  const [openId, setOpenId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-ann"] });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Broadcast platform-wide messages.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
            <Form onDone={() => { setOpenNew(false); refresh(); }} />
          </DialogContent>
        </Dialog>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>All announcements</CardTitle></CardHeader>
        <CardContent>
          {(data ?? []).length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No announcements yet.</p> :
            <div className="space-y-3">
              {(data ?? []).map((a: any) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{a.title}</span>
                        <Badge className={sevColor[a.severity]}>{a.severity}</Badge>
                        <Badge variant="outline">{a.audience}</Badge>
                        {a.is_published ? <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">Live</Badge> : <Badge variant="secondary">Draft</Badge>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Created {fmtDate(a.created_at)}{a.expires_at ? ` · expires ${fmtDate(a.expires_at)}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={openId === a.id} onOpenChange={(o) => setOpenId(o ? a.id : null)}>
                        <DialogTrigger asChild><Button size="sm" variant="outline"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Edit</DialogTitle></DialogHeader>
                          <Form item={a} onDone={() => { setOpenId(null); refresh(); }} />
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="outline" onClick={async () => {
                        if (!confirm("Delete?")) return;
                        try { await del({ data: { id: a.id } }); toast.success("Deleted"); refresh(); }
                        catch (e: any) { toast.error(e.message ?? "Failed"); }
                      }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
