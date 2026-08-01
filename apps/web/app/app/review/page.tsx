"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { formatZAR, canApprove, batchTotals, type LedgerRow, type LedgerState } from "@pocketpulse/core";
import { useLedger } from "@/components/ledger-provider";
import { FlagChip, NullChip } from "@/components/flag-chip";
import { EvidenceDrawer } from "@/components/evidence-drawer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ReviewPage() {
  const router = useRouter();
  const { state, dispatch } = useLedger();
  const [drawer, setDrawer] = useState<LedgerRow | null>(null);
  const [showClean, setShowClean] = useState(false);

  const rows = state.rows;
  if (rows.length === 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">No receipts yet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add some receipts or try a sample to see the reviewed ledger.
        </p>
        <Button asChild size="lg" className="mt-6 rounded-full">
          <Link href="/app/add">Add receipts</Link>
        </Button>
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
    const snapshot: LedgerState = state;
    dispatch({ type: "REMOVE_ROW", sourceId: row.source_id });
    toast(`Receipt removed · expenses down ${formatZAR(row.stated_total ?? 0)}`, {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => dispatch({ type: "HYDRATE", state: snapshot }),
      },
    });
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
          {state.batchSummary && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{state.batchSummary}</p>
          )}
        </div>
        <div className="text-sm text-muted-foreground sm:text-right">
          <div className="tabular-nums">
            {rows.length} receipts · {formatZAR(totals.gross_total)}
          </div>
          <div>
            VAT you could lose{" "}
            <span className="font-semibold tabular-nums text-destructive">{formatZAR(totals.vat_at_risk)}</span>
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
            aria-expanded={showClean}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

      {/* Approve bar — sits above the mobile bottom nav (bottom-24), flush on desktop. */}
      <Card className="sticky bottom-24 z-30 mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:bottom-4">
        <div className="text-sm text-muted-foreground">
          {rows.length} receipts · {clean.length} fine · {attention.length} need attention
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={() => downloadCsv(rows)} className="rounded-full">
            <Download className="h-4 w-4" />
            Download for my bookkeeper
          </Button>
          <Button onClick={approveAll} disabled={!approvable} className="rounded-full">
            {approvable
              ? "Approve all"
              : `Sort out ${highUnresolved} serious ${highUnresolved === 1 ? "one" : "ones"} first`}
          </Button>
        </div>
      </Card>

      <EvidenceDrawer row={drawer} onClose={() => setDrawer(null)} />
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
    <Card className={cn("p-4", isDup && "border-l-4 border-l-destructive")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{row.merchant ?? <NullChip label="No shop name" />}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{row.date ?? <NullChip label="Not found" />}</span>
            <span>· {row.category.replace(/_/g, " ")}</span>
            {isDup && <span className="font-mono text-[10px] uppercase text-destructive">matching pair</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums">
            {row.stated_total !== null ? formatZAR(row.stated_total) : "—"}
          </div>
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
          <Button variant="destructive" size="sm" onClick={onRemove} className="rounded-full">
            Remove this copy
          </Button>
        )}
        {dismissable && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              dispatch({
                type: "RESOLVE_FLAG",
                sourceId: row.source_id,
                code: "unusual_amount",
                resolution: "Planned purchase, approved.",
              })
            }
            className="rounded-full"
          >
            Planned purchase — approve
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onSlip} className="rounded-full">
          <FileText className="h-4 w-4" />
          Slip
        </Button>
      </div>
    </Card>
  );
}

function InlineNumber({ label, initial, onSave }: { label: string; initial: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(initial));
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="h-9 w-24"
        aria-label={label}
      />
      <Button size="sm" onClick={() => onSave(Number(v))} className="rounded-full">
        {label}
      </Button>
    </div>
  );
}

function InlineDate({ onSave }: { onSave: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-1">
      <Input type="date" value={v} onChange={(e) => setV(e.target.value)} className="h-9 w-auto" aria-label="Add the date" />
      <Button size="sm" onClick={() => v && onSave(v)} className="rounded-full">
        Add the date
      </Button>
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
