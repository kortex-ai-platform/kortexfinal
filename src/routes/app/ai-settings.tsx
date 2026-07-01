import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, CheckCircle2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/ai-settings")({
  head: () => ({ meta: [{ title: "AI Settings — kortex Ai" }] }),
  component: AiSettingsReadyPage,
});

function AiSettingsReadyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">AI Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messenger ও comment reply-এর AI আমাদের platform থেকেই configure করা।
          আপনাকে কোনো API key বা model add করতে হবে না।
        </p>
      </div>

      <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">AI Engine</CardTitle>
            <Badge className="bg-emerald-500 hover:bg-emerald-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Ready
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">Managed by platform</span>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">100+ model access</div>
              <div className="text-muted-foreground">
                OpenRouter দিয়ে GPT-4o, Claude, Gemini সহ সব model auto-connect করা।
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
            <Zap className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">Auto failover</div>
              <div className="text-muted-foreground">
                একটা provider down হলে system নিজেই backup model-এ switch করে দেবে।
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Custom AI configuration লাগলে platform admin-এর সাথে যোগাযোগ করুন।
      </p>
    </div>
  );
}
