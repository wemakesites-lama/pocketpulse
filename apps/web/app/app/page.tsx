"use client";

import Link from "next/link";
import {
  formatZAR,
  batchTotals,
  vatPosition,
  recurringList,
  categoryBreakdown,
} from "@pocketpulse/core";
import { Wallet, Percent, AlertTriangle, Repeat, ArrowRight } from "lucide-react";
import { useLedger } from "@/components/ledger-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const { state } = useLedger();
  const rows = state.rows;

  if (rows.length === 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Nothing to show yet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add some receipts or try a sample and your overview will appear here.
        </p>
        <Button asChild size="lg" className="mt-6 rounded-full">
          <Link href="/app/add">Add receipts</Link>
        </Button>
      </section>
    );
  }

  const t = batchTotals(rows);
  const pos = vatPosition(rows);
  const recurring = recurringList(rows);
  const monthly = recurring.reduce((s, r) => s + r.monthly, 0);
  const annual = recurring.reduce((s, r) => s + r.annual, 0);
  const cats = categoryBreakdown(rows);

  const kpis = [
    { title: "Total spent", value: formatZAR(t.gross_total), sub: `Across ${t.record_count} receipts`, icon: Wallet, accent: true },
    { title: "VAT in total", value: formatZAR(t.total_vat), sub: "Worked out from the amounts on your receipts", icon: Percent },
    { title: "VAT you could lose", value: formatZAR(t.vat_at_risk), sub: "Receipts missing something SARS requires", icon: AlertTriangle, danger: true },
    { title: "Going out monthly", value: formatZAR(monthly), sub: recurring.length ? `${recurring.length} subscriptions · ${formatZAR(annual)} a year` : "No repeating payments found", icon: Repeat },
  ];

  return (
    <section className="py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card
              key={k.title}
              className={cn("p-5", k.accent && "border-transparent bg-primary text-primary-foreground")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-sm", k.accent ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {k.title}
                </span>
                <Icon className={cn("h-4 w-4", k.accent ? "text-primary-foreground/70" : k.danger ? "text-destructive" : "text-muted-foreground")} />
              </div>
              <div className={cn("mt-2 text-2xl font-extrabold tabular-nums", k.danger && "text-destructive")}>
                {k.value}
              </div>
              <div className={cn("mt-1 text-xs", k.accent ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {k.sub}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Findings */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold">Fix these first</h2>
          <div className="mt-3 space-y-3">
            {state.insights.length === 0 && (
              <Card className="p-4 text-sm text-muted-foreground">No findings yet.</Card>
            )}
            {state.insights.map((ins, i) => (
              <Card key={ins.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">#{i + 1}</div>
                    <div className="font-semibold">{ins.claim}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{ins.recommended_action}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Evidence: {ins.supporting_transactions.join(", ")}
                    </div>
                  </div>
                  {ins.financial_effect_zar !== null && (
                    <div className="whitespace-nowrap font-semibold tabular-nums text-destructive">
                      {formatZAR(ins.financial_effect_zar)}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This covers more than VAT: double payments and invoices that do not add up are money too.
          </p>
        </div>

        {/* Side: VAT position + repeating */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-bold">Where your VAT stands</h3>
            <PositionBar label="Safe to claim" amount={pos.safe} tone="success" />
            <PositionBar label="At risk on paperwork" amount={pos.atRisk} tone="warning" />
            <PositionBar label="Would be claimed twice" amount={pos.claimedTwice} tone="destructive" />
          </Card>

          {recurring.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Repeating payments</h3>
                <Link
                  href="/app/repeating"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-2 space-y-2">
                {recurring.map((r) => (
                  <div key={r.source_id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{r.merchant}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatZAR(r.monthly)}/mo</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-border pt-2 text-sm">
                Total <span className="font-semibold tabular-nums">{formatZAR(monthly)}</span> a month ·{" "}
                <span className="tabular-nums">{formatZAR(annual)}</span> a year
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-bold">Where the money went</h3>
            <div className="mt-2 space-y-1.5">
              {cats.slice(0, 6).map((c) => (
                <div key={c.category} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate capitalize text-muted-foreground">{c.category.replace(/_/g, " ")}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatZAR(c.amount)} · {c.percent.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function PositionBar({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone: "success" | "warning" | "destructive";
}) {
  const cls = { success: "text-success", warning: "text-warning", destructive: "text-destructive" }[tone];
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-b border-border pb-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("shrink-0 font-semibold tabular-nums", cls)}>{formatZAR(amount)}</span>
    </div>
  );
}
