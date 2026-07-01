import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";

import {
  listOrders,
  orderStats,
  updateOrderStatus,
  updateOrderSource,
  deleteOrder,
} from "@/lib/orders.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — kortex Ai" }] }),
  component: OrdersAdmin,
});

const STATUSES = [
  "pending_verification",
  "call_pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const SOURCES = [
  "facebook_messenger",
  "whatsapp",
  "website_direct",
  "ai_chatbot",
  "facebook_ads",
  "google_ads",
  "other",
] as const;

const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  pending_verification: "Pending verification",
  call_pending: "Call pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const SOURCE_LABEL: Record<(typeof SOURCES)[number], string> = {
  facebook_messenger: "Messenger",
  whatsapp: "WhatsApp",
  website_direct: "Website",
  ai_chatbot: "AI Chatbot",
  facebook_ads: "FB Ads",
  google_ads: "Google Ads",
  other: "Other",
};

const STATUS_TONE: Record<(typeof STATUSES)[number], "default" | "secondary" | "destructive" | "outline"> = {
  pending_verification: "secondary",
  call_pending: "secondary",
  confirmed: "default",
  processing: "default",
  packed: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

export function OrdersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const setStatusFn = useServerFn(updateOrderStatus);
  const setSourceFn = useServerFn(updateOrderSource);
  const deleteFn = useServerFn(deleteOrder);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: status !== "all" ? (status as (typeof STATUSES)[number]) : undefined,
      page,
      pageSize,
    }),
    [search, status, page],
  );

  const { data: stats } = useQuery({
    queryKey: ["order-stats"],
    queryFn: () => orderStats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["orders", filters],
    queryFn: () => listOrders({ data: filters }),
  });

  async function changeStatus(id: string, next: string) {
    try {
      await setStatusFn({ data: { id, status: next as (typeof STATUSES)[number] } });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-stats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function changeSource(id: string, next: string) {
    try {
      await setSourceFn({ data: { id, source: next as (typeof SOURCES)[number] } });
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this order?")) return;
    try {
      await deleteFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-stats"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const tiles: Array<{ label: string; value: number }> = [
    { label: "Today", value: stats?.today ?? 0 },
    { label: "Total", value: stats?.total ?? 0 },
    { label: "Pending verification", value: stats?.pending ?? 0 },
    { label: "Confirmed", value: stats?.confirmed ?? 0 },
    { label: "Delivered", value: stats?.delivered ?? 0 },
    { label: "Cancelled", value: stats?.cancelled ?? 0 },
  ];

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Orders</h1>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</div>
              <div className="mt-1 text-2xl font-bold">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardContent className="space-y-4 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="flex flex-wrap items-center gap-3"
          >
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by order #, name, phone"
                className="pl-8"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setPage(1);
                setStatus(v);
              }}
            >
              <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (data?.rows.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No orders found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.rows.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_no}</TableCell>
                    <TableCell>
                      <div className="font-medium">{o.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{o.phone}</div>
                      <div className="text-xs text-muted-foreground">{o.address}{o.area ? `, ${o.area}` : ""}{o.district ? `, ${o.district}` : ""}</div>
                      {o.note && <div className="mt-1 text-xs italic text-muted-foreground">“{o.note}”</div>}
                    </TableCell>
                    <TableCell>{o.product_name}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>৳ {Number(o.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onValueChange={(v) => changeStatus(o.id, v)}
                      >
                        <SelectTrigger className="h-8 w-44">
                          <Badge variant={STATUS_TONE[o.status as (typeof STATUSES)[number]]}>
                            {STATUS_LABEL[o.status as (typeof STATUSES)[number]]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={o.source} onValueChange={(v) => changeSource(o.id, v)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SOURCES.map((s) => (
                            <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(o.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                Page {page} of {totalPages} · {total} total
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}