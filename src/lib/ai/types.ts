export type Category = "text" | "image" | "voice_tts" | "voice_stt";
export type MessageType = "text" | "image" | "voice_tts" | "voice_stt" | "mixed";
export type RequestStatus =
  | "success"
  | "timeout"
  | "rate_limit"
  | "api_error"
  | "invalid"
  | "server_down";

export interface ProviderRow {
  id: string;
  name: string;
  slug: string;
  vendor: string;
  category: Category;
  base_url: string | null;
  model: string | null;
  api_key: string | null;
  priority: number;
  weight: number;
  enabled: boolean;
  is_primary: boolean;
  timeout_ms: number;
  max_retries: number;
}

export interface TextPayload {
  prompt: string;
  system?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ImagePayload {
  prompt: string;
  size?: string;
}

export interface TtsPayload {
  input: string;
  voice?: string;
}

export interface SttPayload {
  audioBase64: string;
  mime?: string;
}

export type AnyPayload = TextPayload | ImagePayload | TtsPayload | SttPayload;

export interface AdapterResult {
  text?: string;
  imageBase64?: string;
  imageUrl?: string;
  audioBase64?: string;
  raw?: unknown;
}

export interface AdapterError {
  status: Exclude<RequestStatus, "success">;
  code?: string;
  message: string;
}

export interface Adapter {
  call(provider: ProviderRow, payload: AnyPayload): Promise<AdapterResult>;
  ping(provider: ProviderRow): Promise<void>;
}