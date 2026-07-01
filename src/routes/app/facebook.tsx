import { createFileRoute } from "@tanstack/react-router";

import { FacebookPage } from "@/routes/_authenticated/facebook";

export const Route = createFileRoute("/app/facebook")({
  head: () => ({ meta: [{ title: "Facebook Connect — kortex Ai" }] }),
  component: FacebookPage,
});
