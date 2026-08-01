"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatZAR, canApprove, batchTotals, type LedgerRow, type LedgerState } from "@pocketpulse/core";
import { useLedger } from "@/components/ledger-provider";
import { FlagChip, NullChip } from "@/components/flag-chip";
import { EvidenceDrawer } from "@/components/evidence-drawer";

export default function ReviewPage() {
  const router = useRouter();
  const { state, dispatch } = useLedger();
  const [drawer, setDrawer] = useState<LedgerRow | null>(null);
  const [undo, setUndo] = useState<{ snapshot: LedgerState; label: string } | null>(null);
  const [showClean, setShowClean] = useState(false);

  const rows = state.rows;
  if (rows.length === 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">No receipts yet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add some receipts or try a sample to see the reviewed ledger.
        </p>
        <Link href="/app/add" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Add receipts
        </Link>
      </section>
    );
  }

  const clean = rows.filter((r) => r.review_status === "clean");
  const attention = rows.filter((r) => r.review_status !== "clean");
  const highUnresolved = rows.reduce(
    (n, r) => n + r.flags.filter((f) => f.severity === "high" && !f.resolved).length,
    0,
  );
  const approvable = canApprove(rows);
  const totals = batchTotals(rows);

  function removeRow(row: LedgerRow) {
    setUndo({ snapshot: state, label: `Receipt removed · expenses down ${formatZAR(row.stated_total ?? 0)}` });
    dispatch({ type: "REMOVE_ROW", sourceId: row.source_id });
    window.setTimeout(() => setUndo(null), 6000);
  }

  function approveAll() {
    dispatch({ type: "APPROVE_ALL" });
    router.push("/app/approved");
  }

  return (
    <section className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Review</h1>
          {state.batchSummary && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{state.batchSummary}</p>}
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>{rows.length} receipts · {formatZAR(totals.gross_total)}</div>
          <div>
            VAT you could lose <span className="font-semibold text-destructive">{formatZAR(totals.vat_at_risk)}</span>
          </div>
        </div>
      </div>

      {/* Records needing attention */}
      <div className="mt-6 space-y-3">
        {attention.map((row) => (
          <RowCard key={row.source_id} row={row} onSlip={() => setDrawer(row)} onRemove={() => removeRow(row)} dispatch={dispatch} />
        ))}
      </div>

      {/* Clean records collapsed */}
      {clean.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowClean((v) => !v)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-medium hover:bg-secondary"
          >
            {clean.length} are fine {showClean ? "· hide" : "· show"}
          </button>
          {showClean && (
            <div className="mt-3 space-y-3">
              {clean.map((row) => (
                <RowCard key={row.source_id} row={row} onSlip={() => setDrawer(row)} onRemove={() => removeRow(row)} dispatch={dispatch} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approve bar */}
      <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="text-sm text-muted-foreground">
          {rows.length} receipts · {clean.length} fine · {attention.length} need attention
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadCsv(rows)} className="rounded-full border border-border px-4 py-2 text-sm font-medium">
            Download for my bookkeeper
          </button>
          <button
            onClick={approveAll}
            disabled={!approvable}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approvable ? "Approve all" : `Sort out ${highUnresolved} serious ${highUnresolved === 1 ? "one" : "ones"} first`}
          </button>
        </div>
      </div>

      <EvidenceDrawer row={drawer} onClose={() => setDrawer(null)} />

      {undo && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full bg-foreground px-5 py-3 text-sm text-background shadow-lg">
          <span>{undo.label}</span>
          <button
            onClick={() => {
              dispatch({ type: "HYDRATE", state: undo.snapshot });
              setUndo(null);
            }}
            className="font-semibold underline"
          >
            Undo
          </button>
        </div>
      )}
    </section>
  );
}

function RowCard({
  row,
  onSlip,
  onRemove,
  dispatch,
}: {
  row: LedgerRow;
  onSlip: () => void;
  onRemove: () => void;
  dispatch: ReturnType<typeof useLedger>["dispatch"];
}) {
  const open = row.flags.filter((f) => !f.resolved);
  const isDup = open.some((f) => f.code === "exact_duplicate");
  const hasMismatch = open.some((f) => f.code === "vat_mismatch");
  const missingDate = open.some((f) => f.code === "missing_date");
  const dismissable = open.find((f) => f.code === "unusual_amount");

  return (
    <div className={`rounded-2xl border bg-card p-4 ${isDup ? "border-l-4 border-l-destructive border-border" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{row.merchant ?? <NullChip label="No shop name" />}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {row.date ?? <NullChip label="Not found" />} · {row.category.replace(/_/g, " ")}
            {isDup && <span className="ml-2 font-mono text-[10px] uppercase text-destructive">matching pair</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{row.stated_total !== null ? formatZAR(row.stated_total) : "—"}</div>
          <div className="text-xs text-muted-foreground">
            VAT {row.computed_vat !== null ? formatZAR(row.computed_vat) : <NullChip label="Not confirmed" />}
          </div>
        </div>
      </div>

      {open.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {open.map((f, i) => (
            <FlagChip key={i} flag={f} />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hasMismatch && (
          <InlineNumber
            label="Correct the VAT"
            initial={row.computed_vat ?? 0}
            onSave={(v) => dispatch({ type: "EDIT_FIELD", sourceId: row.source_id, field: "stated_vat", value: v })}
          />
        )}
        {missingDate && (
          <InlineDate
            onSave={(v) => dispatch({ type: "EDIT_FIELD", sourceId: row.source_id, field: "date", value: v })}
          />
        )}
        {isDup && (
          <button onClick={onRemove} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
            Remove this copy
          </button>
        )}
        {dismissable && (
          <button
            onClick={() =>
              dispatch({
                type: "RESOLVE_FLAG",
                sourceId: row.source_id,
                code: "unusual_amount",
                resolution: "Planned purchase, approved.",
              })
            }
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium"
          >
            Planned purchase — approve
          </button>
        )}
        <button onClick={onSlip} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium">
          Slip
        </button>
      </div>
    </div>
  );
}

function InlineNumber({ label, initial, onSave }: { label: string; initial: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(initial));
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.01"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="h-8 w-24 rounded-lg border border-input bg-background px-2 text-sm"
        aria-label={label}
      />
      <button onClick={() => onSave(Number(v))} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
        {label}
      </button>
    </div>
  );
}

function InlineDate({ onSave }: { onSave: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        aria-label="Add the date"
      />
      <button
        onClick={() => v && onSave(v)}
        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
      >
        Add the date
      </button>
    </div>
  );
}

function downloadCsv(rows: LedgerRow[]) {
  const head = ["source_id", "merchant", "date", "description", "total", "computed_vat", "claim_status", "vat_at_risk"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.source_id, r.merchant, r.date, r.description, r.stated_total, r.computed_vat, r.claim_status, r.vat_at_risk]
      .map(esc)
      .join(","),
  );
  const csv = [head.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pocketpulse-ledger.csv";
  a.click();
  URL.revokeObjectURL(url);
}
