import { createFileRoute } from "@tanstack/react-router";
import { ChatsPage } from "@/routes/_authenticated/chats";

export const Route = createFileRoute("/app/chats")({
  head: () => ({ meta: [{ title: "Messages — kortex Ai" }] }),
  component: ChatsPage,
});
