import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const schema = z.object({
  orderNo: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/order-success")({
  validateSearch: zodValidator(schema),
  head: () => ({ meta: [{ title: "Order received" }] }),
  component: SuccessPage,
});

function SuccessPage() {
  const { orderNo } = Route.useSearch();
  const { t } = useT();
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="rounded-2xl">
        <CardContent className="space-y-6 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">{t("checkout.successTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("checkout.successBody")}</p>
          {orderNo && (
            <div className="rounded-xl border bg-muted/40 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("checkout.orderId")}
              </div>
              <div className="mt-1 font-mono text-lg font-semibold">{orderNo}</div>
            </div>
          )}
          <Button asChild variant="outline">
            <Link to="/shop">{t("checkout.continue")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}