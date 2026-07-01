import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyEcommerce = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [prod, variants, images, orders, items, payments] = await Promise.all([
      db.from("products").select("id,name,slug,description,price,stock,status,created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(500),
      db.from("product_variants").select("id,product_id,name,sku,price,stock,is_active").is("deleted_at", null).order("created_at", { ascending: false }).limit(500),
      db.from("product_images").select("id,product_id,variant_id,url,is_primary,position").is("deleted_at", null).order("position").limit(500),
      db.from("orders").select("id,order_no,customer_name,phone,product_name,quantity,total,status,source,created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(500),
      db.from("order_items").select("id,order_id,product_name,variant_name,quantity,unit_price,subtotal").is("deleted_at", null).order("created_at", { ascending: false }).limit(500),
      db.from("payments").select("id,order_id,provider,provider_txn_id,amount,currency,status,paid_at,payer_name,payer_phone").order("created_at", { ascending: false }).limit(500),
    ]);

    const salesTotal = (orders.data ?? [])
      .filter((o: any) => o.status !== "cancelled")
      .reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const paidTotal = (payments.data ?? [])
      .filter((p: any) => ["paid", "success", "completed"].includes(p.status))
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const pendingOrders = (orders.data ?? []).filter((o: any) => o.status === "pending" || o.status === "processing").length;

    return {
      products: prod.data ?? [],
      variants: variants.data ?? [],
      images: images.data ?? [],
      orders: orders.data ?? [],
      items: items.data ?? [],
      payments: payments.data ?? [],
      stats: {
        products: (prod.data ?? []).length,
        variants: (variants.data ?? []).length,
        images: (images.data ?? []).length,
        orders: (orders.data ?? []).length,
        items: (items.data ?? []).length,
        payments: (payments.data ?? []).length,
        salesTotal,
        paidTotal,
        pendingOrders,
      },
    };
  });

export const createMyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; slug?: string; description?: string; price: number; stock?: number; status?: string }) => d)
  .handler(async ({ data, context }) => {
    const slug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const insertRow: any = {
      name: data.name,
      slug,
      price: data.price,
      stock: data.stock ?? 0,
      status: data.status ?? "active",
    };
    if (data.description) insertRow.description = data.description;
    const { data: row, error } = await (context.supabase.from("products") as any).insert(insertRow).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string; description?: string; price?: number; stock?: number; status?: string }) => d)
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await (context.supabase.from("products") as any).update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("products") as any).update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addMyProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { product_id: string; url: string; is_primary?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("product_images") as any).insert({
      product_id: data.product_id,
      url: data.url,
      is_primary: data.is_primary ?? false,
      position: 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMyOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("orders") as any).update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
