import type { Adapter, AdapterError, AnyPayload, ProviderRow } from "./types";

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(id) };
}

function classify(status: number): AdapterError["status"] {
  if (status === 408) return "timeout";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server_down";
  return "api_error";
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ ok: true; data: any } | { ok: false; err: AdapterError }> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        err: {
          status: classify(res.status),
          code: String(res.status),
          message: text.slice(0, 500) || res.statusText,
        },
      };
    }
    try {
      return { ok: true, data: text ? JSON.parse(text) : {} };
    } catch {
      return {
        ok: false,
        err: { status: "invalid", message: "Invalid JSON response" },
      };
    }
  } catch (e: any) {
    const aborted = e?.name === "AbortError";
    return {
      ok: false,
      err: {
        status: aborted ? "timeout" : "server_down",
        message: aborted ? `Timed out after ${timeoutMs}ms` : String(e?.message || e),
      },
    };
  } finally {
    cancel();
  }
}

export class AdapterFailure extends Error {
  err: AdapterError;
  constructor(err: AdapterError) {
    super(err.message);
    this.err = err;
  }
}

function requireKey(p: ProviderRow): string {
  if (!p.api_key) throw new AdapterFailure({ status: "api_error", message: "Missing API key" });
  return p.api_key;
}

/* ---------- Gemini (Google AI Studio) ---------- */
const geminiAdapter: Adapter = {
  async call(p, payload) {
    const key = requireKey(p);
    const model = p.model || "gemini-2.5-flash";
    const body = payload as any;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const r = await fetchJson(
      url,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: body.prompt }] }],
          ...(body.system ? { systemInstruction: { parts: [{ text: body.system }] } } : {}),
          generationConfig: {
            temperature: body.temperature ?? 0.7,
            maxOutputTokens: body.max_tokens ?? 1024,
          },
        }),
      },
      p.timeout_ms,
    );
    if (!r.ok) throw new AdapterFailure(r.err);
    const text =
      r.data?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).join("") ?? "";
    return { text, raw: r.data };
  },
  async ping(p) {
    const key = requireKey(p);
    const r = await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { method: "GET" },
      Math.min(p.timeout_ms, 10000),
    );
    if (!r.ok) throw new AdapterFailure(r.err);
  },
};

