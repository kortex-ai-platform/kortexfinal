import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Brain, Plus, RefreshCw, Trash2, Eye, Globe, Facebook, FileText, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  listBrandSources,
  addBrandSource,
  deleteBrandSource,
  syncBrandSource,
  listSourceChunks,
} from "@/lib/brand-memory.functions";
import { listFbPages } from "@/lib/fb-pages.functions";

export const Route = createFileRoute("/_authenticated/brand-memory")({
  head: () => ({ meta: [{ title: "Brand Memory — kortex Ai" }] }),
  component: BrandMemoryPage,
});

const KIND_META: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  fb_page: { label: "Facebook Page", icon: Facebook, color: "text-blue-600" },
  website: { label: "Website", icon: Globe, color: "text-emerald-600" },
  text: { label: "Text / PDF", icon: FileText, color: "text-amber-600" },
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: "bg-muted text-muted-foreground",
    syncing: "bg-blue-500/15 text-blue-600",
    ready: "bg-emerald-500/15 text-emerald-600",
    error: "bg-red-500/15 text-red-600",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${map[status] ?? map.idle}`}>{status}</span>;
}

export function BrandMemoryPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBrandSources);
  const addFn = useServerFn(addBrandSource);
  const delFn = useServerFn(deleteBrandSource);
  const syncFn = useServerFn(syncBrandSource);
  const chunksFn = useServerFn(listSourceChunks);
  const pagesFn = useServerFn(listFbPages);

  const sources = useQuery({ queryKey: ["brand-sources"], queryFn: () => listFn() });
  const pages = useQuery({ queryKey: ["fb-pages-min"], queryFn: () => pagesFn() });

  const [kind, setKind] = useState<"fb_page" | "website" | "text">("website");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [fbPageId, setFbPageId] = useState("");

  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = useQuery({
    queryKey: ["brand-chunks", previewId],
    queryFn: () => chunksFn({ data: { id: previewId! } }),
    enabled: !!previewId,
  });

  const add = useMutation({
    mutationFn: () =>
      addFn({
        data: {
          kind,
          label: label.trim(),
          url: url.trim() || undefined,
          text: text.trim() || undefined,
          fb_page_id: fbPageId || undefined,
        },
      }),
    onSuccess: async (r: any) => {
      toast.success("যোগ হয়েছে");
      setLabel(""); setUrl(""); setText(""); setFbPageId("");
      qc.invalidateQueries({ queryKey: ["brand-sources"] });
      if (kind !== "text" && r?.id) {
        // auto-trigger sync
        try {
          await syncFn({ data: { id: r.id } });
        } catch (e: any) {
          toast.error(e?.message ?? "Sync failed");
        }
        qc.invalidateQueries({ queryKey: ["brand-sources"] });
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const sync = useMutation({
    mutationFn: (id: string) => syncFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Synced");
      qc.invalidateQueries({ queryKey: ["brand-sources"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Sync failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["brand-sources"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Brain className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Brand Memory</h1>
          <p className="text-xs text-muted-foreground">
            Facebook page, website, এবং custom text যোগ করুন — AI প্রতিটা reply-এ এই knowledge ব্যবহার করবে।
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">নতুন source যোগ করুন</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website URL</SelectItem>
                  <SelectItem value="fb_page">Facebook Page (connected)</SelectItem>
                  <SelectItem value="text">Text / PDF থেকে paste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="যেমন: আমাদের ওয়েবসাইট" />
            </div>
          </div>

          {kind === "website" && (
            <div className="space-y-1.5">
              <Label>Website URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/about" />
              <p className="text-[11px] text-muted-foreground">একটা page করে যোগ করুন (about, FAQ, pricing — আলাদা source হিসেবে)।</p>
            </div>
          )}

          {kind === "fb_page" && (
            <div className="space-y-1.5">
              <Label>Connected Page</Label>
              <Select value={fbPageId} onValueChange={setFbPageId}>
                <SelectTrigger>
                  <SelectValue placeholder={pages.data?.length ? "Page select করুন" : "Facebook Integration থেকে আগে page connect করুন"} />
                </SelectTrigger>
                <SelectContent>
                  {(pages.data ?? []).map((p: any) => (
                    <SelectItem key={p.page_id} value={p.page_id}>
                      {p.page_name} ({p.page_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">পেজের সব historical post (caption + image link) AI memory-তে যোগ হবে।</p>
            </div>
          )}

          {kind === "text" && (
            <div className="space-y-1.5">
              <Label>Content (PDF থেকে copy করে paste করুন)</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="যেকোনো brand info, FAQ, product details, return policy ইত্যাদি…"
              />
            </div>
          )}

          <Button
            onClick={() => add.mutate()}
            disabled={
              add.isPending ||
              !label.trim() ||
              (kind === "website" && !url.trim()) ||
              (kind === "fb_page" && !fbPageId) ||
              (kind === "text" && !text.trim())
            }
          >
            {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add source
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {(sources.data ?? []).map((s: any) => {
          const meta = KIND_META[s.kind] ?? KIND_META.text;
          const Icon = meta.icon;
          return (
            <Card key={s.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon className={`h-4 w-4 mt-0.5 ${meta.color}`} />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.label}</div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">{meta.label}</Badge>
                        <StatusBadge status={s.status} />
                        <span>{s.item_count} items</span>
                      </div>
                    </div>
                  </div>
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline truncate max-w-full">
                    <ExternalLink className="h-3 w-3" />{s.url}
                  </a>
                )}
                {s.error && <div className="rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-600">⚠️ {s.error}</div>}
                {s.last_synced_at && <div className="text-[10px] text-muted-foreground">Last synced: {new Date(s.last_synced_at).toLocaleString()}</div>}
                <div className="flex flex-wrap gap-2">
                  {s.kind !== "text" && (
                    <Button size="sm" variant="outline" onClick={() => sync.mutate(s.id)} disabled={sync.isPending}>
                      <RefreshCw className={`mr-1 h-3 w-3 ${sync.isPending ? "animate-spin" : ""}`} />Re-sync
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setPreviewId(s.id)}>
                    <Eye className="mr-1 h-3 w-3" />Preview
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove.mutate(s.id)}>
                    <Trash2 className="mr-1 h-3 w-3" />Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sources.data && sources.data.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              এখনো কোনো brand source যোগ করা হয়নি। উপরে থেকে শুরু করুন।
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={!!previewId} onOpenChange={(o) => !o && setPreviewId(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Source preview</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[calc(100vh-6rem)] pr-3">
            <div className="space-y-3">
              {(preview.data ?? []).map((c: any) => (
                <div key={c.id} className="rounded-lg border p-3">
                  {c.title && <div className="text-xs font-semibold mb-1">{c.title}</div>}
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary mb-1 hover:underline">
                      <ExternalLink className="h-3 w-3" />Open
                    </a>
                  )}
                  <div className="whitespace-pre-wrap text-xs text-foreground">{c.content}</div>
                </div>
              ))}
              {preview.data && preview.data.length === 0 && (
                <div className="text-center text-sm text-muted-foreground">এই source-এ কোনো content নেই। Re-sync করুন।</div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
