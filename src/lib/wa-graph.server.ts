// WhatsApp Cloud API helpers.
const GRAPH = "https://graph.facebook.com/v21.0";

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string,
  accessToken: string,
): Promise<{ message_id: string | null }> {
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text.slice(0, 4096), preview_url: false },
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? `WA send failed ${res.status}`;
    throw new Error(msg);
  }
  return { message_id: json?.messages?.[0]?.id ?? null };
}