/* ---------- OpenAI-compatible (OpenAI, Grok via base_url) ---------- */
function openAiAdapter(defaultBase: string): Adapter {
  return {
    async call(p, payload) {
      const key = requireKey(p);
      const base = p.base_url || defaultBase;
      const body = payload as any;
      const r = await fetchJson(
        `${base.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: p.model || "gpt-4o-mini",
            messages: [
              ...(body.system ? [{ role: "system", content: body.system }] : []),
              { role: "user", content: body.prompt },
            ],
            temperature: body.temperature ?? 0.7,
            max_tokens: body.max_tokens ?? 1024,
          }),
        },
        p.timeout_ms,
      );
      if (!r.ok) throw new AdapterFailure(r.err);
      const text = r.data?.choices?.[0]?.message?.content ?? "";
      return { text, raw: r.data };
    },
    async ping(p) {
      const key = requireKey(p);
      const base = p.base_url || defaultBase;
      const r = await fetchJson(
        `${base.replace(/\/$/, "")}/models`,
        { method: "GET", headers: { authorization: `Bearer ${key}` } },
        Math.min(p.timeout_ms, 10000),
      );
      if (!r.ok) throw new AdapterFailure(r.err);
    },
  };
}

/* ---------- Claude (Anthropic) ---------- */
const claudeAdapter: Adapter = {
  async call(p, payload) {
    const key = requireKey(p);
    const body = payload as any;
    const r = await fetchJson(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: p.model || "claude-3-5-sonnet-latest",
          max_tokens: body.max_tokens ?? 1024,
          temperature: body.temperature ?? 0.7,
          ...(body.system ? { system: body.system } : {}),
          messages: [{ role: "user", content: body.prompt }],
        }),
      },
      p.timeout_ms,
    );
    if (!r.ok) throw new AdapterFailure(r.err);
    const text = r.data?.content?.map((c: any) => c.text).join("") ?? "";
    return { text, raw: r.data };
  },
  async ping(p) {
    // Anthropic has no cheap list endpoint; do a tiny generation
    await claudeAdapter.call(p, { prompt: "ping", max_tokens: 4 } as any);
  },
};

/* ---------- OpenAI Image ---------- */
const openAiImageAdapter: Adapter = {
  async call(p, payload) {
    const key = requireKey(p);
    const base = p.base_url || "https://api.openai.com/v1";
    const body = payload as any;
    const r = await fetchJson(
      `${base.replace(/\/$/, "")}/images/generations`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: p.model || "gpt-image-1",
          prompt: body.prompt,
          size: body.size || "1024x1024",
        }),
      },
      p.timeout_ms,
    );
    if (!r.ok) throw new AdapterFailure(r.err);
    const item = r.data?.data?.[0];
    return { imageBase64: item?.b64_json, imageUrl: item?.url, raw: r.data };
  },
  async ping(p) {
    const key = requireKey(p);
    const base = p.base_url || "https://api.openai.com/v1";
    const r = await fetchJson(
      `${base.replace(/\/$/, "")}/models`,
      { method: "GET", headers: { authorization: `Bearer ${key}` } },
      Math.min(p.timeout_ms, 10000),
    );
    if (!r.ok) throw new AdapterFailure(r.err);
  },
};

/* ---------- Stability AI ---------- */
const stabilityAdapter: Adapter = {
  async call(p, payload) {
    const key = requireKey(p);
    const body = payload as any;
    const form = new FormData();
    form.append("prompt", body.prompt);
    form.append("output_format", "png");
    const { signal, cancel } = withTimeout(p.timeout_ms);
    try {
      const res = await fetch(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, accept: "application/json" },
          body: form,
          signal,
        },
      );
      const text = await res.text();
      if (!res.ok) throw new AdapterFailure({ status: classify(res.status), code: String(res.status), message: text.slice(0, 500) });
      const data = JSON.parse(text);
      return { imageBase64: data?.image, raw: data };
    } catch (e: any) {
      if (e instanceof AdapterFailure) throw e;
      const aborted = e?.name === "AbortError";
      throw new AdapterFailure({
        status: aborted ? "timeout" : "server_down",
        message: aborted ? `Timed out after ${p.timeout_ms}ms` : String(e?.message || e),
      });
    } finally {
      cancel();
    }
  },
  async ping(p) {
    if (!p.api_key) throw new AdapterFailure({ status: "api_error", message: "Missing API key" });
    const r = await fetchJson(
      "https://api.stability.ai/v1/user/account",
      { method: "GET", headers: { authorization: `Bearer ${p.api_key}` } },
      Math.min(p.timeout_ms, 10000),
    );
    if (!r.ok) throw new AdapterFailure(r.err);
  },
};

/* ---------- OpenAI TTS ---------- */
const openAiTtsAdapter: Adapter = {
  async call(p, payload) {
    const key = requireKey(p);
    const base = p.base_url || "https://api.openai.com/v1";
    const body = payload as any;
    const { signal, cancel } = withTimeout(p.timeout_ms);
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/audio/speech`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: p.model || "gpt-4o-mini-tts",
          input: body.input,
          voice: body.voice || "alloy",
        }),
        signal,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new AdapterFailure({ status: classify(res.status), code: String(res.status), message: t.slice(0, 500) });
      }
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      return { audioBase64: b64 };
    } catch (e: any) {
      if (e instanceof AdapterFailure) throw e;
      const aborted = e?.name === "AbortError";
      throw new AdapterFailure({
        status: aborted ? "timeout" : "server_down",
        message: aborted ? `Timed out after ${p.timeout_ms}ms` : String(e?.message || e),
      });
    } finally {
      cancel();
    }
  },
  async ping(p) {
    const key = requireKey(p);
    const base = p.base_url || "https://api.openai.com/v1";
    const r = await fetchJson(
      `${base.replace(/\/$/, "")}/models`,
      { method: "GET", headers: { authorization: `Bearer ${key}` } },
      Math.min(p.timeout_ms, 10000),
    );
    if (!r.ok) throw new AdapterFailure(r.err);
  },
};

