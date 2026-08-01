"use client";

// Client-side microphone capture via MediaRecorder. Records to a single Blob that the
// caller posts to /api/v1/transcribe. Nothing is written to disk; the stream is stopped
// and its tracks released the moment recording ends, so the mic light goes off.

export type Recorder = {
  stop: () => Promise<Blob>;
  cancel: () => void;
  mimeType: string;
};

// Pick the first container the browser can actually produce. Chrome/Firefox give webm/opus,
// Safari gives mp4 — Groq's Whisper accepts all of them.
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

// Starts recording immediately. Rejects if mic permission is denied or unavailable —
// the caller maps that to a readable message.
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const release = () => stream.getTracks().forEach((t) => t.stop());

  return {
    mimeType: recorder.mimeType || mimeType || "audio/webm",
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          release();
          resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        };
        recorder.onerror = (e) => {
          release();
          reject((e as unknown as { error?: Error }).error ?? new Error("Recording failed."));
        };
        if (recorder.state !== "inactive") recorder.stop();
        else {
          release();
          resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        }
      }),
    cancel: () => {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } finally {
        release();
      }
    },
  };
}
