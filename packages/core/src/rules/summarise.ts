import type { LedgerRow } from "../schemas";
import { toCents, toRand } from "./vat";
import { normaliseMerchant } from "./checks";
import { batchVatAtRisk } from "./claimability";

// Batch-level roll-ups derived purely from LedgerRows. Every rand here is code-computed
// and safe to template into AI-written sentences (the model never types a number).

export interface BatchTotals {
  record_count: number;
  gross_total: number;
  total_vat: number; // sum of computed_vat (real figures only)
  vat_at_risk: number; // the "VAT you could lose" headline (§7.4 = R721.18)
  vat_unconfirmed_count: number; // rows with vat_status === "unknown"
}

export function batchTotals(rows: LedgerRow[]): BatchTotals {
  const grossCents = rows.reduce((s, r) => s + (r.stated_total !== null ? toCents(r.stated_total) : 0), 0);
  const vatCents = rows.reduce((s, r) => s + (r.computed_vat !== null ? toCents(r.computed_vat) : 0), 0);
  return {
    record_count: rows.length,
    gross_total: toRand(grossCents),
    total_vat: toRand(vatCents),
    vat_at_risk: batchVatAtRisk(rows),
    vat_unconfirmed_count: rows.filter((r) => r.vat_status === "unknown").length,
  };
}

// VAT-position donut — decomposes total VAT CALCULATED (real computed_vat only) into
// three segments that sum to it. Estimates (null computed_vat) sit outside (Resolution A).
export interface VatPosition {
  safe: number; // claimable, minus the double-counted duplicate copies
  atRisk: number; // at_risk / not_claimable rows that HAVE a computed_vat
  claimedTwice: number; // extra copies inside exact-duplicate groups
}

export function vatPosition(rows: LedgerRow[]): VatPosition {
  const totalVatCents = rows.reduce((s, r) => s + (r.computed_vat !== null ? toCents(r.computed_vat) : 0), 0);

  const atRiskCents = rows
    .filter((r) => (r.claim_status === "at_risk" || r.claim_status === "not_claimable") && r.computed_vat !== null)
    .reduce((s, r) => s + toCents(r.computed_vat!), 0);

  // Claimed twice: for each exact-duplicate group, (copies - 1) * that VAT.
  const groups = new Map<string, LedgerRow[]>();
  for (const r of rows) {
    if (r.date === null || r.stated_total === null) continue;
    if (!r.flags.some((f) => f.code === "exact_duplicate" && !f.resolved)) continue;
    const key = `${normaliseMerchant(r.merchant)}|${r.date}|${toCents(r.stated_total)}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  let claimedTwiceCents = 0;
  for (const g of groups.values()) {
    const vat = g[0]?.computed_vat ?? 0;
    claimedTwiceCents += (g.length - 1) * toCents(vat);
  }

  const safeCents = totalVatCents - atRiskCents - claimedTwiceCents;
  return { safe: toRand(safeCents), atRisk: toRand(atRiskCents), claimedTwice: toRand(claimedTwiceCents) };
}

export interface CategorySlice {
  category: string;
  amount: number;
  percent: number;
}

export function categoryBreakdown(rows: LedgerRow[]): CategorySlice[] {
  const grossCents = rows.reduce((s, r) => s + (r.stated_total !== null ? toCents(r.stated_total) : 0), 0);
  const byCat = new Map<string, number>();
  for (const r of rows) {
    if (r.stated_total === null) continue;
    byCat.set(r.category, (byCat.get(r.category) ?? 0) + toCents(r.stated_total));
  }
  return [...byCat.entries()]
    .map(([category, cents]) => ({
      category,
      amount: toRand(cents),
      percent: grossCents > 0 ? (cents / grossCents) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface RecurringSlice {
  source_id: string;
  merchant: string;
  monthly: number;
  annual: number;
  evidence: string;
}

export function recurringList(rows: LedgerRow[]): RecurringSlice[] {
  return rows
    .filter((r) => r.recurring !== null)
    .map((r) => ({
      source_id: r.source_id,
      merchant: r.merchant ?? "—",
      monthly: r.recurring!.monthly,
      annual: r.recurring!.annual,
      evidence: r.recurrence_evidence ?? "monthly",
    }));
}

export function dateRange(rows: LedgerRow[]): { earliest: string | null; latest: string | null } {
  const dates = rows.map((r) => r.date).filter((d): d is string => d !== null).sort();
  return { earliest: dates[0] ?? null, latest: dates.at(-1) ?? null };
}
