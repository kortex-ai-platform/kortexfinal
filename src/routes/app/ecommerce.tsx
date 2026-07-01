import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShoppingCart, Package, Layers, Image as ImageIcon, ReceiptText, CreditCard,
  TrendingUp, Plus, Trash2, Pencil, Search, Clock,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  listMyEcommerce, createMyProduct, updateMyProduct, deleteMyProduct,
  addMyProductImage, updateMyOrderStatus,
} from "@/lib/user-ecommerce.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const opts = queryOptions({
  queryKey: ["app", "ecommerce"],
  queryFn: () => listMyEcommerce(),
});

export const Route = createFileRoute("/app/ecommerce")({
  ssr: false,
  head: () => ({ meta: [{ title: "E-commerce — kortex Ai" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: EcommerceHub,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Error: {String(error)}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function money(n: number, currency = "BDT") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function StatCard({ icon: Icon, label, value, tone = "primary" }: { icon: any; label: string; value: React.ReactNode; tone?: "primary" | "success" | "warning" }) {
  const bg = tone === "success" ? "bg-emerald-500/10 text-emerald-600" : tone === "warning" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${bg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductDialog({ product, onDone }: { product?: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState<string>(product?.price?.toString() ?? "");
  const [stock, setStock] = useState<string>(product?.stock?.toString() ?? "0");
  const [status, setStatus] = useState<string>(product?.status ?? "active");
  const [saving, setSaving] = useState(false);

  const create = useServerFn(createMyProduct);
  const update = useServerFn(updateMyProduct);

  async function save() {
    if (!name.trim() || !price) { toast.error("Name & price required"); return; }
    setSaving(true);
    try {
      if (product) {
        await update({ data: { id: product.id, name, description, price: Number(price), stock: Number(stock), status } });
        toast.success("Product updated");
      } else {
        await create({ data: { name, description, price: Number(price), stock: Number(stock), status } });
        toast.success("Product added");
      }
      setOpen(false);
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New product</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Price (BDT)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} /></div>
            <div><Label>Stock</Label><Input type="number" value={stock} onChange={e => setStock(e.target.value)} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddImageDialog({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [primary, setPrimary] = useState(false);
  const add = useServerFn(addMyProductImage);
  async function save() {
    if (!url.trim()) return;
    try {
      await add({ data: { product_id: productId, url, is_primary: primary } });
      toast.success("Image added");
      setUrl(""); setOpen(false); onDone();
    } catch (e: any) { toast.error(e.message); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><ImageIcon className="mr-1 h-4 w-4" /> Image</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add product image</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Image URL</Label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} />
            Set as primary
          </label>
        </div>
        <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EcommerceHub() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["app", "ecommerce"] });
  const del = useServerFn(deleteMyProduct);
  const updateStatus = useServerFn(updateMyOrderStatus);

  const { stats, products, variants, images, orders, items, payments } = data;
  const [q, setQ] = useState("");
  const filteredProducts = products.filter((p: any) => p.name?.toLowerCase().includes(q.toLowerCase()));
  const filteredOrders = orders.filter((o: any) =>
    !q || o.order_no?.toLowerCase().includes(q.toLowerCase()) || o.customer_name?.toLowerCase().includes(q.toLowerCase())
  );

  const imagesByProduct = new Map<string, any[]>();
  images.forEach((im: any) => {
    const list = imagesByProduct.get(im.product_id) ?? [];
    list.push(im);
    imagesByProduct.set(im.product_id, list);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🛒 E-commerce</h1>
          <p className="text-sm text-muted-foreground">Manage your brand's products, images, orders and payments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products / orders" className="w-64 pl-8" />
          </div>
          <ProductDialog onDone={refresh} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <StatCard icon={Package} label="Products" value={stats.products} />
        <StatCard icon={Layers} label="Variants" value={stats.variants} />
        <StatCard icon={ImageIcon} label="Images" value={stats.images} />
        <StatCard icon={ShoppingCart} label="Orders" value={stats.orders} />
        <StatCard icon={Clock} label="Pending" value={stats.pendingOrders} tone="warning" />
        <StatCard icon={CreditCard} label="Payments" value={stats.payments} />
        <StatCard icon={TrendingUp} label="Sales" value={money(stats.salesTotal)} tone="success" />
        <StatCard icon={TrendingUp} label="Paid" value={money(stats.paidTotal)} tone="success" />
      </div>

      <Tabs defaultValue="products">
        <TabsList className="flex-wrap">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="images">Gallery</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="items">Order items</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card><CardHeader><CardTitle>Products ({filteredProducts.length})</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Image</TableHead><TableHead>Name</TableHead><TableHead>Price</TableHead>
                <TableHead>Stock</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredProducts.map((p: any) => {
                  const imgs = imagesByProduct.get(p.id) ?? [];
                  const primary = imgs.find(i => i.is_primary) ?? imgs[0];
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                          {primary && <img src={primary.url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.slug}</div>
                      </TableCell>
                      <TableCell>{money(Number(p.price))}</TableCell>
                      <TableCell>{p.stock}</TableCell>
                      <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                      <TableCell className="flex justify-end gap-1">
                        <AddImageDialog productId={p.id} onDone={refresh} />
                        <ProductDialog product={p} onDone={refresh} />
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!confirm(`Delete ${p.name}?`)) return;
                          try { await del({ data: { id: p.id } }); toast.success("Deleted"); refresh(); }
                          catch (e: any) { toast.error(e.message); }
                        }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredProducts.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No products yet — click "New product" to add one</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="variants">
          <Card><CardHeader><CardTitle>Variants ({variants.length})</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>Price</TableHead>
                <TableHead>Stock</TableHead><TableHead>Active</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {variants.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.name}</TableCell>
                    <TableCell className="font-mono text-xs">{v.sku ?? "—"}</TableCell>
                    <TableCell>{money(Number(v.price))}</TableCell>
                    <TableCell>{v.stock}</TableCell>
                    <TableCell><Badge variant={v.is_active ? "default" : "secondary"}>{v.is_active ? "Yes" : "No"}</Badge></TableCell>
                  </TableRow>
                ))}
                {!variants.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No variants</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="images">
          <Card><CardHeader><CardTitle>Gallery ({images.length})</CardTitle></CardHeader><CardContent>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {images.map((im: any) => (
                <div key={im.id} className="relative aspect-square overflow-hidden rounded-lg border">
                  <img src={im.url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  {im.is_primary && <Badge className="absolute left-1 top-1">Primary</Badge>}
                </div>
              ))}
              {!images.length && <div className="col-span-full py-8 text-center text-muted-foreground">No images yet</div>}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card><CardHeader><CardTitle>Orders ({filteredOrders.length})</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead>
                <TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredOrders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_no}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell>{o.phone}</TableCell>
                    <TableCell>{o.product_name}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>{money(Number(o.total))}</TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onValueChange={async (v) => {
                          try { await updateStatus({ data: { id: o.id, status: v } }); toast.success("Order updated"); refresh(); }
                          catch (e: any) { toast.error(e.message); }
                        }}
                      >
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredOrders.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No orders</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="items">
          <Card><CardHeader><CardTitle>Order items ({items.length})</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead><TableHead>Variant</TableHead>
                <TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Subtotal</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.product_name}</TableCell>
                    <TableCell>{it.variant_name ?? "—"}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell>{money(Number(it.unit_price))}</TableCell>
                    <TableCell>{money(Number(it.subtotal))}</TableCell>
                  </TableRow>
                ))}
                {!items.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No items</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card><CardHeader><CardTitle>Payments ({payments.length})</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Provider</TableHead><TableHead>Txn ID</TableHead>
                <TableHead>Payer</TableHead><TableHead>Amount</TableHead>
                <TableHead>Status</TableHead><TableHead>Paid at</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.provider}</TableCell>
                    <TableCell className="font-mono text-xs">{p.provider_txn_id ?? "—"}</TableCell>
                    <TableCell>{p.payer_name ?? "—"}<div className="text-xs text-muted-foreground">{p.payer_phone ?? ""}</div></TableCell>
                    <TableCell>{money(Number(p.amount), p.currency || "BDT")}</TableCell>
                    <TableCell><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
                {!payments.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No payments</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <ReceiptText className="mx-3 mt-3 h-4 w-4 text-muted-foreground" />
        <CardContent className="pt-2 text-xs text-muted-foreground">
          Your data is fully isolated per workspace via RLS. Only your team can see or modify these products, orders and payments.
        </CardContent>
      </Card>
    </div>
  );
}