/* ---------- OpenAI Whisper / STT ---------- */
const openAiSttAdapter: Adapter = {
  async call(p, payload) {
    const key = requireKey(p);
    const base = p.base_url || "https://api.openai.com/v1";
    const body = payload as any;
    const bin = Buffer.from(body.audioBase64, "base64");
    const form = new FormData();
    form.append("file", new Blob([bin], { type: body.mime || "audio/mpeg" }), "audio");
    form.append("model", p.model || "gpt-4o-mini-transcribe");
    const { signal, cancel } = withTimeout(p.timeout_ms);
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/audio/transcriptions`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}` },
        body: form,
        signal,
      });
      const text = await res.text();
      if (!res.ok) throw new AdapterFailure({ status: classify(res.status), code: String(res.status), message: text.slice(0, 500) });
      const data = JSON.parse(text);
      return { text: data?.text ?? "", raw: data };
    } catch (e: any) {
      if (e instanceof AdapterFailure) throw e;
      const aborted = e?.name === "AbortError";
      throw new AdapterFailure({
        status: aborted ? "timeout" : "server_down",
        message: aborted ? `Timed out after ${p.timeout_ms}ms` : String(e?.message || e),
      });
    } finally {
      cancel();
    }
  },
  async ping(p) {
    const key = requireKey(p);
    const base = p.base_url || "https://api.openai.com/v1";
    const r = await fetchJson(
      `${base.replace(/\/$/, "")}/models`,
      { method: "GET", headers: { authorization: `Bearer ${key}` } },
      Math.min(p.timeout_ms, 10000),
    );
    if (!r.ok) throw new AdapterFailure(r.err);
  },
};

/* ---------- ElevenLabs TTS ---------- */
const elevenLabsAdapter: Adapter = {
  async call(p, payload) {
    const key = requireKey(p);
    const body = payload as any;
    const voice = body.voice || p.model || "21m00Tcm4TlvDq8ikWAM";
    const { signal, cancel } = withTimeout(p.timeout_ms);
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "xi-api-key": key,
          accept: "audio/mpeg",
        },
        body: JSON.stringify({ text: body.input, model_id: "eleven_multilingual_v2" }),
        signal,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new AdapterFailure({ status: classify(res.status), code: String(res.status), message: t.slice(0, 500) });
      }
      const buf = await res.arrayBuffer();
      return { audioBase64: Buffer.from(buf).toString("base64") };
    } catch (e: any) {
      if (e instanceof AdapterFailure) throw e;
      const aborted = e?.name === "AbortError";
      throw new AdapterFailure({
        status: aborted ? "timeout" : "server_down",
        message: aborted ? `Timed out after ${p.timeout_ms}ms` : String(e?.message || e),
      });
    } finally {
      cancel();
    }
  },
  async ping(p) {
    const key = requireKey(p);
    const r = await fetchJson(
      "https://api.elevenlabs.io/v1/user",
      { method: "GET", headers: { "xi-api-key": key } },
      Math.min(p.timeout_ms, 10000),
    );
    if (!r.ok) throw new AdapterFailure(r.err);
  },
};

export function getAdapter(vendor: string): Adapter {
  switch (vendor) {
    case "gemini":
      return geminiAdapter;
    case "openai":
      return openAiAdapter("https://api.openai.com/v1");
    case "grok":
      return openAiAdapter("https://api.x.ai/v1");
    case "openrouter":
      return openAiAdapter("https://openrouter.ai/api/v1");
    case "claude":
      return claudeAdapter;
    case "openai_image":
      return openAiImageAdapter;
    case "stability":
      return stabilityAdapter;
    case "openai_tts":
      return openAiTtsAdapter;
    case "openai_stt":
      return openAiSttAdapter;
    case "elevenlabs":
      return elevenLabsAdapter;
    default:
      throw new AdapterFailure({ status: "api_error", message: `Unknown vendor: ${vendor}` });
  }
}

export type { AnyPayload, ProviderRow };