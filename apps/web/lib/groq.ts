import "server-only";
import type { ApiErrorKind } from "@pocketpulse/core";

// 2.6 server-only guard: a stray CLIENT import fails the build rather than leaking the key.
// PART 6 · AI INTEGRATION — two calls (extraction + insight), plain fetch, no SDK.
// temperature 0.1, response_format json_object, max_tokens 2048.

const BASE_URL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL;

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
