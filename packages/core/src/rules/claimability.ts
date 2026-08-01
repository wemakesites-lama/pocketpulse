import type { Flag, LedgerRow } from "../schemas";
import { ABRIDGED_THRESHOLD, FULL_INVOICE_THRESHOLD } from "../types";
import { estimateInclusiveVat, toCents, toRand } from "./vat";
import { formatZAR } from "../format";
import { isTrustedDigitalVendor } from "./trustedVendors";

// Documentary formatting fields that trusted digital vendors reliably print but
// that extraction under-reads on non-slip (email/PDF/in-app) layouts. Relaxed for
// trusted vendors only — never the supplier VAT number (see trustedVendors.ts).
const RELAXABLE_FOR_TRUSTED = new Set<string>([
  "has_tax_invoice_wording",
  "supplier_address_present",
  "recipient_details_present",
  "invoice_serial",
]);

// -----------------------------------------------------------------------------
// 5.4 Claimability — THE PRODUCT.
// Section 20 of the VAT Act sets three tiers by VAT-INCLUSIVE value.
//
// Language discipline (non-negotiable): every message is about the DOCUMENT,
// never about the user's tax position.
// -----------------------------------------------------------------------------

export type ClaimStatus =
  | "claimable"
  | "at_risk"
  | "not_claimable"
  | "no_vat_applicable"
  | "unknown";

const ABRIDGED_REQUIRED = [
  "has_tax_invoice_wording",
  "merchant",
  "supplier_address_present",
  "supplier_vat_number",
  "invoice_serial",
  "date",
  "description_present",
] as const;

// Resolution C & D: use ABRIDGED_REQUIRED (no `abridgedList`); none_required needs no
// extra fields — a till slip showing VAT is enough.
const REQUIRED_BY_TIER: Record<"none_required" | "abridged" | "full", readonly string[]> = {
  none_required: [],
  abridged: ABRIDGED_REQUIRED,
  full: [...ABRIDGED_REQUIRED, "recipient_details_present"],
};

export function isAbsent(row: LedgerRow, field: string): boolean {
  switch (field) {
    case "merchant":
      return !row.merchant || row.merchant.trim() === "";
    case "date":
      return row.date === null;
    case "supplier_vat_number":
      return row.supplier_vat_number === null;
    case "invoice_serial":
      return row.invoice_serial === null;
    case "has_tax_invoice_wording":
      return !row.has_tax_invoice_wording;
    case "supplier_address_present":
      return !row.supplier_address_present;
    case "description_present":
      return !row.description_present;
    case "recipient_details_present":
      return !row.recipient_details_present;
    case "correct_vat_amount":
      return true; // only ever pushed when already known absent
    default:
      return false;
  }
}

export function tierFor(statedTotal: number): "none_required" | "abridged" | "full" {
  return statedTotal > FULL_INVOICE_THRESHOLD
    ? "full"
    : statedTotal > ABRIDGED_THRESHOLD
      ? "abridged"
      : "none_required";
}

function flag(partial: Omit<Flag, "is_estimate" | "resolved" | "resolution"> & Partial<Flag>): Flag {
  return { is_estimate: false, resolved: false, resolution: null, ...partial };
}

