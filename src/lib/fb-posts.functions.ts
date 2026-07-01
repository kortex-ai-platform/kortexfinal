import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateObject } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ToneEnum = z.enum([
  "sales",
  "professional",
  "premium",
  "emotional",
  "festival",
]);

const InputSchema = z.object({
  productId: z.string().uuid(),
  tone: ToneEnum.default("sales"),
});

const ResultSchema = z.object({
  titles: z.array(z.string()).describe("Exactly 5 distinct titles"),
  descriptions: z
    .array(
      z.object({
        length: z.enum(["short", "medium", "long"]),
        text: z.string(),
      }),
    )
    .describe("Exactly 3 descriptions: short, medium, long"),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Forbidden");
}

const TONE_HINT: Record<z.infer<typeof ToneEnum>, string> = {
  sales: "High-energy sales tone, urgency, strong CTA.",
  professional: "Calm, professional, trust-building voice.",
  premium: "Premium, aspirational, refined voice.",
  emotional: "Warm, emotional storytelling, customer pain-point focused.",
  festival: "Festive, celebratory mood, festival-flavored copy.",
};

export const generateFbPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    // workspace isolation via RLS

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const { data: product, error: pErr } = await (context.supabase as any)
      .from("products")
      .select("name,price,features,description")
      .eq("id", data.productId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product) throw new Error("Product not found");

    const { data: brand } = await (context.supabase as any)
      .from("branding_settings")
      .select("brand_name,phone,website")
      .eq("singleton", true)
      .maybeSingle();

    const brandName = brand?.brand_name?.trim() || "";
    const phone = brand?.phone?.trim() || "";
    const website = brand?.website?.trim() || "";

    const system = `You generate high-converting Bengali Facebook marketing content for an e-commerce brand.

Strict requirements:
- Write everything in Bengali (Bangla script).
- Conversion-focused, emotion-driven, trust-building.
- Use product benefits, not just features.
- Use urgency only when appropriate; never fake claims, fake discounts, or false scarcity.
- Facebook-friendly: short paragraphs, emojis sparingly, scannable bullets.
- Each description MUST end with a clear CTA and the brand footer below — and ONLY these fields:
  • 📞 Phone: ${phone || "(omit if empty)"}
  • 🌐 Website: ${website || "(omit if empty)"}
  • — ${brandName || "(omit if empty)"}
- Never include email, physical address, passwords, or any internal information.
- Generate exactly 5 distinct titles and exactly 3 descriptions: one short (~40 words), one medium (~90 words), one long (~160 words).
- Tone: ${TONE_HINT[data.tone]}`;

    const userPrompt = `Product:
- Name: ${product.name}
- Price: ৳ ${Number(product.price).toFixed(2)}
- Description: ${product.description || "(none)"}
- Features: ${product.features || "(none)"}

Brand:
- Name: ${brandName || "(none)"}
- Phone: ${phone || "(none)"}
- Website: ${website || "(none)"}

Generate the titles and descriptions now.`;

    const gateway = createLovableAiGatewayProvider(key);
    try {
      const { object } = await generateObject({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt: userPrompt,
        schema: ResultSchema,
      });
      // Normalize: ensure 5 titles & 3 descriptions, trim extras, pad if needed
      const titles = (object.titles || []).slice(0, 5);
      while (titles.length < 5) titles.push(titles[titles.length - 1] || "");
      const lengthsWanted = ["short", "medium", "long"] as const;
      const descMap = new Map(
        (object.descriptions || []).map((d) => [d.length, d.text]),
      );
      const descriptions = lengthsWanted.map((l) => ({
        length: l,
        text: descMap.get(l) || object.descriptions?.[0]?.text || "",
      }));
      return { titles, descriptions };
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("429")) throw new Error("AI rate limit — please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI credits exhausted — add credits in workspace billing.");
      throw new Error(msg);
    }
  });