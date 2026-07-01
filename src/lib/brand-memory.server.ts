// Server-only helpers for Brand Memory ingestion.

const CHUNK_CHARS = 4000;

export function chunkText(text: string, size: number = CHUNK_CHARS): string[] {
  const clean = (text ?? "").replace(/\u0000/g, "").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const out: string[] = [];
  // Try to split on paragraph boundaries first.
  const paras = clean.split(/\n\s*\n/);
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > size) {
      if (buf) out.push(buf);
      if (p.length > size) {
        for (let i = 0; i < p.length; i += size) out.push(p.slice(i, i + size));
        buf = "";
      } else {
        buf = p;
      }
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function htmlToText(html: string): string {
  let s = html ?? "";
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<\/?(p|div|section|article|li|ul|ol|h[1-6]|br|tr|td|th|table)[^>]*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  s = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

export async function scrapeWebsite(url: string): Promise<{ title: string | null; text: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; KortexBrandMemory/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : null;
  return { title, text: htmlToText(html) };
}

export interface FbPostItem {
  id: string;
  message: string | null;
  story: string | null;
  permalink: string | null;
  imageUrl: string | null;
  createdTime: string | null;
}

export async function fetchAllPagePosts(
  pageId: string,
  pageAccessToken: string,
  maxPages: number = 10,
): Promise<FbPostItem[]> {
  const out: FbPostItem[] = [];
  const base = `https://graph.facebook.com/v21.0/${pageId}/posts`;
  let url: string | null =
    `${base}?fields=id,message,story,permalink_url,full_picture,created_time&limit=100&access_token=${encodeURIComponent(pageAccessToken)}`;
  let pages = 0;
  while (url && pages < maxPages) {
    const r = await fetch(url);
    const j: any = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || `Graph error fetching posts`);
    for (const p of j.data ?? []) {
      out.push({
        id: p.id,
        message: p.message ?? null,
        story: p.story ?? null,
        permalink: p.permalink_url ?? null,
        imageUrl: p.full_picture ?? null,
        createdTime: p.created_time ?? null,
      });
    }
    url = j.paging?.next ?? null;
    pages++;
  }
  return out;
}

export async function buildBrandMemoryContext(
  supabaseAdmin: any,
  charCap: number = 18000,
  workspaceId?: string | null,
): Promise<string> {
  let sourceQuery = supabaseAdmin
    .from("brand_memory_sources")
    .select("id, label, kind")
    .eq("status", "ready");
  if (workspaceId) sourceQuery = sourceQuery.eq("workspace_id", workspaceId);
  const { data: sources } = await sourceQuery;
  if (!sources || sources.length === 0) return "";

  // Pull most-recent chunks across all ready sources.
  const ids = sources.map((s: any) => s.id);
  const { data: chunks } = await supabaseAdmin
    .from("brand_memory_chunks")
    .select("source_id, title, content, url")
    .in("source_id", ids)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!chunks || chunks.length === 0) return "";

  const labelById = new Map<string, string>();
  for (const s of sources) labelById.set(s.id, s.label);

  const parts: string[] = [];
  let used = 0;
  for (const c of chunks) {
    const header = `\n[${labelById.get(c.source_id) ?? "source"}${c.title ? ` • ${c.title}` : ""}${c.url ? ` • ${c.url}` : ""}]\n`;
    const body = (c.content ?? "").toString();
    if (used + header.length + body.length > charCap) {
      const remaining = charCap - used - header.length;
      if (remaining > 200) parts.push(header + body.slice(0, remaining));
      break;
    }
    parts.push(header + body);
    used += header.length + body.length;
  }
  if (!parts.length) return "";
  return `\n\n---\nBrand knowledge (use this to answer customer questions accurately; cite naturally, don't invent facts beyond this):\n${parts.join("\n")}`;
}
