import { NextRequest, NextResponse } from "next/server";
import { analyseRecords, GroqError } from "@/lib/analyse.server";
import { MAX_RECORDS_PER_BATCH } from "@pocketpulse/core";

// PART 6 · AI INTEGRATION — the single server route. Every response uses the 4.6 error
// envelope so the UI has ONE code path.

export const runtime = "nodejs";
export const maxDuration = 60;

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

type InputSource = "text" | "voice" | "image";
type IncomingRecord =
  | string
  | { source_id?: string; text?: string; raw?: string; input_source?: InputSource };

function normalise(records: IncomingRecord[]): Array<{ source_id: string; text: string; input_source?: InputSource }> {
  return records
    .map((r, i) => {
      const id = `R-${String(i + 1).padStart(3, "0")}`;
      if (typeof r === "string") return { source_id: id, text: r };
      return { source_id: r.source_id ?? id, text: r.text ?? r.raw ?? "", input_source: r.input_source };
    })
    .filter((r) => r.text.trim().length > 0);
}

export async function POST(req: NextRequest) {
  let body: { records?: IncomingRecord[]; text?: string };
  try {
    body = await req.json();
  } catch {
    return cors(
      NextResponse.json(
        { ok: false, error: { kind: "unexpected", message: "Could not read the request.", retryable: false } },
        { status: 400 },
      ),
    );
  }

  // Accept either an array of records or a single pasted blob (split on blank-line groups).
  let incoming: IncomingRecord[] = body.records ?? [];
  if (incoming.length === 0 && typeof body.text === "string") {
    incoming = body.text.split(/\n[ \t]*\n[ \t]*\n+|\n[ \t]*-{3,}[ \t]*\n/).map((s) => s.trim()).filter(Boolean);
    if (incoming.length === 0 && body.text.trim()) incoming = [body.text.trim()];
  }

  let records = normalise(incoming);

  if (records.length === 0) {
    return cors(
      NextResponse.json(
        { ok: false, error: { kind: "empty_input", message: "Paste at least one receipt to check.", retryable: false } },
        { status: 400 },
      ),
    );
  }

  let capped = 0;
  if (records.length > MAX_RECORDS_PER_BATCH) {
    capped = records.length - MAX_RECORDS_PER_BATCH;
    records = records.slice(0, MAX_RECORDS_PER_BATCH);
  }

  try {
    const result = await analyseRecords(records);
    return cors(NextResponse.json({ ok: true, data: { ...result, capped } }));
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
        { ok: false, error: { kind: "unexpected", message: "Something went wrong while reading your receipts.", retryable: true } },
        { status: 500 },
      ),
    );
  }
}