// Assess one row against the tier requirements for its value, attach the resulting
// claim fields and flags, and back-fill the missing_date amount_label now that the
// exposure is known.
export function applyClaimability(row: LedgerRow): LedgerRow {
  const flags = [...row.flags];

  if (row.stated_total === null) {
    return { ...row, flags, claim_status: "unknown", invoice_tier: null };
  }

  // Supplier is not a VAT vendor: nothing charged, nothing to claim. NOT a problem.
  if (row.vat_status === "not_registered") {
    return {
      ...row,
      flags,
      invoice_tier: null,
      claim_status: "no_vat_applicable",
      claim_missing_fields: [],
      vat_at_risk: null,
      vat_at_risk_is_estimate: false,
    };
  }

  const tier = tierFor(row.stated_total);
  const trusted = isTrustedDigitalVendor(row);
  const missing = REQUIRED_BY_TIER[tier]
    .filter((f) => isAbsent(row, f))
    // Trusted digital vendors (Uber, AWS, Google…) issue compliant tax invoices;
    // only their layout trips up extraction. Forgive the formatting fields — but
    // never the supplier VAT number, without which there is nothing to claim.
    .filter((f) => !(trusted && RELAXABLE_FOR_TRUSTED.has(f)));

  // A stated VAT amount that is wrong is a content failure, not just arithmetic.
  if (flags.some((f) => f.code === "vat_mismatch")) missing.push("correct_vat_amount");

  const exposure =
    row.computed_vat ??
    (row.vat_status === "unknown" ? estimateInclusiveVat(row.stated_total) : null);

  const isEstimate = row.vat_status === "unknown";

  const claim_status: ClaimStatus =
    missing.length === 0
      ? "claimable"
      : row.vat_status === "unknown"
        ? "at_risk"
        : missing.includes("supplier_vat_number")
          ? "not_claimable"
          : "at_risk";

  const vat_at_risk = missing.length ? exposure : null;

  // invalid_tax_invoice · medium — when status is at_risk or not_claimable.
  if (claim_status === "at_risk" || claim_status === "not_claimable") {
    flags.push(
      flag({
        code: "invalid_tax_invoice",
        severity: "medium",
        message: "This document is missing something a tax invoice needs.",
        amount_label: vat_at_risk !== null ? `${formatZAR(vat_at_risk)} could be lost` : null,
        evidence: [row.source_id],
        financial_effect_zar: vat_at_risk,
        is_estimate: isEstimate,
      }),
    );
  }

  // full_invoice_required · high — tier is full and recipient details are absent.
  // High correctly blocks approval: a five-figure purchase with no valid document is
  // exactly what a human must look at. (Resolution B: excluded from the at-risk headline.)
  if (tier === "full" && isAbsent(row, "recipient_details_present") && !trusted) {
    flags.push(
      flag({
        code: "full_invoice_required",
        severity: "high",
        message: "A purchase this size needs a full tax invoice with your own business details.",
        amount_label: vat_at_risk !== null ? `up to ${formatZAR(vat_at_risk)}` : null,
        evidence: [row.source_id],
        financial_effect_zar: vat_at_risk,
        is_estimate: isEstimate,
      }),
    );
  }

  // Back-fill missing_date amount_label ("R{at_risk} at stake").
  for (const f of flags) {
    if (f.code === "missing_date" && f.amount_label === null && vat_at_risk !== null) {
      f.amount_label = `${formatZAR(vat_at_risk)} at stake`;
    }
  }

  return {
    ...row,
    flags,
    invoice_tier: tier,
    claim_status,
    claim_missing_fields: missing,
    vat_at_risk,
    vat_at_risk_is_estimate: isEstimate,
  };
}

// -----------------------------------------------------------------------------
// Batch "VAT you could lose" headline (§7.4 = R721.18).
// Resolution A & B: sum vat_at_risk EXCLUDING
//   - rows with an unresolved exact_duplicate flag (avoid double-count), AND
//   - rows with a full_invoice_required flag (unbounded exposure — surfaced separately
//     as an "up to R X" figure, not folded into the headline).
// Includes bounded unknown-status estimates (e.g. EXP-008 R41.48).
// -----------------------------------------------------------------------------
export function batchVatAtRisk(rows: LedgerRow[]): number {
  const cents = rows
    .filter((r) => !r.flags.some((f) => f.code === "exact_duplicate" && !f.resolved))
    .filter((r) => !r.flags.some((f) => f.code === "full_invoice_required" && !f.resolved))
    .reduce((sum, r) => sum + (r.vat_at_risk !== null ? toCents(r.vat_at_risk) : 0), 0);
  return toRand(cents);
}

// The separate "up to R X" figure for full-invoice-required rows (e.g. EXP-012).
export function batchUnboundedEstimate(rows: LedgerRow[]): number {
  const cents = rows
    .filter((r) => r.flags.some((f) => f.code === "full_invoice_required" && !f.resolved))
    .reduce((sum, r) => sum + (r.vat_at_risk !== null ? toCents(r.vat_at_risk) : 0), 0);
  return toRand(cents);
}
