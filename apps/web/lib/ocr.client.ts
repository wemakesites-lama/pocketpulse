"use client";

// Client-side OCR via Tesseract.js. Runs entirely in the browser (worker + wasm), so the
// receipt image never leaves the device — only the recognised TEXT is sent to the
// extraction pipeline. Tesseract is dynamically imported so it code-splits out of the
// main bundle and never touches the server.

export async function ocrImage(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return (data.text ?? "").trim();
  } finally {
    await worker.terminate();
  }
}
