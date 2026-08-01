"use client";

import { useState } from "react";
import Link from "next/link";
import { formatZAR, batchTotals, vatPosition, DISCLAIMER, type LedgerRow } from "@pocketpulse/core";
import { useLedger } from "@/components/ledger-provider";

// 11.7 Approved record. Plain-English summary, stat list, raw ApprovedBatch JSON toggle, CSV.
export default function ApprovedPage() {
  const { state } = useLedger();
  const [showRaw, setShowRaw] = useState(false);
  const rows = state.rows;
  const approved = rows.filter((r) => r.approved);

  if (approved.length === 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Nothing approved yet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Review your receipts and approve them to see the final record here.
        </p>
        <Link href="/app/review" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Go to review
        </Link>
      </section>
    );
  }

  const t = batchTotals(approved);
  const pos = vatPosition(approved);
  const changes = state.editLog.length;
  const record = buildApprovedBatch(approved, state.editLog.length > 0, state.modelId);

  return (
    <section className="py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">{approved.length} receipts approved</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {changes > 0 ? `You made ${changes} change${changes === 1 ? "" : "s"}. ` : ""}
        {formatZAR(pos.atRisk)} of VAT still needs better paperwork before you claim it.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total spent", formatZAR(t.gross_total)],
          ["VAT you can claim", formatZAR(pos.safe)],
          ["VAT still at risk", formatZAR(pos.atRisk)],
          ["Going out monthly", formatZAR(record.recurring.reduce((s, r) => s + r.monthly, 0))],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-extrabold">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => downloadCsv(approved)} className="rounded-full border border-border px-4 py-2 text-sm font-medium">
          Download for my bookkeeper
        </button>
        <button onClick={() => setShowRaw((v) => !v)} className="rounded-full border border-border px-4 py-2 text-sm font-medium">
          {showRaw ? "Hide the raw record" : "View the raw record"}
        </button>
      </div>

      {showRaw && (
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-[color:var(--slip-dark)] p-4 font-mono text-xs text-[#E6E8EC]">
          {JSON.stringify(record, null, 2)}
        </pre>
      )}

      <p className="mt-6 text-xs text-muted-foreground">{DISCLAIMER}</p>
    </section>
  );
}

function buildApprovedBatch(rows: LedgerRow[], changesMade: boolean, modelId: string | null) {
  const t = batchTotals(rows);
  return {
    batch_id: "batch-approved",
    approved_at: new Date().toISOString(),
    review_status: "approved" as const,
    reviewed_by: "user" as const,
    changes_made: changesMade,
    recurring: rows
      .filter((r) => r.recurring)
      .map((r) => ({ source_id: r.source_id, merchant: r.merchant ?? "—", monthly: r.recurring!.monthly, basis: "stated on the document" as const })),
    totals: {
      record_count: t.record_count,
      gross_total: t.gross_total,
      total_vat: t.total_vat,
      vat_at_risk: t.vat_at_risk,
      vat_unconfirmed_count: t.vat_unconfirmed_count,
    },
    unresolved_flags: rows.flatMap((r) => r.flags.filter((f) => !f.resolved && f.severity !== "low")),
    model: { provider: "groq" as const, model_id: modelId ?? "unset" },
    disclaimer: DISCLAIMER,
  };
}

function downloadCsv(rows: LedgerRow[]) {
  const head = ["source_id", "merchant", "date", "description", "total", "computed_vat", "claim_status", "vat_at_risk"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.source_id, r.merchant, r.date, r.description, r.stated_total, r.computed_vat, r.claim_status, r.vat_at_risk].map(esc).join(","),
  );
  const csv = [head.join(","), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "pocketpulse-approved.csv";
  a.click();
  URL.revokeObjectURL(url);
}
