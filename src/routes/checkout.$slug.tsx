import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getPublicProduct } from "@/lib/products.functions";
import { createOrder } from "@/lib/orders.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-product", slug],
    queryFn: () => getPublicProduct({ data: { slug } }),
  });

export const Route = createFileRoute("/checkout/$slug")({
  head: () => ({ meta: [{ title: "Checkout" }] }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQuery(params.slug)),
  component: CheckoutPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
});

function CheckoutPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(productQuery(slug));
  const navigate = useNavigate();
  const { t } = useT();

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    district: "",
    area: "",
    quantity: 1,
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const total = Number(p.price) * form.quantity;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createOrder({
        data: {
          productId: p.id,
          quantity: form.quantity,
          customerName: form.customerName,
          phone: form.phone,
          address: form.address,
          district: form.district,
          area: form.area,
          note: form.note || undefined,
        },
      });
      navigate({ to: "/order-success", search: { orderNo: res.orderNo } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/shop/$slug" params={{ slug }} className="text-sm text-muted-foreground hover:underline">
        ← {p.name}
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">{t("checkout.title")}</h1>

      <Card className="mt-6 rounded-2xl">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-4 border-b pb-4">
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-muted">
              {p.gallery?.[0] && (
                <img src={p.gallery[0]} alt={p.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-muted-foreground">৳ {Number(p.price).toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-primary">৳ {total.toFixed(2)}</div>
            </div>
          </div>

          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">{t("checkout.name")} *</Label>
              <Input
                id="name"
                required
                maxLength={120}
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("checkout.phone")} *</Label>
              <Input
                id="phone"
                required
                maxLength={40}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="qty">{t("checkout.quantity")} *</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={999}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value)) })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="addr">{t("checkout.address")} *</Label>
              <Textarea
                id="addr"
                required
                rows={2}
                maxLength={500}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="district">{t("checkout.district")}</Label>
              <Input
                id="district"
                maxLength={120}
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="area">{t("checkout.area")}</Label>
              <Input
                id="area"
                maxLength={120}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="note">{t("checkout.note")}</Label>
              <Textarea
                id="note"
                rows={2}
                maxLength={1000}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" disabled={submitting} className="w-full">
                {submitting ? t("checkout.submitting") : t("checkout.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}