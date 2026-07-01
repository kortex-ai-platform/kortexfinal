import type { MessageType, Category } from "./types";

export function detectMessageType(input: {
  text?: string;
  hasImage?: boolean;
  hasAudio?: boolean;
  wantsImage?: boolean;
  wantsVoice?: boolean;
}): MessageType {
  if (input.hasAudio) return "voice_stt";
  if (input.hasImage) return "image";
  const t = (input.text || "").toLowerCase();
  const imageHints =
    input.wantsImage ||
    /\b(generate|create|draw|make|design)\b.*\b(image|picture|photo|logo|poster|ad|banner)\b/.test(
      t,
    ) ||
    /\b(ছবি|পোস্টার|ব্যানার|লোগো)\b/.test(input.text || "");
  const voiceHints =
    input.wantsVoice ||
    /\b(speak|say|voice|audio|read aloud|narrate)\b/.test(t) ||
    /\b(কথা বলো|ভয়েস|অডিও)\b/.test(input.text || "");
  if (imageHints && voiceHints) return "mixed";
  if (imageHints) return "image";
  if (voiceHints) return "voice_tts";
  return "text";
}

export function messageTypeToCategory(t: MessageType): Category {
  if (t === "image") return "image";
  if (t === "voice_tts") return "voice_tts";
  if (t === "voice_stt") return "voice_stt";
  return "text";
}