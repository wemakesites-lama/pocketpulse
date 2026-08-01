import type { Flag, LedgerRow } from "../schemas";
import { formatZAR } from "../format";

// 6.2 Insight — system message. Verbatim from the spec.
// Runs AFTER the rules engine, receiving computed truth. A writer with a fact sheet,
// not an analyst with a calculator.

export const INSIGHT_SYSTEM_PROMPT = `You are the analysis layer of a South African small-business bookkeeping tool.

You are given transactions that have ALREADY been validated by a deterministic rules
engine. All arithmetic has been done. All flags were raised by code, not by you.

YOUR JOB
Turn those computed findings into clear, useful insights for a business owner who is
not an accountant.

ABSOLUTE RULES
1. You may only cite transaction IDs that appear in the data supplied to you. Citing an
   ID you were not given is the most serious error you can make.
2. You may not introduce any figure not present in the supplied data. Do not estimate,
   extrapolate, or compare to a period you were not given.
3. You may not describe trends over time. The data does not span enough time.
4. Every insight must cite at least one transaction ID.
5. If the batch is clean, say so plainly in one insight. Do not manufacture a problem.

TONE
Plain English, addressed as "you". No accounting jargon. No advice about tax
obligations, SARS, or compliance: this tool does not give tax advice.

OUTPUT
Return a single JSON object. No markdown fences, no prose outside the JSON.
{
  "batch_summary": "Two or three sentences.",
  "insights": [{
    "id": "INS-1",
    "claim": "What was found, in one sentence.",
    "supporting_transactions": ["EXP-001"],
    "financial_effect_zar": number | null,
    "recommended_action": "What the owner should do next.",
    "reasoning": "Why this matters, one or two sentences.",
    "confidence": "low" | "medium" | "high"
  }],
  "batch_clarification_questions": ["..."]
}`;

export interface InsightSummary {
  recordCount: number;
  grossTotal: number;
  totalVat: number;
  vatAtRisk: number;
  unconfirmedVatCount: number;
  categoryBreakdown: Array<{ category: string; amount: number; percent: number }>;
  recurring: Array<{ merchant: string; monthly: number; evidence: string }>;
  earliestDate: string | null;
  latestDate: string | null;
}

// 6.2 User message — built entirely from rules-engine output. Every rand is templated
// in from computed figures; the model never sees a number it can re-derive.
export function buildInsightUserMessage(
  summary: InsightSummary,
  rows: LedgerRow[],
  flags: Flag[],
): string {
  const cats = summary.categoryBreakdown
    .map((c) => `${c.category}: ${formatZAR(c.amount)} (${c.percent.toFixed(1)}%)`)
    .join(", ");
  const recur = summary.recurring
    .map((r) => `${r.merchant}, ${formatZAR(r.monthly)}/month, evidence "${r.evidence}"`)
    .join("; ");

  const txnTable = rows
    .map(
      (r) =>
        `${r.source_id} | ${r.merchant ?? "—"} | ${r.date ?? "—"} | ${
          r.stated_total !== null ? formatZAR(r.stated_total) : "—"
        } | ${r.computed_vat !== null ? formatZAR(r.computed_vat) : "not confirmed"} | ${r.category} | ${r.payment_method}`,
    )
    .join("\n");

  const flagTable = flags
    .map(
      (f) =>
        `${f.code} | ${f.severity} | ${f.message} | evidence: ${f.evidence.join(",")} | ${
          f.financial_effect_zar !== null ? formatZAR(f.financial_effect_zar) : "—"
        }`,
    )
    .join("\n");

  return `SUMMARY (computed by the rules engine):
- Records: ${summary.recordCount}
- Gross total: ${formatZAR(summary.grossTotal)}
- Total VAT calculated: ${formatZAR(summary.totalVat)}
- Input VAT at risk: ${formatZAR(summary.vatAtRisk)}
- Records with unconfirmed VAT status: ${summary.unconfirmedVatCount}
- Spend by category: ${cats}
- Recurring commitments: ${recur || "none"}
- Date range: ${summary.earliestDate ?? "—"} to ${summary.latestDate ?? "—"}

TRANSACTIONS:
source_id | merchant | date | total | computed_vat | category | payment_method
${txnTable}

FLAGS RAISED BY THE RULES ENGINE:
${flagTable || "none"}

Write the insights.`;
}
