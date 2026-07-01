import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/automation")({
  head: () => ({ meta: [{ title: "Automation Rules — kortex Ai" }] }),
  component: () => <ComingSoon title="Automation Rules" />,
});