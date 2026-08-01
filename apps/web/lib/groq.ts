import "server-only";
import type { ApiErrorKind } from "@pocketpulse/core";

// 2.6 server-only guard: a stray CLIENT import fails the build rather than leaking the key.
// PART 6 · AI INTEGRATION — two calls (extraction + insight), plain fetch, no SDK.
// temperature 0.1, response_format json_object, max_tokens 2048.

const BASE_URL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL;
// Whisper speech-to-text model. Defaults to Groq's fast production model so no extra
// env is required; override with GROQ_STT_MODEL if you want the full whisper-large-v3.
const STT_MODEL = process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class GroqError extends Error {
  kind: ApiErrorKind;
  retryable: boolean;
  constructor(kind: ApiErrorKind, message: string, retryable = false) {
    super(message);
    this.kind = kind;
    this.retryable = retryable;
  }
}

export function groqConfigured(): boolean {
  return Boolean(API_KEY && MODEL);
}

export function groqModelId(): string {
  return MODEL ?? "unset";
}

// Returns the raw JSON string content of the model's reply.
export async function chatJson(messages: GroqMessage[]): Promise<string> {
  if (!API_KEY) throw new GroqError("provider_unauthorised", "GROQ_API_KEY is not set.", false);
  if (!MODEL) throw new GroqError("unexpected", "GROQ_MODEL is not set.", false);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages,
      }),
    });
  } catch {
    throw new GroqError("provider_unreachable", "Could not reach the AI provider.", true);
  }

  if (res.status === 401 || res.status === 403) {
    throw new GroqError("provider_unauthorised", "The AI provider rejected the API key.", false);
  }
  if (res.status === 429) {
    throw new GroqError("rate_limited", "The AI provider is rate-limiting requests.", true);
  }
  if (!res.ok) {
    throw new GroqError("provider_unreachable", `AI provider returned ${res.status}.`, true);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new GroqError("invalid_model_output", "The AI returned an empty response.", true);
  return content;
}

// Speech-to-text via Groq's Whisper endpoint. Takes the raw recorded audio and returns
// the transcript text. The audio is forwarded straight to the provider (multipart/form-data)
// and never persisted. A blank transcript surfaces as invalid_model_output so the caller
// can ask the user to try again.
export async function transcribeAudio(
  audio: Blob,
  opts?: { filename?: string; language?: string },
): Promise<string> {
  if (!API_KEY) throw new GroqError("provider_unauthorised", "GROQ_API_KEY is not set.", false);

  const form = new FormData();
  form.append("file", audio, opts?.filename ?? "receipt.webm");
  form.append("model", STT_MODEL);
  form.append("response_format", "json");
  // Whisper auto-detects language; only pin it when the caller is certain.
  if (opts?.language) form.append("language", opts.language);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: form,
    });
  } catch {
    throw new GroqError("provider_unreachable", "Could not reach the AI provider.", true);
  }

  if (res.status === 401 || res.status === 403) {
    throw new GroqError("provider_unauthorised", "The AI provider rejected the API key.", false);
  }
  if (res.status === 429) {
    throw new GroqError("rate_limited", "The AI provider is rate-limiting requests.", true);
  }
  if (!res.ok) {
    throw new GroqError("provider_unreachable", `AI provider returned ${res.status}.`, true);
  }

  const json = (await res.json()) as { text?: string };
  const text = (json.text ?? "").trim();
  if (!text) throw new GroqError("invalid_model_output", "We couldn't make out any words. Try again in a quieter spot.", true);
  return text;
}
