import { createFileRoute } from "@tanstack/react-router";
import { OrdersAdmin } from "@/routes/_authenticated/orders";

export const Route = createFileRoute("/app/orders")({
  head: () => ({ meta: [{ title: "Orders — kortex Ai" }] }),
  component: OrdersAdmin,
});
