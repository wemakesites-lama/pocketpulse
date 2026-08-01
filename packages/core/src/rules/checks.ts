import type { Flag, LedgerRow } from "../schemas";
import { toCents } from "./vat";
import { formatZAR } from "../format";
import { LARGE_CASH_THRESHOLD, UNUSUAL_AMOUNT_MIN_RECORDS } from "../types";

// -----------------------------------------------------------------------------
// 5.3 Checks. Run in order. Each returns zero or more Flags.
// `amount_label` is exactly what the UI shows inside the chip.
// -----------------------------------------------------------------------------

// Normalise a merchant name for duplicate matching:
// lowercase, strip punctuation, collapse whitespace.
export function normaliseMerchant(name: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.abs(Math.round((da - db) / 86_400_000));
}

function flag(partial: Omit<Flag, "is_estimate" | "resolved" | "resolution"> & Partial<Flag>): Flag {
  return {
    is_estimate: false,
    resolved: false,
    resolution: null,
    ...partial,
  };
}

// --- Row-level checks -------------------------------------------------------
// Self-contained per record. Fully specified and unambiguous.

export function rowChecks(row: LedgerRow): Flag[] {
  const flags: Flag[] = [];
  const self = [row.source_id];

  // missing_merchant · high
  if (!row.merchant || row.merchant.trim() === "") {
    flags.push(
      flag({
        code: "missing_merchant",
        severity: "high",
        message: "No shop name found on this receipt.",
        amount_label: null,
        evidence: self,
        financial_effect_zar: null,
      }),
    );
  }

  // missing_date · medium — amount_label filled in claimability once vat_at_risk is known
  if (row.date === null) {
    flags.push(
      flag({
        code: "missing_date",
        severity: "medium",
        message: "No date on the slip.",
        amount_label: null,
        evidence: self,
        financial_effect_zar: row.computed_vat,
      }),
    );
  }

  // no_vat_number · low (only when supplier is not marked not_registered)
  if (!row.vat_number_present && row.vat_status !== "not_registered") {
    flags.push(
      flag({
        code: "no_vat_number",
        severity: "low",
        message: "No VAT number.",
        amount_label: null,
        evidence: self,
        financial_effect_zar: null,
      }),
    );
  }

  // vat_status_unknown · medium
  if (row.vat_status === "unknown") {
    flags.push(
      flag({
        code: "vat_status_unknown",
        severity: "medium",
        message: "VAT not confirmed.",
        amount_label: null,
        evidence: self,
        financial_effect_zar: null,
        is_estimate: true,
      }),
    );
  }

  // vat_mismatch · high — both stated_vat and computed_vat non-null, |diff| > 2 cents
  if (
    row.stated_vat !== null &&
    row.computed_vat !== null &&
    Math.abs(toCents(row.stated_vat) - toCents(row.computed_vat)) > 2
  ) {
    flags.push(
      flag({
        code: "vat_mismatch",
        severity: "high",
        message: "VAT on the invoice is wrong.",
        amount_label: `${formatZAR(row.computed_vat)} at stake`,
        evidence: self,
        financial_effect_zar: row.computed_vat,
      }),
    );
  }

  // line_item_mismatch · medium — line totals all non-null and |sum - stated_total| > 2 cents
  if (
    row.stated_total !== null &&
    row.line_items.length > 0 &&
    row.line_items.every((li) => li.line_total !== null)
  ) {
    const sum = row.line_items.reduce((s, li) => s + toCents(li.line_total!), 0);
    const varianceCents = toCents(row.stated_total) - sum;
    if (Math.abs(varianceCents) > 2) {
      const variance = varianceCents / 100;
      flags.push(
        flag({
          code: "line_item_mismatch",
          severity: "medium",
          message: "Items add up to less than the total.",
          amount_label: `${formatZAR(Math.abs(variance))} missing`,
          evidence: self,
          financial_effect_zar: variance,
        }),
      );
    }
  }

  // large_cash_transaction · high — cash and total >= 5000
  if (row.payment_method === "cash" && row.stated_total !== null && row.stated_total >= LARGE_CASH_THRESHOLD) {
    flags.push(
      flag({
        code: "large_cash_transaction",
        severity: "high",
        message: "Large cash payment.",
        amount_label: null,
        evidence: self,
        financial_effect_zar: null,
      }),
    );
  }

  return flags;
}

// --- Cross-record checks ----------------------------------------------------
// exact_duplicate, near_duplicate, unusual_amount. O(n^2) over at most 20 records —
// do not optimise (5.8).

