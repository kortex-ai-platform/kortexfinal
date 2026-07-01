import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pin, Activity, Sparkles } from "lucide-react";

import {
  listProviders,
  upsertProvider,
  setPrimaryProvider,
  toggleProvider,
  pingProvider,
  seedDefaultProviders,
} from "@/lib/providers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/ai-settings")({
  head: () => ({ meta: [{ title: "AI Settings — kortex Ai" }] }),
  component: AiSettingsPage,
});

type Provider = Awaited<ReturnType<typeof listProviders>>[number];

const VENDOR_LABEL: Record<string, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
  grok: "xAI Grok",
};

const VENDOR_MODEL_HINT: Record<string, string> = {
  openrouter: "openai/gpt-4o-mini · anthropic/claude-3.5-sonnet · google/gemini-2.5-flash",
  openai: "gpt-4o-mini · gpt-4o",
  gemini: "gemini-2.5-flash · gemini-2.5-pro",
  claude: "claude-3-5-sonnet-latest",
  grok: "grok-2-latest",
};

export function AiSettingsPage() {
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const r = await listProviders();
      setItems((r as Provider[]).filter((p) => p.category === "text"));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function seed() {
    try {
      const r = await seedDefaultProviders();
      toast.success(`Added ${r.inserted} preset(s)`);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const hasOpenRouter = items.some((p) => p.vendor === "openrouter");
  const isReadOnly = items.length > 0 && items.every((p) => (p as any).readOnly);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">AI Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the text AI providers that power Messenger & comment replies.
            The provider marked PRIMARY is used first; others act as failover.
          </p>
        </div>
        {!isReadOnly && (
          <Button asChild variant="outline">
            <Link to="/providers">Advanced</Link>
          </Button>
        )}
      </div>

      {!hasOpenRouter && !loading && !isReadOnly && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex items-center justify-between gap-3 p-5">
            <div className="text-sm">
              OpenRouter এখনো add করা নেই। 100+ model একটাই API key দিয়ে use করতে seed করুন।
            </div>
            <Button onClick={seed}>
              <Sparkles className="mr-2 h-4 w-4" />
              Seed presets
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {isReadOnly
              ? "Platform admin এখনো কোনো AI provider configure করেননি।"
              : 'কোনো text provider নেই। উপরে "Seed presets" চাপুন।'}
          </CardContent>
        </Card>
      ) : isReadOnly ? (
        items.map((p) => <ReadOnlyProviderRow key={p.id} p={p} />)
      ) : (
        items.map((p) => (
          <ProviderRow key={p.id} p={p} onChange={refresh} />
        ))
      )}
    </div>
  );
}

function ReadOnlyProviderRow({ p }: { p: Provider }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">
            {VENDOR_LABEL[p.vendor] ?? p.name}
          </CardTitle>
          {p.is_primary && <Badge>PRIMARY</Badge>}
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
            Ready
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          Managed by platform
        </span>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <div>Model: <span className="text-foreground">{p.model ?? "—"}</span></div>
        <div>Status: <span className="text-foreground">{p.enabled ? "Active" : "Off"}</span></div>
      </CardContent>
    </Card>
  );
}


function ProviderRow({ p, onChange }: { p: Provider; onChange: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(p.model ?? "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await upsertProvider({
        data: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          vendor: p.vendor as any,
          category: "text",
          base_url: p.base_url ?? null,
          model: model || null,
          api_key: apiKey,
          priority: p.priority,
          weight: p.weight,
          enabled: p.enabled,
          timeout_ms: p.timeout_ms,
          notes: null,
        },
      });
      toast.success("Saved");
      setApiKey("");
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const r: any = await pingProvider({ data: { id: p.id } });
      r.ok ? toast.success(`Online · ${r.responseMs}ms`) : toast.error(r.message || "Failed");
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">
            {VENDOR_LABEL[p.vendor] ?? p.name}
          </CardTitle>
          {p.is_primary && <Badge>PRIMARY</Badge>}
          {!p.hasKey && <Badge variant="outline">No key</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={p.enabled}
            onCheckedChange={async (v) => {
              try {
                await toggleProvider({ data: { id: p.id, enabled: v } });
                onChange();
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
          />
          <span className="text-xs text-muted-foreground">
            {p.enabled ? "Active" : "Off"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>API key</Label>
          <Input
            type="password"
            placeholder={p.hasKey ? p.maskedKey : "Paste API key"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {p.hasKey
              ? `Saved: ${p.maskedKey} — leave blank to keep.`
              : "এখনো কোনো key save করা নেই।"}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Model</Label>
          <Input
            placeholder={VENDOR_MODEL_HINT[p.vendor] ?? "model id"}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          {VENDOR_MODEL_HINT[p.vendor] && (
            <p className="text-xs text-muted-foreground">
              Suggested: {VENDOR_MODEL_HINT[p.vendor]}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" onClick={test} disabled={testing}>
            <Activity className="mr-2 h-4 w-4" />
            {testing ? "Testing…" : "Test connection"}
          </Button>
          {!p.is_primary && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await setPrimaryProvider({ data: { id: p.id } });
                  toast.success("Set as primary");
                  onChange();
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            >
              <Pin className="mr-2 h-4 w-4" />
              Set primary
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
