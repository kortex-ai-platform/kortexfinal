import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChevronUp,
  ChevronDown,
  Pin,
  Pencil,
  Trash2,
  Activity,
  Plus,
  PlayCircle,
  Sparkles,
} from "lucide-react";

import {
  listProviders,
  upsertProvider,
  deleteProvider,
  toggleProvider,
  setPrimaryProvider,
  reorderProvider,
  pingProvider,
  runTestPrompt,
  seedDefaultProviders,
} from "@/lib/providers.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/providers")({
  head: () => ({ meta: [{ title: "AI Providers — kortex Ai" }] }),
  component: ProvidersPage,
});

type Category = "text" | "image" | "voice_tts" | "voice_stt";
type Vendor =
  | "gemini"
  | "openai"
  | "grok"
  | "claude"
  | "openrouter"
  | "openai_image"
  | "stability"
  | "openai_tts"
  | "openai_stt"
  | "elevenlabs";

const VENDOR_OPTIONS: { value: Vendor; label: string; category: Category }[] = [
  { value: "openrouter", label: "OpenRouter (100+ models)", category: "text" },
  { value: "gemini", label: "Google Gemini", category: "text" },
  { value: "openai", label: "OpenAI (Chat)", category: "text" },
  { value: "claude", label: "Anthropic Claude", category: "text" },
  { value: "grok", label: "xAI Grok", category: "text" },
  { value: "openai_image", label: "OpenAI Image", category: "image" },
  { value: "stability", label: "Stability AI", category: "image" },
  { value: "openai_tts", label: "OpenAI TTS", category: "voice_tts" },
  { value: "elevenlabs", label: "ElevenLabs", category: "voice_tts" },
  { value: "openai_stt", label: "OpenAI Whisper", category: "voice_stt" },
];

const CATEGORY_LABEL: Record<Category, string> = {
  text: "Text AI",
  image: "Image AI",
  voice_tts: "Voice (TTS)",
  voice_stt: "Voice (STT)",
};

type Provider = Awaited<ReturnType<typeof listProviders>>[number];

function statusColor(status?: string) {
  switch (status) {
    case "online":
      return "bg-emerald-500";
    case "degraded":
      return "bg-amber-500";
    case "offline":
      return "bg-red-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-muted-foreground/40";
  }
}

export function ProvidersPage() {
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Category>("text");
  const [editing, setEditing] = useState<Partial<Provider> | null>(null);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    try {
      const r = await listProviders();
      setItems(r as any);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  const grouped = (cat: Category) => items.filter((i) => i.category === cat);

  async function onSeed() {
    try {
      const r = await seedDefaultProviders();
      toast.success(`Added ${r.inserted} preset provider(s)`);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">AI Providers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure multiple AI providers per category. The router uses
            priority order with automatic failover when one is down.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSeed}>
            <Sparkles className="mr-2 h-4 w-4" />
            Seed presets
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add provider
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Category)}>
        <TabsList>
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <TabsTrigger key={c} value={c}>
              {CATEGORY_LABEL[c]} ({grouped(c).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
          <TabsContent key={c} value={c} className="space-y-3 pt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : grouped(c).length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No providers in this category yet. Use “Add provider” or
                  “Seed presets”.
                </CardContent>
              </Card>
            ) : (
              grouped(c).map((p) => (
                <ProviderCard
                  key={p.id}
                  p={p}
                  onChange={refresh}
                  onEdit={() => setEditing(p)}
                />
              ))
            )}
            {c === "text" && grouped(c).length > 0 && <TestPlayground />}
          </TabsContent>
        ))}
      </Tabs>

      <EditDialog
        open={creating || Boolean(editing)}
        initial={editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          refresh();
        }}
      />
    </div>
  );
}

