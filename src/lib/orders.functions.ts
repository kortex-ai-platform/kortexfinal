import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden");
}

const CreateOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(999),
  customerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().min(3).max(500),
  district: z.string().trim().max(120).default(""),
  area: z.string().trim().max(120).default(""),
  note: z.string().trim().max(1000).optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id,name,price,status")
      .eq("id", data.productId)
      .maybeSingle();
    if (prodErr) throw new Error(prodErr.message);
    if (!product || product.status !== "active") throw new Error("Product is not available");

    const unit = Number(product.price);
    const total = unit * data.quantity;

    const { data: inserted, error } = await supabase
      .from("orders")
      .insert({
        product_id: product.id,
        product_name: product.name,
        quantity: data.quantity,
        unit_price: unit,
        total,
        customer_name: data.customerName,
        phone: data.phone,
        address: data.address,
        district: data.district,
        area: data.area,
        note: data.note ?? null,
      })
      .select("order_no")
      .single();
    if (error) throw new Error(error.message);
    return { orderNo: inserted.order_no as string };
  });

const ListSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(STATUSES).optional(),
  productId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    let q = context.supabase.from("orders").select("*", { count: "exact" });
    if (data.status) q = q.eq("status", data.status);
    if (data.productId) q = q.eq("product_id", data.productId);
    if (data.dateFrom) q = q.gte("created_at", data.dateFrom);
    if (data.dateTo) q = q.lte("created_at", data.dateTo);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`order_no.ilike.${s},customer_name.ilike.${s},phone.ilike.${s}`);
    }
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, error, count } = await q
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(STATUSES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOrderSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), source: z.enum(SOURCES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase
      .from("orders")
      .update({ source: data.source })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const orderStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const counts = async (filter: (q: any) => any) => {
      const { count, error } = await filter(
        context.supabase.from("orders").select("*", { count: "exact", head: true }),
      );
      if (error) throw new Error(error.message);
      return count ?? 0;
    };

    const [total, todayCount, pending, confirmed, delivered, cancelled] = await Promise.all([
      counts((q) => q),
      counts((q) => q.gte("created_at", todayIso)),
      counts((q) => q.eq("status", "pending_verification")),
      counts((q) => q.eq("status", "confirmed")),
      counts((q) => q.eq("status", "delivered")),
      counts((q) => q.eq("status", "cancelled")),
    ]);
    return { total, today: todayCount, pending, confirmed, delivered, cancelled };
  });