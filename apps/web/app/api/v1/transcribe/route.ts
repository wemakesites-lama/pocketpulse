import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio, GroqError } from "@/lib/groq";

// PART 6 · AI INTEGRATION — speech-to-text. Takes recorded microphone audio, hands it to
// Groq's Whisper endpoint, and returns the transcript. Same 4.6 error envelope as /analyse
// so the UI keeps ONE code path. The recognised TEXT then goes through the normal
// extraction+rules pipeline as a record with input_source "voice".

export const runtime = "nodejs";
export const maxDuration = 60;

// Guard against oversized uploads (a runaway recording). ~40s of Opus audio is well under this.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB — Groq's per-file limit

function cors(res: NextResponse): NextResponse {
  const origin = process.env.NODE_ENV === "production" ? (process.env.APP_ORIGIN ?? "") : "*";
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return cors(
      NextResponse.json(
        { ok: false, error: { kind: "unexpected", message: "Could not read the recording.", retryable: false } },
        { status: 400 },
      ),
    );
  }

  const audio = form.get("audio");
  const language = form.get("language");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return cors(
      NextResponse.json(
        { ok: false, error: { kind: "empty_input", message: "No audio was recorded. Hold the button and speak.", retryable: false } },
        { status: 400 },
      ),
    );
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return cors(
      NextResponse.json(
        { ok: false, error: { kind: "empty_input", message: "That recording is too long. Keep it under about half a minute.", retryable: false } },
        { status: 413 },
      ),
    );
  }

  try {
    const filename = audio instanceof File && audio.name ? audio.name : "receipt.webm";
    const text = await transcribeAudio(audio, {
      filename,
      language: typeof language === "string" && language ? language : undefined,
    });
    return cors(NextResponse.json({ ok: true, data: { text } }));
  } catch (err) {
    if (err instanceof GroqError) {
      return cors(
        NextResponse.json(
          { ok: false, error: { kind: err.kind, message: err.message, retryable: err.retryable } },
          { status: err.kind === "provider_unauthorised" ? 401 : 502 },
        ),
      );
    }
    return cors(
      NextResponse.json(
        { ok: false, error: { kind: "unexpected", message: "Something went wrong while listening to your recording.", retryable: true } },
        { status: 500 },
      ),
    );
  }
}
