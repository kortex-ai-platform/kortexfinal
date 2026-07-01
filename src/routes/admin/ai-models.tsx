import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAiModels } from "@/lib/admin-views.functions";
import { upsertProvider, toggleProvider, createModel, toggleModel, deleteModel, seedDefaultModels } from "@/lib/admin-mutations.functions";
import { AdminTable, fmtDate } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ai-models")({
  head: () => ({ meta: [{ title: "AI Models — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listAiModels);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-ai"], queryFn: () => fn() });
  const refetch = () => qc.invalidateQueries({ queryKey: ["admin-ai"] });

  const toggleProvFn = useServerFn(toggleProvider);
  const toggleModFn = useServerFn(toggleModel);
  const deleteModFn = useServerFn(deleteModel);
  const seedFn = useServerFn(seedDefaultModels);

  const toggleProvMut = useMutation({ mutationFn: (d: { id: string; enabled: boolean }) => toggleProvFn({ data: d }), onSuccess: refetch });
  const toggleModMut = useMutation({ mutationFn: (d: { id: string; is_active: boolean }) => toggleModFn({ data: d }), onSuccess: refetch });
  const deleteModMut = useMutation({ mutationFn: (id: string) => deleteModFn({ data: { id } }), onSuccess: () => { toast.success("Model deleted"); refetch(); } });
  const seedMut = useMutation({ mutationFn: () => seedFn(), onSuccess: (r: any) => { toast.success(`Seeded ${r?.inserted ?? 0} models`); refetch(); }, onError: (e: any) => toast.error(e.message) });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  const providers = data?.providers ?? [];
  const models = data?.models ?? [];
  const usage = data?.usage ?? [];

  const totalTokens = usage.reduce((s: number, u: any) => s + (u.total_tokens || 0), 0);
  const totalCost = usage.reduce((s: number, u: any) => s + (u.cost_cents || 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">AI Providers & Models</h1>
          <p className="text-sm text-muted-foreground">
            {totalTokens.toLocaleString()} tokens • ${(totalCost / 100).toFixed(2)} spent (last 100 days)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>Seed default models</Button>
          <ProviderDialog onSaved={refetch} />
          <ModelDialog providers={providers} onSaved={refetch} />
        </div>
      </div>

      <AdminTable
        title="Providers"
        rows={providers}
        cols={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "vendor", label: "Vendor" },
          { key: "has_key", label: "API key", render: (r: any) => (r.has_key ? <Badge>Set</Badge> : <Badge variant="outline">Missing</Badge>) },
          { key: "enabled", label: "Active", render: (r: any) => (r.enabled ? "Yes" : "No") },
          { key: "actions", label: "", render: (r: any) => (
            <div className="flex gap-2 justify-end">
              <ProviderDialog initial={r} onSaved={refetch} />
              <Button size="sm" variant="outline" onClick={() => toggleProvMut.mutate({ id: r.id, enabled: !r.enabled })}>{r.enabled ? "Disable" : "Enable"}</Button>
            </div>
          )},
        ]}
      />
      <AdminTable
        title="Models catalog"
        rows={models}
        cols={[
          { key: "display_name", label: "Model" },
          { key: "slug", label: "Slug" },
          { key: "context_window", label: "Context" },
          { key: "is_active", label: "Active", render: (r: any) => (r.is_active ? "Yes" : "No") },
          { key: "actions", label: "", render: (r: any) => (
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => toggleModMut.mutate({ id: r.id, is_active: !r.is_active })}>{r.is_active ? "Disable" : "Enable"}</Button>
              <Button size="sm" variant="destructive" onClick={() => confirm(`Delete model "${r.display_name}"?`) && deleteModMut.mutate(r.id)}>Delete</Button>
            </div>
          )},
        ]}
      />
      <AdminTable
        title="Usage (daily rollup)"
        rows={usage}
        cols={[
          { key: "usage_date", label: "Date", render: (r: any) => fmtDate(r.usage_date) },
          { key: "model_slug", label: "Model" },
          { key: "request_count", label: "Requests" },
          { key: "total_tokens", label: "Tokens" },
          { key: "cost_cents", label: "Cost", render: (r: any) => `$${((r.cost_cents || 0) / 100).toFixed(4)}` },
        ]}
      />
    </div>
  );
}

function ProviderDialog({ initial, onSaved }: { initial?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [vendor, setVendor] = useState(initial?.vendor || "openrouter");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial?.base_url || "");
  const save = useServerFn(upsertProvider);
  const mut = useMutation({
    mutationFn: () => save({ data: { id: initial?.id, name, slug, vendor, api_key: apiKey || undefined, base_url: baseUrl || undefined } }),
    onSuccess: () => { toast.success("Saved"); setOpen(false); setApiKey(""); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{initial ? <Button size="sm" variant="outline">Edit</Button> : <Button>New provider</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit" : "New"} provider</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="OpenRouter" /></div>
          <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="openrouter" /></div>
          <div>
            <Label>Vendor</Label>
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="lovable">Lovable AI</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Base URL (optional)</Label><Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" /></div>
          <div><Label>API key {initial && <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>}</Label><Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." /></div>
        </div>
        <DialogFooter><Button onClick={() => mut.mutate()} disabled={!name || !slug || mut.isPending}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModelDialog({ providers, onSaved }: { providers: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ctx, setCtx] = useState("");
  const create = useServerFn(createModel);
  const mut = useMutation({
    mutationFn: () => create({ data: { provider_id: providerId, slug, display_name: displayName, context_window: ctx ? parseInt(ctx) : undefined } }),
    onSuccess: () => { toast.success("Model added"); setOpen(false); setSlug(""); setDisplayName(""); setCtx(""); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">New model</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add model</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Provider</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
              <SelectContent>{providers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="GPT-4o" /></div>
          <div><Label>Slug (vendor/model id)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="openai/gpt-4o" /></div>
          <div><Label>Context window (tokens, optional)</Label><Input type="number" value={ctx} onChange={(e) => setCtx(e.target.value)} placeholder="128000" /></div>
        </div>
        <DialogFooter><Button onClick={() => mut.mutate()} disabled={!providerId || !slug || !displayName || mut.isPending}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
