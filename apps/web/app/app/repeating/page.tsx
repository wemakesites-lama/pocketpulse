"use client";

import Link from "next/link";
import { formatZAR, recurringList } from "@pocketpulse/core";
import { useLedger } from "@/components/ledger-provider";

// 11.5 Repeating payments — read from what the document states, never inferred.
export default function RepeatingPage() {
  const { state } = useLedger();
  const recurring = recurringList(state.rows);
  const monthly = recurring.reduce((s, r) => s + r.monthly, 0);
  const annual = recurring.reduce((s, r) => s + r.annual, 0);

  if (state.rows.length === 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">No receipts yet</h1>
        <Link href="/app/add" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Add receipts
        </Link>
      </section>
    );
  }

  return (
    <section className="py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Repeating payments</h1>

      {recurring.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No repeating payments found in these receipts.</p>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {recurring.map((r) => (
              <div key={r.source_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div>
                  <div className="font-semibold">{r.merchant}</div>
                  <div className="text-xs text-muted-foreground">Evidence on the invoice: “{r.evidence}”</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{formatZAR(r.monthly)} / month</div>
                  <div className="text-muted-foreground">{formatZAR(r.annual)} a year, if nothing changes</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
            Total <span className="font-semibold">{formatZAR(monthly)}</span> a month · {formatZAR(annual)} a year.
          </div>
        </>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Why we can say this</p>
        <p className="mt-1">
          We know these repeat because each invoice says “monthly” and is paid by debit order,
          and we multiply by twelve. We only have this month, so we cannot yet tell you whether
          you were charged twice in one month. We do not guess at patterns we cannot see.
        </p>
      </div>
    </section>
  );
}
