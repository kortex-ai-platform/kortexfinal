import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/images")({
  head: () => ({ meta: [{ title: "Image Generator — kortex Ai" }] }),
  component: () => <ComingSoon title="Image Generator" />,
});