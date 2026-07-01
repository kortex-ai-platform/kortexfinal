import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { sendMessengerMessage, sendCommentReply, fetchPostContext } from "./fb-graph.server";
import { aiRoute } from "./ai/router.server";

function sanitizeReply(s: string): string {
  let t = s ?? "";
  // Some chat models mirror transcript labels like "You:" / "Customer:".
  // Facebook should receive only the reply body, never speaker labels.
  t = t.replace(/^\s*(you|assistant|agent|ai|bot|customer|user)\s*[:：-]\s*/i, "");
  t = t.replace(/^\s*(আপনি|গ্রাহক|কাস্টমার|ইউজার|সহকারী|এজেন্ট)\s*[:：-]\s*/i, "");
  // strip markdown emphasis / headings / dividers that FB shows raw
  t = t.replace(/\*\*(.*?)\*\*/g, "$1");
  t = t.replace(/__(.*?)__/g, "$1");
  t = t.replace(/(^|\n)\s{0,3}#{1,6}\s+/g, "$1");
  t = t.replace(/(^|\n)\s*([-*•]|\d+\.)\s+/g, "$1");
  t = t.replace(/(^|\n)\s*-{3,}\s*(\n|$)/g, "$1");
  t = t.replace(/`{1,3}([^`]*)`{1,3}/g, "$1");
  // collapse 3+ newlines
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

async function buildProductContext(supabaseAdmin: any, workspaceId?: string | null): Promise<string> {
  let query = supabaseAdmin
    .from("products")
    .select("name, price, description, stock, status")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data } = await query;
  if (!data || data.length === 0) return "";
  const lines = data.map((p: any) => {
    const desc = (p.description ?? "").toString().replace(/\s+/g, " ").slice(0, 120);
    const stock = p.stock != null ? `, stock: ${p.stock}` : "";
    return `- ${p.name} — ${p.price}৳${stock}${desc ? ` | ${desc}` : ""}`;
  });
  return `\n\nআমাদের বর্তমান প্রোডাক্ট:\n${lines.join("\n")}`;
}

function styleGuide(
  source: "messenger" | "comment",
  opts: { commentMaxLines: number; messengerLength: "auto" | "short" | "detailed" },
): string {
  const common = [
    "তুমি একজন আসল মানুষ কাস্টমার সাপোর্ট এজেন্টের মতো বাংলায় উত্তর দাও — robotic নয়, বন্ধুর মতো সহজ ভাষায়।",
    "কখনোই markdown ব্যবহার করো না: **bold**, ###, ---, `code`, numbered list (1. 2.), bullet (- বা •) — কিছুই না। Facebook এ এগুলো raw দেখায়।",
    "শুধু plain text লিখো। দরকার হলে নতুন লাইন দাও, কিন্তু symbol দিয়ে format করো না।",
    "নিজেকে \"AI\", \"bot\", \"assistant\" বলে পরিচয় দিবে না। কোনো template-ধাঁচের greeting (\"আসসালামু আলাইকুম! আমি ... AI\") দেবে না।",
    "\"আপনি\" form ব্যবহার করো। উত্তরে সর্বোচ্চ একটা emoji, প্রায়শই ০টা।",
    "গ্রাহক যা জিজ্ঞেস করেছে শুধু সেটারই উত্তর দাও — অপ্রাসঙ্গিক offer/পরামর্শ যোগ করো না।",
    "প্রোডাক্ট সম্পর্কে নিশ্চিত না হলে বানিয়ে বলো না — বিনয়ের সাথে জিজ্ঞেস করো বা inbox এ details নিতে বলো।",
  ];
  if (source === "comment") {
    const n = Math.max(1, Math.min(10, opts.commentMaxLines || 3));
    common.push(
      `এটা একটি Facebook post-এর comment reply। খুব সংক্ষেপে উত্তর দাও — সর্বোচ্চ ${n} লাইন, ~${n * 12} শব্দের মধ্যে। দাম/details বেশি হলে "ইনবক্স করুন" বলো।`,
    );
  } else {
    const ml = opts.messengerLength;
    if (ml === "short") {
      common.push("এটা Messenger DM। সবসময় সংক্ষিপ্ত — ১ থেকে ২ লাইন, অপ্রয়োজনীয় ব্যাখ্যা নয়।");
    } else if (ml === "detailed") {
      common.push("এটা Messenger DM। বিস্তারিত উত্তর দাও — ৪ থেকে ৭ লাইন, দরকার হলে step-by-step plain text-এ।");
    } else {
      common.push("এটা Messenger DM। প্রশ্নের গভীরতা অনুযায়ী length: ছোট প্রশ্নে ১-২ লাইন, দাম/feature/অর্ডার প্রশ্নে ৩-৬ লাইন। অপ্রয়োজনীয় বড় paragraph লিখো না।");
    }
  }
  return common.join("\n");
}

export async function maybeAutoReply(conversationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: conv } = await supabaseAdmin
    .from("fb_conversations")
    .select("id, page_id, source, fb_user_id, user_name, ai_enabled, post_id, workspace_id")
    .eq("id", conversationId)
    .single();
  if (!conv) return;

  const { data: page } = await supabaseAdmin
    .from("fb_pages")
    .select("access_token, workspace_id")
    .eq("page_id", conv.page_id)
    .single();
  if (!page) return;

  const workspaceId = conv.workspace_id ?? page.workspace_id ?? null;
  if (!workspaceId) return;

  const { data: settings } = await supabaseAdmin
    .from("fb_settings")
    .select("ai_global_enabled, ai_system_prompt, reply_delay_ms, humanize_enabled, strip_markdown, comment_max_lines, messenger_length")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!settings) return;

  const effective = conv.ai_enabled ?? settings.ai_global_enabled;
  if (!effective) return;

  const { data: msgs } = await supabaseAdmin
    .from("fb_messages")
    .select("sender, text, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const history = (msgs ?? []).reverse();
  const last = history[history.length - 1];
  if (!last || last.sender !== "customer") return;

  const humanize = settings.humanize_enabled !== false;
  const stripMd = settings.strip_markdown !== false;
  const commentMaxLines = Number(settings.comment_max_lines ?? 3);
  const messengerLength = (settings.messenger_length as "auto" | "short" | "detailed") ?? "auto";

  const productCtx = await buildProductContext(supabaseAdmin, workspaceId);
  const userPrompt = (settings.ai_system_prompt || "তুমি একজন সহায়ক কাস্টমার সাপোর্ট এজেন্ট।").trim();
  const source: "messenger" | "comment" = conv.source === "comment" ? "comment" : "messenger";

  // For comments, fetch the post context (caption + image) so AI understands what user is replying to.
  let postCtx = "";
  let postImageUrl: string | null = null;
  if (source === "comment" && (conv as any).post_id) {
    const post = await fetchPostContext(page.access_token, (conv as any).post_id);
    if (post) {
      postImageUrl = post.imageUrl;
      const parts: string[] = [];
      if (post.message) parts.push(`Caption: ${post.message.slice(0, 800)}`);
      if (post.story && !post.message) parts.push(`Story: ${post.story}`);
      if (post.imageUrl) parts.push(`Has image/banner: yes (${post.imageUrl})`);
      if (post.permalink) parts.push(`Link: ${post.permalink}`);
      if (parts.length) {
        postCtx = `\n\n---\nএই comment-টি নিচের Facebook post-এ এসেছে। উত্তর দেওয়ার আগে এই post-এর context বুঝে নাও — user এই post সম্পর্কেই জিজ্ঞেস করছে:\n${parts.join("\n")}`;
      }
    }
  }

  const { buildBrandMemoryContext } = await import("./brand-memory.server");
  const brandCtx = await buildBrandMemoryContext(supabaseAdmin, 18000, workspaceId);

  const customerName = ((conv as any).user_name as string | null)?.trim() || null;
  const nameCtx = customerName
    ? `\n\n---\nCustomer-এর Facebook নাম: "${customerName}". প্রথম reply বা নতুন topic শুরু হলে স্বাভাবিকভাবে first name ধরে সম্বোধন করতে পারো। প্রতিটি message-এ নাম repeat করবে না। কখনোই "You:" বা speaker label লিখবে না।`
    : `\n\n---\nCustomer-এর Facebook নাম এখনো পাওয়া যায়নি। তাই কোনো fake name বা "You:" দিয়ে শুরু করবে না। দরকার হলে স্বাভাবিকভাবে "আপনি" ব্যবহার করো।`;

  const systemPrompt = humanize
    ? `${userPrompt}${productCtx}${brandCtx}${postCtx}${nameCtx}\n\n---\nReply style (must follow strictly):\n${styleGuide(source, { commentMaxLines, messengerLength })}`
    : `${userPrompt}${productCtx}${brandCtx}${postCtx}${nameCtx}`;

  // Build a single prompt from history for the configured provider
  const transcript = history
    .map((m) => `${m.sender === "customer" ? "Customer" : "You"}: ${m.text ?? ""}`)
    .join("\n");

  let replyText = "";
  let providerLabel = "unknown";
  try {
    if (settings.reply_delay_ms > 0) {
      await new Promise((r) => setTimeout(r, Math.min(settings.reply_delay_ms, 5000)));
    }

    // 1) Try user-configured providers (OpenRouter, OpenAI, etc.)
    try {
      const r = await aiRoute(supabaseAdmin, {
        category: "text",
        workspaceId,
        payload: {
          prompt: `${transcript}\n\nWrite ONLY the next reply message in the same language as the customer. Do not prefix the answer with "You:", "Assistant:", "Customer:", a name label, or any speaker label.`,
          system: systemPrompt,
          temperature: 0.7,
          max_tokens: 1024,
        },
      });
      replyText = r.text ?? "";
      providerLabel = r.providerName;
    } catch {
      // 2) Fallback to built-in Lovable AI gateway
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("No AI provider configured");
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-3-flash-preview");
      const messages = history.map((m) => ({
        role: m.sender === "customer" ? ("user" as const) : ("assistant" as const),
        content: m.text ?? "",
      }));
      const r = await generateText({ model, system: systemPrompt, messages });
      replyText = r.text ?? "";
      providerLabel = "lovable/google/gemini-3-flash-preview";
    }
    replyText = stripMd ? sanitizeReply(replyText) : replyText.trim();
  } catch (e: any) {
    await supabaseAdmin.from("fb_messages").insert({
      conversation_id: conv.id,
      direction: "out",
      sender: "ai",
      kind: conv.source === "comment" ? "comment" : "text",
      text: null,
      error: e?.message ?? "ai failed",
      ai_provider: providerLabel,
      workspace_id: workspaceId,
    });
    return;
  }
  if (!replyText) return;

  let fbMessageId: string | null = null;
  try {
    if (conv.source === "messenger") {
      const r = await sendMessengerMessage(page.access_token, conv.fb_user_id, replyText);
      fbMessageId = r?.message_id ?? null;
    } else {
      const r = await sendCommentReply(page.access_token, conv.fb_user_id, replyText);
      fbMessageId = r?.id ?? null;
    }
  } catch (e: any) {
    await supabaseAdmin.from("fb_messages").insert({
      conversation_id: conv.id,
      direction: "out",
      sender: "ai",
      kind: conv.source === "comment" ? "comment" : "text",
      text: replyText,
      error: e?.message ?? "send failed",
      ai_provider: providerLabel,
      workspace_id: workspaceId,
    });
    return;
  }

  await supabaseAdmin.from("fb_messages").insert({
    conversation_id: conv.id,
    direction: "out",
    sender: "ai",
    kind: conv.source === "comment" ? "comment" : "text",
    text: replyText,
    fb_message_id: fbMessageId,
    ai_provider: providerLabel,
    workspace_id: workspaceId,
  });
  await supabaseAdmin
    .from("fb_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: replyText.slice(0, 140),
    })
    .eq("id", conv.id);
}