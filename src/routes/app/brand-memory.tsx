import { createFileRoute } from "@tanstack/react-router";
import { BrandMemoryPage } from "@/routes/_authenticated/brand-memory";

export const Route = createFileRoute("/app/brand-memory")({
  head: () => ({ meta: [{ title: "Brand Memory — kortex Ai" }] }),
  component: BrandMemoryPage,
});
