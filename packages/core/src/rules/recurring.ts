import type { Flag, LedgerRow } from "../schemas";

// -----------------------------------------------------------------------------
// 5.5 Recurring commitments. A record is recurring ONLY if the document states it.
// NEVER infer recurrence from a pattern across records.
//
// Output { monthly, annual, basis: "stated on the document" } and a recurring_commitment
// flag at LOW severity rendering BLUE (information, not a problem). It never blocks approval.
// Annual = monthly * 12, labelled "a year, if nothing changes".
// -----------------------------------------------------------------------------

const RECURRENCE_WORDS = /\b(monthly|per month|subscription)\b/i;

export function statesRecurring(row: LedgerRow): boolean {
  if (row.states_recurring) return true;
  const haystack = `${row.description ?? ""} ${row.recurrence_evidence ?? ""}`;
  if (RECURRENCE_WORDS.test(haystack)) return true;
  if (row.payment_method === "debit_order" && RECURRENCE_WORDS.test(row.description ?? "")) return true;
  return false;
}

export function applyRecurring(row: LedgerRow): LedgerRow {
  if (row.stated_total === null || !statesRecurring(row)) return row;

  const monthly = row.stated_total;
  const annual = monthly * 12;

  const recurringFlag: Flag = {
    code: "recurring_commitment",
    severity: "low", // never blocks approval; deriveStatus ignores this code
    message: "This is a repeating payment.",
    amount_label: null,
    evidence: [row.source_id],
    financial_effect_zar: monthly,
    is_estimate: false,
    resolved: false,
    resolution: null,
  };

  return {
    ...row,
    recurring: { monthly, annual, basis: "stated on the document" },
    flags: [...row.flags, recurringFlag],
  };
}
