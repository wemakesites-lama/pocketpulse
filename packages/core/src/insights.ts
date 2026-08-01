import type { Flag, Insight, LedgerRow } from "./schemas";
import { toCents, toRand } from "./rules/vat";
import { formatZAR } from "./format";

// -----------------------------------------------------------------------------
// 4.4 Insight post-processing (mandatory, do not skip) + 6.3 templated fallback.
// Every rand in an insight comes from the rules engine, never from the model.
// -----------------------------------------------------------------------------

// Sum the rules-engine figure for the rows an insight cites (distinct source_ids).
function citedEffect(sourceIds: string[], rows: LedgerRow[]): number | null {
  const seen = new Set<string>();
  let cents = 0;
  let any = false;
  for (const id of sourceIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = rows.find((r) => r.source_id === id);
    if (!row) continue;
    const effect = row.vat_at_risk ?? row.flags.find((f) => f.financial_effect_zar !== null)?.financial_effect_zar ?? null;
    if (effect !== null) {
      cents += toCents(effect);
      any = true;
    }
  }
  return any ? toRand(cents) : null;
}

// 4.4 — drop citations not in the batch, drop citation-less insights, overwrite every
// financial_effect_zar with our figure. If nothing survives and flags exist, fall back.
export function finaliseInsights(modelInsights: Insight[], rows: LedgerRow[]): Insight[] {
  const validIds = new Set(rows.map((r) => r.source_id));
  const cleaned = modelInsights
    .map((ins) => ({
      ...ins,
      supporting_transactions: ins.supporting_transactions.filter((id) => validIds.has(id)),
    }))
    .filter((ins) => ins.supporting_transactions.length > 0)
    .map((ins) => ({ ...ins, financial_effect_zar: citedEffect(ins.supporting_transactions, rows) }));

  const hasFlags = rows.some((r) => r.flags.some((f) => !f.resolved && f.code !== "recurring_commitment"));
  if (cleaned.length === 0 && hasFlags) return fallbackInsights(rows);
  return cleaned;
}

const SEVERITY_RANK: Record<Flag["severity"], number> = { high: 3, medium: 2, low: 1 };

const CLAIM: Partial<Record<Flag["code"], (n: number, amt: string) => string>> = {
  exact_duplicate: (n, amt) => `The same bill appears ${n} times — ${amt} counted more than once.`,
  vat_mismatch: (_n, amt) => `The VAT printed on an invoice does not match what it should be; ${amt} of input VAT is exposed.`,
  missing_date: (_n, amt) => `A receipt has no readable date, which a tax invoice needs; ${amt} is exposed.`,
  line_item_mismatch: (_n, amt) => `The items on an invoice do not add up to its total, a gap of ${amt}.`,
  full_invoice_required: (_n, amt) => `A large purchase has no valid tax invoice; up to ${amt} of input VAT is exposed.`,
  large_cash_transaction: (n) => `${n === 1 ? "A" : n} large cash payment${n === 1 ? "" : "s"} may need extra proof of purchase.`,
  vat_status_unknown: (n) => `${n} receipt${n === 1 ? "" : "s"} do not confirm whether VAT was charged.`,
  no_vat_number: (n) => `${n} receipt${n === 1 ? "" : "s"} show no supplier VAT number.`,
  invalid_tax_invoice: (_n, amt) => `Some documents are missing something a tax invoice needs; ${amt} could be affected.`,
  unusual_amount: (n) => `${n} amount${n === 1 ? " is" : "s are"} larger than the rest of this batch and worth a second look.`,
  recurring_commitment: (n) => `${n} repeating payment${n === 1 ? "" : "s"} were found on your invoices.`,
  category_concentration: (_n, amt) => `Most of your spend (${amt}) sits in a single area.`,
  missing_merchant: (n) => `${n} receipt${n === 1 ? "" : "s"} have no shop name.`,
  near_duplicate: (n) => `${n} receipts look like possible repeats of one another.`,
};

const ACTION: Partial<Record<Flag["code"], string>> = {
  exact_duplicate: "Check your bank statement and remove whichever entry did not come off.",
  vat_mismatch: "Ask the supplier for a corrected tax invoice with the right VAT amount.",
  missing_date: "Add the date from your records, or ask the supplier to reissue the slip.",
  line_item_mismatch: "Ask the supplier what the unlisted charge is, then correct the total.",
  full_invoice_required: "Request a full tax invoice showing your own business details.",
  large_cash_transaction: "Keep the proof of purchase on file for this payment.",
  vat_status_unknown: "Confirm with the supplier whether the price includes VAT.",
  no_vat_number: "Ask the supplier for a tax invoice showing their VAT number.",
  invalid_tax_invoice: "Request a corrected tax invoice from the supplier.",
  unusual_amount: "Confirm this was expected, then approve it with a note.",
  recurring_commitment: "Note this in your monthly budget.",
  category_concentration: "No action needed — just something to be aware of.",
  missing_merchant: "Add the shop name from your records.",
  near_duplicate: "Compare the two receipts and keep only the real purchase.",
};

// 6.3 Templated fallback — generated from validated flags when the model is unavailable.
// A designed degradation path, not an apology.
export function fallbackInsights(rows: LedgerRow[]): Insight[] {
  const groups = new Map<Flag["code"], { evidence: Set<string>; severity: Flag["severity"]; effectCents: number; hasEffect: boolean }>();
  for (const row of rows) {
    for (const f of row.flags) {
      if (f.resolved) continue;
      const g = groups.get(f.code) ?? { evidence: new Set<string>(), severity: f.severity, effectCents: 0, hasEffect: false };
      f.evidence.forEach((e) => g.evidence.add(e));
      if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[g.severity]) g.severity = f.severity;
      groups.set(f.code, g);
    }
  }

  if (groups.size === 0) {
    return [
      {
        id: "INS-1",
        claim: "Nothing needs fixing in these receipts.",
        supporting_transactions: rows.map((r) => r.source_id),
        financial_effect_zar: null,
        recommended_action: "You can approve them as they are.",
        reasoning: "Every record passed the VAT, duplicate and paperwork checks.",
        confidence: "high",
      },
    ];
  }

  const ordered = [...groups.entries()].sort((a, b) => SEVERITY_RANK[b[1].severity] - SEVERITY_RANK[a[1].severity]);
  return ordered.map(([code, g], i) => {
    const evidence = [...g.evidence];
    const effect = citedEffect(evidence, rows);
    const n = code === "exact_duplicate" ? evidence.length : evidence.length;
    const amt = effect !== null ? formatZAR(effect) : "";
    const claim = (CLAIM[code] ?? ((_n: number) => `${evidence.length} record(s) need attention.`))(n, amt);
    return {
      id: `INS-${i + 1}`,
      claim,
      supporting_transactions: evidence,
      financial_effect_zar: effect,
      recommended_action: ACTION[code] ?? "Review these records and decide.",
      reasoning: "Generated from validated calculations.",
      confidence: "high",
    };
  });
}
