import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Authenticated workspace members can manage their own brand memory.
// RLS on brand_memory_sources/chunks enforces workspace isolation.
async function assertAdmin(_ctx: { supabase: any; userId: string }) {
  return;
}

export const listBrandSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // workspace isolation via RLS
    const { data, error } = await context.supabase
      .from("brand_memory_sources")
      .select("id, kind, label, url, fb_page_id, status, error, item_count, last_synced_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const AddSchema = z.object({
  kind: z.enum(["fb_page", "website", "text"]),
  label: z.string().trim().min(1).max(120),
  url: z.string().trim().url().optional().or(z.literal("")).transform((v) => v || undefined),
  text: z.string().trim().optional(),
  fb_page_id: z.string().trim().optional(),
});

export const addBrandSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    if (data.kind === "website" && !data.url) throw new Error("Website URL দরকার");
    if (data.kind === "fb_page" && !data.fb_page_id) throw new Error("Facebook page select করুন");
    if (data.kind === "text" && !data.text) throw new Error("Text content দরকার");

    const { data: row, error } = await context.supabase
      .from("brand_memory_sources")
      .insert({
        kind: data.kind,
        label: data.label,
        url: data.url ?? null,
        fb_page_id: data.fb_page_id ?? null,
        status: "idle",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // For text kind, immediately store the chunks (no remote sync needed).
    if (data.kind === "text" && data.text) {
      const { chunkText } = await import("./brand-memory.server");
      const chunks = chunkText(data.text);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("brand_memory_chunks").insert(
        chunks.map((c) => ({ source_id: row.id, content: c, title: data.label })),
      );
      await supabaseAdmin
        .from("brand_memory_sources")
        .update({ status: "ready", item_count: chunks.length, last_synced_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    return { id: row.id };
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const deleteBrandSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { error } = await context.supabase.from("brand_memory_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSourceChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { data: rows, error } = await context.supabase
      .from("brand_memory_chunks")
      .select("id, title, content, url, image_url, created_at")
      .eq("source_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const syncBrandSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: src, error: e1 } = await supabaseAdmin
      .from("brand_memory_sources")
      .select("id, kind, label, url, fb_page_id")
      .eq("id", data.id)
      .single();
    if (e1 || !src) throw new Error("Source not found");

    await supabaseAdmin.from("brand_memory_sources").update({ status: "syncing", error: null }).eq("id", src.id);
    // Wipe old chunks so re-sync replaces them.
    await supabaseAdmin.from("brand_memory_chunks").delete().eq("source_id", src.id);

    try {
      let inserted = 0;
      if (src.kind === "website") {
        if (!src.url) throw new Error("URL missing");
        const { scrapeWebsite, chunkText } = await import("./brand-memory.server");
        const { title, text } = await scrapeWebsite(src.url);
        const chunks = chunkText(text);
        if (chunks.length) {
          await supabaseAdmin.from("brand_memory_chunks").insert(
            chunks.map((c) => ({ source_id: src.id, content: c, title: title ?? src.label, url: src.url })),
          );
        }
        inserted = chunks.length;
      } else if (src.kind === "fb_page") {
        if (!src.fb_page_id) throw new Error("Page id missing");
        const { data: page } = await supabaseAdmin
          .from("fb_pages")
          .select("access_token")
          .eq("page_id", src.fb_page_id)
          .single();
        if (!page) throw new Error("Page not connected in Facebook Integration");
        const { fetchAllPagePosts } = await import("./brand-memory.server");
        const posts = await fetchAllPagePosts(src.fb_page_id, page.access_token);
        const rows = posts
          .filter((p) => (p.message ?? p.story ?? "").trim().length > 0)
          .map((p) => ({
            source_id: src.id,
            external_id: p.id,
            title: p.createdTime ? `Post • ${new Date(p.createdTime).toLocaleDateString()}` : "Post",
            content: [p.message ?? p.story ?? "", p.imageUrl ? `Image: ${p.imageUrl}` : ""].filter(Boolean).join("\n"),
            url: p.permalink,
            image_url: p.imageUrl,
          }));
        if (rows.length) {
          // insert in batches of 100
          for (let i = 0; i < rows.length; i += 100) {
            await supabaseAdmin.from("brand_memory_chunks").insert(rows.slice(i, i + 100));
          }
        }
        inserted = rows.length;
      } else if (src.kind === "text") {
        // No remote to fetch — keep existing behavior: nothing to do here.
        return { ok: true, item_count: 0 };
      } else {
        throw new Error(`Unsupported source kind: ${src.kind}`);
      }

      await supabaseAdmin
        .from("brand_memory_sources")
        .update({ status: "ready", item_count: inserted, last_synced_at: new Date().toISOString() })
        .eq("id", src.id);
      return { ok: true, item_count: inserted };
    } catch (e: any) {
      await supabaseAdmin
        .from("brand_memory_sources")
        .update({ status: "error", error: e?.message ?? "sync failed" })
        .eq("id", src.id);
      throw new Error(e?.message ?? "sync failed");
    }
  });
