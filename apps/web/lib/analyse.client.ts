import {
  getBatch,
  recompute,
  fallbackInsights,
  batchTotals,
  EXTRACTED_BY_BATCH,
  type LedgerRow,
  type Insight,
} from "@pocketpulse/core";

export interface AnalyseData {
  ledger: LedgerRow[];
  insights: Insight[];
  batch_summary: string;
  unread: string[];
  model: { provider: "groq"; model_id: string };
  capped: number;
}

export type AnalyseOutcome =
  | { ok: true; data: AnalyseData }
  | { ok: false; error: { kind: string; message: string; retryable: boolean } };

function offlineSummary(ledger: LedgerRow[]): string {
  const t = batchTotals(ledger);
  const attention = ledger.filter((r) => r.review_status !== "clean").length;
  return attention === 0
    ? `We read ${t.record_count} receipts and found nothing that needs fixing.`
    : `We read ${t.record_count} receipts. ${attention} need a closer look before you claim.`;
}

// Offline analysis for the built-in samples: runs the pre-validated extraction through
// the rules engine and templated insights entirely client-side. Guarantees the demo
// works even when no GROQ key is configured (a designed degradation path).
function offlineBatch(batchId: "A" | "B" | "C"): AnalyseData {
  const ledger = recompute(EXTRACTED_BY_BATCH[batchId]);
  return {
    ledger,
    insights: fallbackInsights(ledger),
    batch_summary: offlineSummary(ledger),
    unread: [],
    model: { provider: "groq", model_id: "offline-fallback" },
    capped: 0,
  };
}

async function postAnalyse(body: unknown): Promise<AnalyseOutcome> {
  const res = await fetch("/api/v1/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as AnalyseOutcome;
}

// Sample buttons: try the live model, fall back to the offline pipeline on any failure.
export async function analyseSample(batchId: "A" | "B" | "C"): Promise<AnalyseData> {
  const batch = getBatch(batchId);
  const records = batch?.records.map((r) => ({ source_id: r.source_id, text: r.raw })) ?? [];
  try {
    const out = await postAnalyse({ records });
    if (out.ok) return out.data;
    return offlineBatch(batchId);
  } catch {
    return offlineBatch(batchId);
  }
}

// Pasted text: uses the live model. Errors surface to the UI (the readable error card).
export async function analysePaste(text: string): Promise<AnalyseOutcome> {
  try {
    return await postAnalyse({ text });
  } catch {
    return { ok: false, error: { kind: "provider_unreachable", message: "Could not reach the analyser.", retryable: true } };
  }
}

// Photo scan: OCR each image IN THE BROWSER (image never leaves the device), then send
// the recognised text — one record per image — through the same extraction+rules pipeline.
export async function scanImages(
  files: File[],
  onProgress?: (index: number, total: number, fraction: number) => void,
): Promise<AnalyseOutcome> {
  const { ocrImage } = await import("./ocr.client");
  const records: Array<{ source_id: string; text: string; input_source: "image" }> = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const text = await ocrImage(files[i]!, (f) => onProgress?.(i, files.length, f));
      if (text.trim().length > 10) {
        records.push({ source_id: `IMG-${String(i + 1).padStart(3, "0")}`, text, input_source: "image" });
      }
    } catch {
      /* skip an unreadable image; reported via the empty-records path below */
    }
  }
  if (records.length === 0) {
    return {
      ok: false,
      error: {
        kind: "empty_input",
        message: "We couldn't read any text from those photos. Try a clearer, well-lit, straight-on shot.",
        retryable: true,
      },
    };
  }
  try {
    return await postAnalyse({ records });
  } catch {
    return { ok: false, error: { kind: "provider_unreachable", message: "Could not reach the analyser.", retryable: true } };
  }
}
