import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listFlags, upsertFlag, deleteFlag } from "@/lib/admin-platform.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/feature-flags")({
  head: () => ({ meta: [{ title: "Feature Flags — Admin" }] }),
  component: Page,
});

function FlagForm({ flag, onDone }: { flag?: any; onDone: () => void }) {
  const save = useServerFn(upsertFlag);
  const [form, setForm] = useState({
    id: flag?.id, key: flag?.key ?? "", name: flag?.name ?? "", description: flag?.description ?? "",
    enabled: flag?.enabled ?? false, rollout_percent: flag?.rollout_percent ?? 100,
  });
  return (
    <div className="space-y-3">
      <div>
        <Label>Key</Label>
        <Input value={form.key} disabled={!!flag} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="new_feature_x" />
      </div>
      <div>
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div><div className="font-medium">Enabled</div><div className="text-xs text-muted-foreground">Master switch</div></div>
        <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
      </div>
      <div>
        <div className="mb-2 flex justify-between"><Label>Rollout %</Label><span className="text-sm text-muted-foreground">{form.rollout_percent}%</span></div>
        <Slider value={[form.rollout_percent]} min={0} max={100} step={5} onValueChange={(v) => setForm({ ...form, rollout_percent: v[0] })} />
      </div>
      <DialogFooter>
        <Button onClick={async () => {
          try { await save({ data: form as any }); toast.success("Saved"); onDone(); }
          catch (e: any) { toast.error(e.message ?? "Failed"); }
        }}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function Page() {
  const fn = useServerFn(listFlags);
  const del = useServerFn(deleteFlag);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-flags"], queryFn: () => fn() });
  const [openId, setOpenId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-flags"] });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Feature Flags</h1>
          <p className="mt-1 text-sm text-muted-foreground">Toggle features on/off with gradual rollout.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New Flag</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Create feature flag</DialogTitle></DialogHeader>
            <FlagForm onDone={() => { setOpenNew(false); refresh(); }} />
          </DialogContent>
        </Dialog>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>All flags</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="py-6 text-sm text-muted-foreground">Loading…</div> :
            (data ?? []).length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No flags yet.</p> :
            <div className="space-y-2">
              {(data ?? []).map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{f.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{f.key}</Badge>
                      {f.enabled ? <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">On {f.rollout_percent}%</Badge> : <Badge variant="secondary">Off</Badge>}
                    </div>
                    {f.description && <div className="mt-1 text-xs text-muted-foreground">{f.description}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={openId === f.id} onOpenChange={(o) => setOpenId(o ? f.id : null)}>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Edit flag</DialogTitle></DialogHeader>
                        <FlagForm flag={f} onDone={() => { setOpenId(null); refresh(); }} />
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (!confirm("Delete this flag?")) return;
                      try { await del({ data: { id: f.id } }); toast.success("Deleted"); refresh(); }
                      catch (e: any) { toast.error(e.message ?? "Failed"); }
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
