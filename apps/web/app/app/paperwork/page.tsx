"use client";

import { useState } from "react";
import Link from "next/link";
import { formatZAR, type LedgerRow } from "@pocketpulse/core";
import { useLedger } from "@/components/ledger-provider";
import { EvidenceDrawer } from "@/components/evidence-drawer";

// 11.6 Paperwork check. Problem documents + the tier reference + the correctly-silent card.
const TIER_LABEL: Record<string, { plain: string; statutory: string }> = {
  none_required: { plain: "A till slip is enough", statutory: "No tax invoice required" },
  abridged: { plain: "A till slip is enough", statutory: "Abridged tax invoice" },
  full: { plain: "Needs a full tax invoice", statutory: "Full tax invoice" },
};

export default function PaperworkPage() {
  const { state } = useLedger();
  const [drawer, setDrawer] = useState<LedgerRow | null>(null);
  const rows = state.rows;

  if (rows.length === 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">No receipts yet</h1>
        <Link href="/app/add" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Add receipts
        </Link>
      </section>
    );
  }

  const problems = rows.filter((r) => r.claim_status === "at_risk" || r.claim_status === "not_claimable");
  const silent = rows.filter((r) => r.claim_status === "no_vat_applicable");

  return (
    <section className="py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Paperwork check</h1>

      <div className="mt-6 space-y-3">
        {problems.map((r) => (
          <div key={r.source_id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{r.merchant ?? "Unknown shop"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.date ?? "no date"} · {r.stated_total !== null ? formatZAR(r.stated_total) : "—"}
                </div>
                <div className="mt-2 text-sm">
                  {TIER_LABEL[r.invoice_tier ?? "abridged"]?.plain}{" "}
                  <span className="text-xs text-muted-foreground">({TIER_LABEL[r.invoice_tier ?? "abridged"]?.statutory})</span>
                </div>
                {r.claim_missing_fields.length > 0 && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Missing: {r.claim_missing_fields.map((f) => f.replace(/_/g, " ")).join(", ")}
                  </div>
                )}
              </div>
              <div className="text-right">
                {r.vat_at_risk !== null && (
                  <div className="font-semibold text-destructive">
                    {r.vat_at_risk_is_estimate ? "up to " : ""}
                    {formatZAR(r.vat_at_risk)}
                  </div>
                )}
                <button onClick={() => setDrawer(r)} className="mt-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
                  Slip
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {silent.length > 0 && (
        <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-5 text-sm">
          <p className="font-semibold text-success">Correctly silent</p>
          {silent.map((r) => (
            <p key={r.source_id} className="mt-1 text-muted-foreground">
              {r.merchant} said they are not a VAT vendor, so no VAT applies and we raise no alarm. Knowing when
              not to raise one is the harder half.
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">The rule</p>
        <p className="mt-1">
          Over R5,000 needs a full tax invoice with your own business details; R50 to R5,000 a
          shorter one; R50 or less a till slip. A single missing field can void the whole claim —
          which is why an unreadable date is worth real rands, not a few cents.
        </p>
      </div>

      <EvidenceDrawer row={drawer} onClose={() => setDrawer(null)} />
    </section>
  );
}
