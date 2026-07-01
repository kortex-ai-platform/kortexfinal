import { createFileRoute } from "@tanstack/react-router";
import { ProvidersPage } from "@/routes/_authenticated/providers";

export const Route = createFileRoute("/app/providers")({
  head: () => ({ meta: [{ title: "AI Providers — kortex Ai" }] }),
  component: ProvidersPage,
});
