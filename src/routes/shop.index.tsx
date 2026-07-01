import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublicProducts } from "@/lib/products.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";

const productsQuery = queryOptions({
  queryKey: ["public-products"],
  queryFn: () => listPublicProducts(),
});

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "Shop — kortex Ai" },
      { name: "description", content: "Browse and order our products online." },
      { property: "og:title", content: "Shop — kortex Ai" },
      { property: "og:description", content: "Browse and order our products online." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: ShopPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
});

function ShopPage() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { t } = useT();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{t("shop.title")}</h1>
      {products.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t("shop.empty")}</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              to="/shop/$slug"
              params={{ slug: p.slug }}
              className="group"
            >
              <Card className="overflow-hidden rounded-2xl transition group-hover:border-primary/40">
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {p.gallery?.[0] ? (
                    <img
                      src={p.gallery[0]}
                      alt={p.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{p.name}</h2>
                    <Badge variant={p.stock > 0 ? "default" : "secondary"}>
                      {p.stock > 0 ? t("shop.inStock") : t("shop.outOfStock")}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-primary">৳ {Number(p.price).toFixed(2)}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}