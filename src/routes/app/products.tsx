import { createFileRoute } from "@tanstack/react-router";
import { ProductsAdmin } from "@/routes/_authenticated/products";

export const Route = createFileRoute("/app/products")({
  head: () => ({ meta: [{ title: "Products — kortex Ai" }] }),
  component: ProductsAdmin,
});
