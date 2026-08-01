import { VAT_RATE } from "../types";
import type { ExtractedTransaction, LedgerRow } from "../schemas";

// -----------------------------------------------------------------------------
// 5.1 Money handling — ALL arithmetic in integer cents.
// 4599 * 15 / 115 in floating point gives 599.8695652173913. Rounding at the wrong
// moment produces a one-cent variance that trips a false flag in front of a judge.
// -----------------------------------------------------------------------------

export const toCents = (r: number): number => Math.round(r * 100);
export const toRand = (c: number): number => c / 100;

// -----------------------------------------------------------------------------
// 5.2 VAT — branch strictly on vat_status. computed_vat is null (NEVER 0) for
// unknown / not_registered. Zero means "calculated and came to nothing", a
// different claim entirely.
// -----------------------------------------------------------------------------

export function computeVat(row: Pick<ExtractedTransaction, "stated_total" | "vat_status">): number | null {
  if (row.stated_total === null) return null;
  const total = toCents(row.stated_total);
  switch (row.vat_status) {
    case "inclusive":
      return toRand(Math.round((total * VAT_RATE) / (100 + VAT_RATE))); // total * 15 / 115
    case "exclusive":
      return toRand(Math.round((total * VAT_RATE) / 100)); // total * 15 / 100
    case "not_registered":
    case "unknown":
      return null; // NOT zero
  }
}

// net_amount: inclusive -> total minus VAT; exclusive -> the total as-is; otherwise null.
export function computeNet(
  row: Pick<ExtractedTransaction, "stated_total" | "vat_status">,
  computedVat: number | null,
): number | null {
  if (row.stated_total === null) return null;
  switch (row.vat_status) {
    case "inclusive":
      return computedVat === null
        ? null
        : toRand(toCents(row.stated_total) - toCents(computedVat));
    case "exclusive":
      return row.stated_total;
    case "not_registered":
    case "unknown":
      return null;
  }
}

// Estimate the VAT portion of an inclusive total when status is `unknown`.
// Used ONLY for the clearly-labelled estimate branch in claimability. Never rendered
// as a hard figure.
export function estimateInclusiveVat(statedTotal: number): number {
  return toRand(Math.round((toCents(statedTotal) * VAT_RATE) / (100 + VAT_RATE)));
}

// Apply VAT-derived fields to a row. Called first in the recompute pipeline.
export function applyVat(row: ExtractedTransaction): LedgerRow {
  const computed_vat = computeVat(row);
  const net_amount = computeNet(row, computed_vat);
  const vat_variance =
    row.stated_vat !== null && computed_vat !== null
      ? toRand(toCents(row.stated_vat) - toCents(computed_vat))
      : null;

  return {
    ...row,
    computed_vat,
    net_amount,
    vat_variance,
    line_item_sum: null,
    line_item_variance: null,
    invoice_tier: null,
    claim_status: "unknown",
    claim_missing_fields: [],
    vat_at_risk: null,
    vat_at_risk_is_estimate: false,
    recurring: null,
    flags: [],
    review_status: "clean",
    risk_level: "low",
    display_confidence: row.extraction_confidence,
    edited_fields: [],
    approved: false,
  };
}
