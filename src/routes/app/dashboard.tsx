import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Facebook,
  Brain,
  Sparkles,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
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

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — kortex Ai" }] }),
  component: AppDashboard,
});

function AppDashboard() {
  const { data } = useQuery({
    queryKey: ["app-dashboard-stats"],
    queryFn: async () => {
      const [pages, sources, convos] = await Promise.all([
        supabase.from("fb_pages").select("id", { count: "exact", head: true }),
        supabase
          .from("brand_memory_sources")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("fb_conversations")
          .select("id", { count: "exact", head: true }),
      ]);
      return {
        pages: pages.count ?? 0,
        sources: sources.count ?? 0,
        convos: convos.count ?? 0,
      };
    },
  });

  const cards = [
    {
      label: "Connected Pages",
      value: data?.pages ?? "—",
      to: "/app/facebook" as const,
      icon: Facebook,
    },
    {
      label: "Brand Memory",
      value: data?.sources ?? "—",
      to: "/app/brand-memory" as const,
      icon: Brain,
    },
    {
      label: "Conversations",
      value: data?.convos ?? "—",
      to: "/app/chats" as const,
      icon: MessageSquare,
    },
    {
      label: "AI Settings",
      value: "Open",
      to: "/app/ai-settings" as const,
      icon: Sparkles,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          <span>Setup complete</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Your Workspace</h1>
        <p className="text-muted-foreground">
          Everything is live. Jump into any area below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.to}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>{c.label}</CardDescription>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{c.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to={c.to}>
                  Open
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
