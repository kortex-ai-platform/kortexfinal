import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, ShoppingBag, Facebook, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview — kortex Ai" }] }),
  component: Overview,
});

const widgets = [
  { label: "Total messages", value: "0", icon: MessageSquare, hint: "Connect a Page to start" },
  { label: "Total orders", value: "0", icon: ShoppingBag, hint: "Orders module coming soon" },
  { label: "Connected Pages", value: "0", icon: Facebook, hint: "Facebook integration coming soon" },
  { label: "AI replies today", value: "0", icon: Sparkles, hint: "Configure AI Settings" },
];

function Overview() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your business at a glance. Connect a Facebook Page to start seeing live data.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {widgets.map((w) => (
          <Card key={w.label} className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {w.label}
              </CardTitle>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <w.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-bold">{w.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{w.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Get started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Add your Gemini API key in <strong>AI Settings</strong>.</p>
          <p>2. Write your business prompt in <strong>Prompt Manager</strong>.</p>
          <p>3. Connect a Facebook Page (coming soon) to go live.</p>
        </CardContent>
      </Card>
    </div>
  );
}