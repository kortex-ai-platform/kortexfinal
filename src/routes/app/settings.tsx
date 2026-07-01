import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/routes/_authenticated/settings";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Workspace — kortex Ai" }] }),
  component: SettingsPage,
});
