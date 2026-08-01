import "server-only";
import {
  ExtractedTransaction,
  BatchInsight,
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserMessage,
  INSIGHT_SYSTEM_PROMPT,
  buildInsightUserMessage,
  buildRepairMessage,
  recompute,
  finaliseInsights,
  fallbackInsights,
  batchTotals,
  categoryBreakdown,
  recurringList,
  dateRange,
  type LedgerRow,
  type Insight,
  type InsightSummary,
} from "@pocketpulse/core";
import { chatJson, GroqError, groqModelId } from "./groq";

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

// Extract one record. One repair retry on Zod failure; two failures => null (unparseable).
async function extractOne(source_id: string, text: string): Promise<ExtractedTransaction | null> {
  const messages = [
    { role: "system" as const, content: EXTRACTION_SYSTEM_PROMPT },
    { role: "user" as const, content: buildExtractionUserMessage(text) },
  ];

  const tryParse = (raw: string) => {
    const obj = JSON.parse(stripFences(raw));
    return ExtractedTransaction.parse({ ...obj, source_id });
  };

  const first = await chatJson(messages);
  try {
    return tryParse(first);
  } catch (err) {
    // one repair retry with the validation error appended
    const repair = await chatJson([
      ...messages,
      { role: "assistant" as const, content: first },
      { role: "user" as const, content: buildRepairMessage(String((err as Error).message)) },
    ]);
    try {
      return tryParse(repair);
    } catch {
      return null; // unparseable_record — never a third retry
    }
  }
}

export interface AnalyseResult {
  ledger: LedgerRow[];
  insights: Insight[];
  batch_summary: string;
  unread: string[];
  model: { provider: "groq"; model_id: string };
}

export async function analyseRecords(records: Array<{ source_id: string; text: string }>): Promise<AnalyseResult> {
  // Extraction — Promise.allSettled, never a sequential loop. A rejection becomes an
  // unparseable record rather than killing the batch.
  const settled = await Promise.allSettled(records.map((r) => extractOne(r.source_id, r.text)));

  const extracted: ExtractedTransaction[] = [];
  const unread: string[] = [];
  let systemic: GroqError | null = null;
  settled.forEach((s, i) => {
    if (s.status === "fulfilled" && s.value) extracted.push(s.value);
    else {
      unread.push(records[i]!.source_id);
      if (s.status === "rejected" && s.reason instanceof GroqError) systemic = s.reason;
    }
  });

  // A systemic provider failure (no key, unreachable, rate-limited) that took out the
  // whole batch surfaces as the error card. If SOME records parsed, we keep them as
  // partial results instead (spec §4.6 / §11.9).
  if (extracted.length === 0 && systemic) throw systemic;

  const ledger = recompute(extracted);

  // Insight — narrates computed truth. Falls back to templated insights on any failure.
  const summary = buildSummary(ledger);
  const flags = ledger.flatMap((r) => r.flags);
  let insights: Insight[];
  let batch_summary: string;
  try {
    const raw = await chatJson([
      { role: "system", content: INSIGHT_SYSTEM_PROMPT },
      { role: "user", content: buildInsightUserMessage(summary, ledger, flags) },
    ]);
    const parsed = BatchInsight.parse(JSON.parse(stripFences(raw)));
    insights = finaliseInsights(parsed.insights, ledger);
    batch_summary = parsed.batch_summary;
  } catch {
    insights = fallbackInsights(ledger);
    batch_summary = defaultSummary(ledger);
  }

  return { ledger, insights, batch_summary, unread, model: { provider: "groq", model_id: groqModelId() } };
}

function buildSummary(rows: LedgerRow[]): InsightSummary {
  const totals = batchTotals(rows);
  const range = dateRange(rows);
  return {
    recordCount: totals.record_count,
    grossTotal: totals.gross_total,
    totalVat: totals.total_vat,
    vatAtRisk: totals.vat_at_risk,
    unconfirmedVatCount: totals.vat_unconfirmed_count,
    categoryBreakdown: categoryBreakdown(rows),
    recurring: recurringList(rows).map((r) => ({ merchant: r.merchant, monthly: r.monthly, evidence: r.evidence })),
    earliestDate: range.earliest,
    latestDate: range.latest,
  };
}

function defaultSummary(rows: LedgerRow[]): string {
  const t = batchTotals(rows);
  const attention = rows.filter((r) => r.review_status !== "clean" && r.review_status !== "approved").length;
  return attention === 0
    ? `We read ${t.record_count} receipts and found nothing that needs fixing.`
    : `We read ${t.record_count} receipts. ${attention} need a closer look before you claim.`;
}

export { GroqError };
