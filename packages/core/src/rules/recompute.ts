import type { ExtractedTransaction, Flag, LedgerRow } from "../schemas";
import { applyVat } from "./vat";
import { rowChecks, crossChecks } from "./checks";
import { applyClaimability } from "./claimability";
import { applyRecurring } from "./recurring";

// -----------------------------------------------------------------------------
// 5.6 Status derivation.
// -----------------------------------------------------------------------------

export function deriveStatus(flags: Flag[]): {
  review_status: LedgerRow["review_status"];
  risk_level: LedgerRow["risk_level"];
} {
  const open = flags.filter((f) => !f.resolved && f.code !== "recurring_commitment");
  if (open.length === 0) return { review_status: "clean", risk_level: "low" };
  if (open.some((f) => f.severity === "high")) return { review_status: "flagged", risk_level: "high" };
  return {
    review_status: "requires_review",
    risk_level: open.some((f) => f.severity === "medium") ? "medium" : "low",
  };
}

// Approval is blocked while any flag has severity === "high" and resolved === false.
export function canApprove(rows: LedgerRow[]): boolean {
  return !rows.some((r) => r.flags.some((f) => f.severity === "high" && !f.resolved));
}

// -----------------------------------------------------------------------------
// 5.7 Confidence — the honest heuristic. Display the word, never the number.
// -----------------------------------------------------------------------------

export function displayConfidence(row: LedgerRow): "low" | "medium" | "high" {
  const critical = ["merchant", "date", "stated_total", "vat_status"] as const;
  const present = critical.filter(
    (f) => row[f] !== null && row.vat_status !== "unknown",
  ).length;
  const completeness = present / critical.length;
  const modelScore = { low: 0.4, medium: 0.7, high: 1.0 }[row.extraction_confidence];
  const score = completeness * 0.6 + modelScore * 0.4;
  return score >= 0.8 ? "high" : score >= 0.55 ? "medium" : "low";
}

// -----------------------------------------------------------------------------
// 5.8 Recompute — ONE entry point, called on load and on every inline edit.
// Cross-checks are O(n^2) over at most 20 records; do not optimise.
// Preserve `resolved` / `resolution` on flags that still apply.
// -----------------------------------------------------------------------------

export function recompute(batch: ExtractedTransaction[]): LedgerRow[] {
  const withVat = batch.map(applyVat);
  const withRowFlags = withVat.map((r) => ({ ...r, flags: rowChecks(r) }));
  const withCross = crossChecks(withRowFlags); // duplicates, outliers
  const withClaim = withCross.map(applyClaimability);
  const withRecurring = withClaim.map(applyRecurring);
  return withRecurring.map((r) => ({
    ...r,
    ...deriveStatus(r.flags),
    display_confidence: displayConfidence(r),
  }));
}

// Recompute an EXISTING ledger after an edit/resolve/remove, preserving `resolved`/
// `resolution` on flags that still apply and the row's `edited_fields`. This is the
// H -> E loop: called synchronously on every inline edit.
export function recomputeLedger(prev: LedgerRow[]): LedgerRow[] {
  const resolutions = new Map<string, string | null>();
  const edited = new Map<string, string[]>();
  const approvedFlag = new Map<string, boolean>();
  for (const r of prev) {
    edited.set(r.source_id, r.edited_fields);
    approvedFlag.set(r.source_id, r.approved);
    for (const f of r.flags) {
      if (f.resolved) resolutions.set(`${r.source_id}:${f.code}`, f.resolution);
    }
  }

  const fresh = recompute(prev);
  return fresh.map((r) => {
    const flags = r.flags.map((f) => {
      const key = `${r.source_id}:${f.code}`;
      return resolutions.has(key) ? { ...f, resolved: true, resolution: resolutions.get(key) ?? null } : f;
    });
    return {
      ...r,
      flags,
      edited_fields: edited.get(r.source_id) ?? r.edited_fields,
      approved: approvedFlag.get(r.source_id) ?? r.approved,
      ...deriveStatus(flags),
    };
  });
}
