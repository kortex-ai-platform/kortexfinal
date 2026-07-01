import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { sendWhatsAppMessage } from "./wa-graph.server";
import { aiRoute } from "./ai/router.server";

function sanitize(s: string): string {
  let t = s ?? "";
  t = t.replace(/^\s*(you|assistant|agent|ai|bot|customer|user)\s*[:：-]\s*/i, "");
  t = t.replace(/\*\*(.*?)\*\*/g, "$1");
  t = t.replace(/`{1,3}([^`]*)`{1,3}/g, "$1");
  return t.trim();
}

export async function maybeWaAutoReply(conversationId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: conv } = await supabaseAdmin
    .from("wa_conversations")
    .select("id, tenant_id, phone_number_id, wa_user_id, ai_enabled")
    .eq("id", conversationId)
    .single();
  if (!conv) return;

  // Resolve the access token via the phone number → WABA account chain.
  const { data: pn } = await supabaseAdmin
    .from("whatsapp_phone_numbers")
    .select("phone_number_id, whatsapp_account_id, tenant_id")
    .eq("phone_number_id", conv.phone_number_id)
    .maybeSingle();
  if (!pn) return;

  const { data: waba } = await supabaseAdmin
    .from("whatsapp_accounts")
    .select("id, access_token, tenant_id")
    .eq("id", pn.whatsapp_account_id)
    .maybeSingle();
  if (!waba?.access_token) return;

  const tenantId = conv.tenant_id ?? pn.tenant_id ?? waba.tenant_id ?? null;

  // Pull recent context.
  const { data: msgs } = await supabaseAdmin
    .from("wa_messages")
    .select("sender, text, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const history = (msgs ?? []).reverse();
  const last = history[history.length - 1];
  if (!last || last.sender !== "customer") return;

  if (conv.ai_enabled === false) return;

  const systemPrompt =
    "তুমি একজন আসল মানুষ কাস্টমার সাপোর্ট এজেন্টের মতো বাংলায় উত্তর দাও। Markdown বা speaker label ব্যবহার করবে না। সংক্ষেপে, বিনয়ের সাথে উত্তর দাও।";
  const transcript = history
    .map((m) => `${m.sender === "customer" ? "Customer" : "You"}: ${m.text ?? ""}`)
    .join("\n");

  let replyText = "";
  let providerLabel = "unknown";
  try {
    try {
      const r = await aiRoute(supabaseAdmin, {
        category: "text",
        workspaceId: null,
        payload: {
          prompt: `${transcript}\n\nWrite ONLY the next reply, no speaker label.`,
          system: systemPrompt,
          temperature: 0.7,
          max_tokens: 800,
        },
      });
      replyText = r.text ?? "";
      providerLabel = r.providerName;
    } catch {
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
    replyText = sanitize(replyText);
  } catch (e: any) {
    await supabaseAdmin.from("wa_messages").insert({
      conversation_id: conv.id,
      tenant_id: tenantId,
      direction: "out",
      sender: "ai",
      text: null,
      error: e?.message ?? "ai failed",
      ai_provider: providerLabel,
    });
    return;
  }
  if (!replyText) return;

  let waMessageId: string | null = null;
  try {
    const r = await sendWhatsAppMessage(conv.phone_number_id, conv.wa_user_id, replyText, waba.access_token);
    waMessageId = r.message_id;
  } catch (e: any) {
    await supabaseAdmin.from("wa_messages").insert({
      conversation_id: conv.id,
      tenant_id: tenantId,
      direction: "out",
      sender: "ai",
      text: replyText,
      error: e?.message ?? "send failed",
      ai_provider: providerLabel,
    });
    return;
  }

  await supabaseAdmin.from("wa_messages").insert({
    conversation_id: conv.id,
    tenant_id: tenantId,
    direction: "out",
    sender: "ai",
    text: replyText,
    wa_message_id: waMessageId,
    ai_provider: providerLabel,
  });
  await supabaseAdmin
    .from("wa_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: replyText.slice(0, 140),
    })
    .eq("id", conv.id);
}
