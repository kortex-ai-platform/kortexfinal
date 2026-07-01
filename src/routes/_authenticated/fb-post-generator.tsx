import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Sparkles, RefreshCw } from "lucide-react";

import { listProductsAdmin } from "@/lib/products.functions";
import { generateFbPost } from "@/lib/fb-posts.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const productsQuery = queryOptions({
  queryKey: ["admin-products"],
  queryFn: () => listProductsAdmin(),
});

export const Route = createFileRoute("/_authenticated/fb-post-generator")({
  head: () => ({ meta: [{ title: "FB Post Generator — kortex Ai" }] }),
  component: FbPostGeneratorPage,
});

type Tone = "sales" | "professional" | "premium" | "emotional" | "festival";

const TONES: { value: Tone; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "professional", label: "Professional" },
  { value: "premium", label: "Premium" },
  { value: "emotional", label: "Emotional" },
  { value: "festival", label: "Festival" },
];

function FbPostGeneratorPage() {
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const generate = useServerFn(generateFbPost);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("sales");

  const mutation = useMutation({
    mutationFn: (vars: { productId: string; tone: Tone }) =>
      generate({ data: vars }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const result = mutation.data;

  function runGenerate() {
    if (!selectedId) return toast.error("Pick a product first");
    mutation.mutate({ productId: selectedId, tone });
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Copy failed"),
    );
  }

  function copyAll() {
    if (!result) return;
    const text = [
      "=== TITLES ===",
      ...result.titles.map((t, i) => `${i + 1}. ${t}`),
      "",
      "=== DESCRIPTIONS ===",
      ...result.descriptions.map((d) => `[${d.length.toUpperCase()}]\n${d.text}`),
    ].join("\n");
    copy(text, "All content");
  }

  const activeProducts = products.filter((p) => p.status === "active");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Facebook Post Generator</h1>
          <p className="text-sm text-muted-foreground">
            Pick a product, choose a tone, and generate high-converting Bengali post copy.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left: product list */}
        <Card className="rounded-2xl">
          <CardContent className="p-3">
            <div className="mb-2 px-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Products
            </div>
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : activeProducts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No active products. Add one from Products.
              </div>
            ) : (
              <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
                {activeProducts.map((p) => {
                  const active = selectedId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {p.gallery?.[0] && (
                            <img
                              src={p.gallery[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            ৳ {Number(p.price).toFixed(2)}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right: tone + results */}
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Tone</div>
                <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={runGenerate}
                disabled={!selectedId || mutation.isPending}
              >
                {result ? (
                  <RefreshCw className="mr-2 h-4 w-4" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {mutation.isPending
                  ? "Generating…"
                  : result
                    ? "Regenerate"
                    : "Generate"}
              </Button>
              {result && (
                <Button variant="outline" onClick={copyAll}>
                  <Copy className="mr-2 h-4 w-4" /> Copy all
                </Button>
              )}
            </CardContent>
          </Card>

          {mutation.isPending && (
            <Card className="rounded-2xl">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Crafting high-converting copy…
              </CardContent>
            </Card>
          )}

          {!mutation.isPending && !result && (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Select a product on the left and click Generate.
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              <Card className="rounded-2xl">
                <CardContent className="space-y-3 p-4">
                  <div className="text-sm font-semibold">High-Converting Titles</div>
                  <ul className="space-y-2">
                    {result.titles.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-xl border bg-card/50 p-3"
                      >
                        <span className="text-sm leading-relaxed">{t}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copy(t, `Title ${i + 1}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardContent className="space-y-4 p-4">
                  <div className="text-sm font-semibold">Facebook Post Descriptions</div>
                  {result.descriptions.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-xl border bg-card/50 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {d.length}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copy(d.text, `${d.length} description`)}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                      </div>
                      <p className="whitespace-pre-line text-sm leading-relaxed">
                        {d.text}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}