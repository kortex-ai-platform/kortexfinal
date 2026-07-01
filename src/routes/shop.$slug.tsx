import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getPublicProduct } from "@/lib/products.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-product", slug],
    queryFn: () => getPublicProduct({ data: { slug } }),
  });

export const Route = createFileRoute("/shop/$slug")({
  head: ({ loaderData }) => {
    const p = loaderData as Awaited<ReturnType<typeof getPublicProduct>> | undefined;
    const title = p ? `${p.name} — Shop` : "Product";
    const desc = p?.description?.slice(0, 160) ?? "Order this product online.";
    const img = p?.gallery?.[0];
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQuery(params.slug)),
  component: ProductPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-center text-sm text-muted-foreground">Product not found</div>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(productQuery(slug));
  const { t } = useT();
  const [active, setActive] = useState(0);
  const gallery = p.gallery ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/shop" className="text-sm text-muted-foreground hover:underline">
        ← {t("shop.title")}
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
            {gallery[active] ? (
              <img src={gallery[active]} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No image</div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {gallery.map((g, i) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                    i === active ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-3xl font-bold">{p.name}</h1>
            <Badge variant={p.stock > 0 ? "default" : "secondary"}>
              {p.stock > 0 ? t("shop.inStock") : t("shop.outOfStock")}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-primary">৳ {Number(p.price).toFixed(2)}</div>
          {p.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {p.description}
            </p>
          )}
          {p.features && (
            <div>
              <h2 className="text-sm font-semibold">{t("shop.features")}</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{p.features}</p>
            </div>
          )}
          <Button asChild size="lg" disabled={p.stock <= 0} className="w-full sm:w-auto">
            <Link to="/checkout/$slug" params={{ slug: p.slug }}>
              {t("shop.orderNow")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}