export function crossChecks(rows: LedgerRow[]): LedgerRow[] {
  const next = rows.map((r) => ({ ...r, flags: [...r.flags] }));

  // exact_duplicate · high — same normalised merchant, same non-null date, same total in cents.
  // Flag every row in the group; set `pair` so the UI reads them as one problem.
  const groups = new Map<string, number[]>();
  next.forEach((r, i) => {
    if (r.date === null || r.stated_total === null) return;
    const key = `${normaliseMerchant(r.merchant)}|${r.date}|${toCents(r.stated_total)}`;
    const arr = groups.get(key) ?? [];
    arr.push(i);
    groups.set(key, arr);
  });
  for (const [key, idxs] of groups) {
    if (idxs.length < 2) continue;
    const evidence = idxs.map((i) => next[i]!.source_id);
    const pair = `dup:${key}`;
    for (const i of idxs) {
      const r = next[i]!;
      r.flags.push(
        flag({
          code: "exact_duplicate",
          severity: "high",
          message: "Paid twice.",
          amount_label: r.stated_total !== null ? `${formatZAR(r.stated_total)} duplicated` : null,
          evidence,
          financial_effect_zar: r.stated_total,
          pair,
        }),
      );
    }
  }

  // near_duplicate · medium — same merchant and total, dates 1–2 days apart or one null.
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i]!;
      const b = next[j]!;
      if (a.stated_total === null || b.stated_total === null) continue;
      if (normaliseMerchant(a.merchant) !== normaliseMerchant(b.merchant) || !a.merchant) continue;
      if (toCents(a.stated_total) !== toCents(b.stated_total)) continue;
      // skip if already an exact duplicate of each other
      const alreadyExact =
        a.date !== null && a.date === b.date;
      if (alreadyExact) continue;
      const oneNull = a.date === null || b.date === null;
      const close = a.date !== null && b.date !== null && daysBetween(a.date, b.date) >= 1 && daysBetween(a.date, b.date) <= 2;
      if (oneNull || close) {
        const evidence = [a.source_id, b.source_id];
        for (const r of [a, b]) {
          r.flags.push(
            flag({
              code: "near_duplicate",
              severity: "medium",
              message: "Looks like a possible repeat of another receipt.",
              amount_label: r.stated_total !== null ? `${formatZAR(r.stated_total)}` : null,
              evidence,
              financial_effect_zar: r.stated_total,
              pair: `near:${normaliseMerchant(a.merchant)}|${toCents(a.stated_total)}`,
            }),
          );
        }
      }
    }
  }

  // unusual_amount · medium — ONLY runs at 5+ records with non-null totals. MAD, not stddev.
  const totals = next.filter((r) => r.stated_total !== null).map((r) => r.stated_total!);
  if (totals.length >= UNUSUAL_AMOUNT_MIN_RECORDS) {
    const med = median(totals);
    const mad = median(totals.map((t) => Math.abs(t - med)));
    const threshold = med + 4 * (mad || med * 0.5);
    for (const r of next) {
      if (r.stated_total !== null && r.stated_total > threshold) {
        r.flags.push(
          flag({
            code: "unusual_amount",
            severity: "medium",
            message: "Larger than usual.",
            amount_label: `${formatZAR(r.stated_total)}`,
            evidence: [r.source_id],
            financial_effect_zar: null,
          }),
        );
      }
    }
  }

  return next;
}

// category_concentration · low, BATCH LEVEL — a category at 40%+ of gross with 3+ records.
// Returned separately (NOT attached to rows) so it never changes a row's clean status.
export function batchLevelFlags(rows: LedgerRow[]): Flag[] {
  const gross = rows.reduce((s, r) => s + (r.stated_total ?? 0), 0);
  if (gross <= 0) return [];
  const byCat = new Map<string, { total: number; ids: string[] }>();
  for (const r of rows) {
    if (r.stated_total === null) continue;
    const entry = byCat.get(r.category) ?? { total: 0, ids: [] };
    entry.total += r.stated_total;
    entry.ids.push(r.source_id);
    byCat.set(r.category, entry);
  }
  const out: Flag[] = [];
  for (const [cat, { total, ids }] of byCat) {
    const share = total / gross;
    if (share >= 0.4 && ids.length >= 3) {
      out.push(
        flag({
          code: "category_concentration",
          severity: "low",
          message: `Most of your spend (${Math.round(share * 100)}%) is in one area.`,
          amount_label: `${formatZAR(total)}`,
          evidence: ids,
          financial_effect_zar: null,
          resolution: cat,
        }),
      );
    }
  }
  return out;
}
