import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Facebook,
  Brain,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — kortex Ai" }] }),
  component: Onboarding,
});

type StepStatus = { done: boolean; detail: string };

async function fetchProgress(): Promise<{
  facebook: StepStatus;
  brand: StepStatus;
  ai: StepStatus;
}> {
  const [pages, sources, settings] = await Promise.all([
    supabase
      .from("fb_pages")
      .select("id, name", { count: "exact" })
      .limit(3),
    supabase
      .from("brand_memory_sources")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("ai_settings")
      .select("model, temperature, max_tokens")
      .maybeSingle(),
  ]);

  const pageCount = pages.count ?? pages.data?.length ?? 0;
  const sourceCount = sources.count ?? 0;
  const model = settings.data?.model ?? "";

  return {
    facebook: {
      done: pageCount > 0,
      detail:
        pageCount > 0
          ? `${pageCount} page${pageCount > 1 ? "s" : ""} connected`
          : "No page connected yet",
    },
    brand: {
      done: sourceCount > 0,
      detail:
        sourceCount > 0
          ? `${sourceCount} knowledge source${sourceCount > 1 ? "s" : ""} added`
          : "No knowledge added yet",
    },
    ai: {
      done: !!model,
      detail: model ? `Model: ${model}` : "Default model — customize anytime",
    },
  };
}

function Onboarding() {
  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: fetchProgress,
    refetchOnWindowFocus: true,
  });

  const steps = [
    {
      key: "facebook" as const,
      icon: Facebook,
      title: "Connect your Facebook Page",
      desc: "Link your Page with App ID, App Secret, Callback URL & access token. Your AI will start replying to messages and comments instantly.",
      to: "/app/facebook" as const,
      cta: "Connect Page",
    },
    {
      key: "brand" as const,
      icon: Brain,
      title: "Train your Brand Memory",
      desc: "Add your website URL, PDFs, or text so the AI answers in your brand's voice without hallucinating.",
      to: "/app/brand-memory" as const,
      cta: "Add knowledge",
    },
    {
      key: "ai" as const,
      icon: Sparkles,
      title: "Tune AI behaviour",
      desc: "Pick model, tone, temperature & response length. Use the platform key, or plug your own OpenRouter / OpenAI key.",
      to: "/app/ai-settings" as const,
      cta: "Open AI Settings",
    },
  ];

  const completed = data
    ? steps.filter((s) => data[s.key].done).length
    : 0;
  const percent = Math.round((completed / steps.length) * 100);
  const allDone = !!data && completed === steps.length;

  const navigate = useNavigate();
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(() => {
      navigate({ to: "/app/dashboard", replace: true });
    }, 1500);
    return () => clearTimeout(t);
  }, [allDone, navigate]);



  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          <span>Your workspace is ready</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to kortex Ai 👋
        </h1>
        <p className="text-muted-foreground">
          Three short steps and your AI assistant will be live on Facebook.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Setup progress
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {isLoading ? "Checking…" : `${completed} / ${steps.length} complete`}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={isLoading ? 0 : percent} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {steps.map((s) => {
          const status = data?.[s.key];
          const done = !!status?.done;
          return (
            <Card
              key={s.key}
              className={cn(
                "transition-colors",
                done && "border-primary/40 bg-primary/[0.03]",
              )}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-lg",
                      done
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <s.icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {s.title}
                      {done ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                          Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Circle className="h-2.5 w-2.5" />
                          Pending
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{s.desc}</CardDescription>
                    {status && (
                      <p
                        className={cn(
                          "mt-2 text-xs",
                          done ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {status.detail}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant={done ? "outline" : "default"}>
                  <Link to={s.to}>
                    {done ? "Manage" : s.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Button variant="ghost" asChild>
          <Link to="/app/facebook">Skip — take me to Facebook</Link>
        </Button>
      </div>
    </div>
  );
}