function ProviderCard({
  p,
  onChange,
  onEdit,
}: {
  p: Provider;
  onChange: () => void;
  onEdit: () => void;
}) {
  const h = p.health as any;
  const total = (h?.success_count ?? 0) + (h?.failure_count ?? 0);
  const last =
    h?.last_success_at &&
    new Date(h.last_success_at).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });

  async function act(fn: () => Promise<any>, msg?: string) {
    try {
      await fn();
      if (msg) toast.success(msg);
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Header: name + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`mt-1 h-3 w-3 shrink-0 rounded-full ${statusColor(h?.status)}`}
              title={h?.status ?? "unknown"}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{p.name}</h3>
                {p.is_primary && (
                  <Badge variant="default" className="h-5 text-[10px]">
                    PRIMARY
                  </Badge>
                )}
                {!p.hasKey && (
                  <Badge variant="outline" className="h-5 text-[10px]">
                    No key
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {p.vendor} · {p.model || "default model"} · priority {p.priority}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1">
            <Switch
              checked={p.enabled}
              onCheckedChange={(v) =>
                act(
                  () => toggleProvider({ data: { id: p.id, enabled: v } }),
                  v ? "Enabled" : "Disabled",
                )
              }
            />
            <span className="text-xs text-muted-foreground">
              {p.enabled ? "Active" : "Off"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-xs sm:grid-cols-4">
          <Stat label="Status" value={h?.status ?? "unknown"} />
          <Stat
            label="Avg response"
            value={h?.avg_response_ms ? `${h.avg_response_ms}ms` : "—"}
          />
          <Stat label="Requests" value={`${total}`} />
          <Stat
            label="Failures"
            value={`${h?.failure_count ?? 0}`}
            tone={(h?.failure_count ?? 0) > 0 ? "danger" : undefined}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] text-muted-foreground">
            Last success: {last ?? "never"}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Move up"
              onClick={() =>
                act(() =>
                  reorderProvider({ data: { id: p.id, direction: "up" } }),
                )
              }
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Move down"
              onClick={() =>
                act(() =>
                  reorderProvider({ data: { id: p.id, direction: "down" } }),
                )
              }
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Pin as primary"
              onClick={() =>
                act(
                  () => setPrimaryProvider({ data: { id: p.id } }),
                  "Set as primary",
                )
              }
            >
              <Pin className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Test connection"
              onClick={async () => {
                try {
                  const r: any = await pingProvider({ data: { id: p.id } });
                  r.ok
                    ? toast.success(`Online · ${r.responseMs}ms`)
                    : toast.error(r.message || "Failed");
                  onChange();
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            >
              <Activity className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" title="Edit" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Delete"
              onClick={() => {
                if (confirm(`Delete ${p.name}?`))
                  act(
                    () => deleteProvider({ data: { id: p.id } }),
                    "Deleted",
                  );
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`text-sm font-medium ${tone === "danger" ? "text-red-500" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function EditDialog({
  open,
  initial,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initial: Partial<Provider> | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const blank = {
    name: "",
    slug: "",
    vendor: "gemini" as Vendor,
    category: "text" as Category,
    base_url: "",
    model: "",
    api_key: "",
    priority: 100,
    weight: 1,
    enabled: true,
    timeout_ms: 30000,
    notes: "",
  };
  const [form, setForm] = useState<any>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial && initial.id) {
      setForm({
        ...blank,
        ...initial,
        api_key: "",
        base_url: initial.base_url ?? "",
        model: initial.model ?? "",
        notes: initial.notes ?? "",
      });
    } else {
      setForm(blank);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  function update<K extends string>(k: K, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      await upsertProvider({
        data: {
          id: initial?.id,
          name: form.name,
          slug: form.slug || form.vendor + "-" + Date.now(),
          vendor: form.vendor,
          category: form.category,
          base_url: form.base_url || null,
          model: form.model || null,
          api_key: form.api_key,
          priority: Number(form.priority),
          weight: Number(form.weight),
          enabled: Boolean(form.enabled),
          timeout_ms: Number(form.timeout_ms),
          notes: form.notes || null,
        },
      });
      toast.success("Saved");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? "Edit provider" : "Add provider"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vendor</Label>
              <Select
                value={form.vendor}
                onValueChange={(v) => {
                  const opt = VENDOR_OPTIONS.find((o) => o.value === v)!;
                  update("vendor", v);
                  update("category", opt.category);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => update("category", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Display name</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Gemini production key"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => update("slug", e.target.value)}
                placeholder="auto if empty"
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder="vendor default if empty"
              />
            </div>
          </div>
          <div>
            <Label>API key</Label>
            <Input
              type="password"
              value={form.api_key}
              onChange={(e) => update("api_key", e.target.value)}
              placeholder={
                initial?.id
                  ? "Leave blank to keep existing key"
                  : "Paste API key"
              }
            />
          </div>
          <div>
            <Label>Base URL (optional)</Label>
            <Input
              value={form.base_url}
              onChange={(e) => update("base_url", e.target.value)}
              placeholder="Override vendor default endpoint"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Priority</Label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => update("priority", e.target.value)}
              />
            </div>
            <div>
              <Label>Weight</Label>
              <Input
                type="number"
                value={form.weight}
                onChange={(e) => update("weight", e.target.value)}
              />
            </div>
            <div>
              <Label>Timeout (ms)</Label>
              <Input
                type="number"
                value={form.timeout_ms}
                onChange={(e) => update("timeout_ms", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => update("enabled", v)}
            />
            <span className="text-sm">Enabled</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestPlayground() {
  const [prompt, setPrompt] = useState("Hello! Reply with a one-line greeting.");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const r = await runTestPrompt({
        data: { category: "text", prompt },
      });
      setResult(r);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="rounded-2xl border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlayCircle className="h-4 w-4" />
          Failover test playground
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
        />
        <Button onClick={run} disabled={running}>
          {running ? "Running…" : "Send test prompt"}
        </Button>
        {result && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                Answered by{" "}
                <span className="font-semibold text-foreground">
                  {result.providerName}
                </span>
              </span>
              <span>{result.responseMs}ms</span>
              <span>{result.attempts} attempt(s)</span>
              {result.failovers?.length > 0 && (
                <span className="text-amber-500">
                  Failed over from: {result.failovers.join(" → ")}
                </span>
              )}
            </div>
            {result.text && (
              <p className="whitespace-pre-wrap text-foreground">
                {result.text}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
