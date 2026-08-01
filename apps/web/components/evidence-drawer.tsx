"use client";

import { useEffect, useState } from "react";
import { formatZAR, type LedgerRow } from "@pocketpulse/core";
import { FlagChip } from "./flag-chip";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// 11.3 Evidence drawer — the signature interaction. A right-side sheet on desktop,
// a bottom sheet on phone, showing the receipt as a mono slip on dark, then the
// computed facts. Built on shadcn Sheet (focus trap, Esc, overlay, scroll-lock).
function slip(row: LedgerRow): string {
  const lines: string[] = [];
  lines.push(row.merchant ?? "— no shop name —");
  if (row.supplier_vat_number) lines.push(`VAT ${row.supplier_vat_number}`);
  if (row.invoice_serial) lines.push(`Invoice ${row.invoice_serial}`);
  lines.push(row.date ?? "— no date —");
  lines.push("");
  if (row.description) lines.push(row.description);
  for (const li of row.line_items) {
    const amt = li.line_total !== null ? formatZAR(li.line_total) : "";
    lines.push(`  ${li.description}${amt ? "  " + amt : ""}`);
  }
  lines.push("");
  if (row.stated_total !== null) lines.push(`TOTAL           ${formatZAR(row.stated_total)}`);
  if (row.stated_vat !== null) lines.push(`VAT (printed)   ${formatZAR(row.stated_vat)}`);
  lines.push(`Paid: ${row.payment_method}`);
  return lines.join("\n");
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "success" | "destructive";
}) {
  const cls =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", cls)}>{value}</span>
    </div>
  );
}

// Bottom sheet on phones, right sheet on ≥640px. Only read after mount; the sheet
// body renders after a user tap, well past hydration, so there is no SSR mismatch.
function useSheetSide(): "bottom" | "right" {
  const [side, setSide] = useState<"bottom" | "right">("right");
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setSide(mq.matches ? "right" : "bottom");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return side;
}

export function EvidenceDrawer({ row, onClose }: { row: LedgerRow | null; onClose: () => void }) {
  const side = useSheetSide();
  const open = !!row;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={side}
        className={cn(
          "flex flex-col gap-0 overflow-y-auto",
          side === "right" ? "w-full sm:max-w-lg" : "max-h-[90dvh] rounded-t-2xl",
        )}
      >
        {row && <DrawerBody row={row} />}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ row }: { row: LedgerRow }) {
  const openFlags = row.flags.filter((f) => !f.resolved);
  return (
    <>
      <SheetHeader className="space-y-1 text-left">
        <div className="font-mono text-xs text-muted-foreground">{row.source_id}</div>
        <SheetTitle className="text-lg font-extrabold tracking-tight">
          {row.merchant ?? "Unknown shop"}
        </SheetTitle>
        <SheetDescription className="sr-only">Receipt evidence and computed facts</SheetDescription>
      </SheetHeader>

      <pre className="mt-4 overflow-x-auto rounded-2xl bg-[color:var(--slip-dark)] p-4 font-mono text-xs leading-relaxed text-[#E6E8EC]">
        {slip(row)}
      </pre>

      <div className="mt-5">
        {row.stated_total !== null && <Fact label="Total as printed" value={formatZAR(row.stated_total)} />}
        <Fact
          label="VAT as printed"
          value={row.stated_vat !== null ? formatZAR(row.stated_vat) : "Not printed"}
          tone={row.flags.some((f) => f.code === "vat_mismatch") ? "warning" : undefined}
        />
        <Fact
          label="VAT it should be"
          value={row.computed_vat !== null ? formatZAR(row.computed_vat) : "Not confirmed"}
        />
        <Fact
          label="Can it be claimed?"
          value={claimLabel(row.claim_status)}
          tone={
            row.claim_status === "claimable"
              ? "success"
              : row.claim_status === "no_vat_applicable"
                ? undefined
                : "warning"
          }
        />
        {row.vat_at_risk !== null && (
          <Fact
            label={row.vat_at_risk_is_estimate ? "VAT at stake (estimate)" : "VAT at stake"}
            value={formatZAR(row.vat_at_risk)}
            tone="destructive"
          />
        )}
        {row.recurring && <Fact label="Repeats" value={`${formatZAR(row.recurring.monthly)} / month`} />}
      </div>

      {row.claim_missing_fields.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold">This document is missing</div>
          <div className="flex flex-wrap gap-2">
            {row.claim_missing_fields.map((f) => (
              <Badge key={f} variant="dangerSoft" className="rounded-full">
                {prettyField(f)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {openFlags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {openFlags.map((f, i) => (
            <FlagChip key={i} flag={f} />
          ))}
        </div>
      )}
    </>
  );
}

function claimLabel(s: LedgerRow["claim_status"]): string {
  return {
    claimable: "Yes — paperwork is complete",
    at_risk: "At risk — paperwork is incomplete",
    not_claimable: "No — a required field is missing",
    no_vat_applicable: "No VAT applies",
    unknown: "Not confirmed",
  }[s];
}

function prettyField(f: string): string {
  const map: Record<string, string> = {
    date: "a readable date",
    supplier_vat_number: "a supplier VAT number",
    invoice_serial: "an invoice number",
    has_tax_invoice_wording: "the words “Tax Invoice”",
    supplier_address_present: "a supplier address",
    description_present: "a description of what was bought",
    recipient_details_present: "your own business details",
    correct_vat_amount: "a correct VAT amount",
  };
  return map[f] ?? f.replace(/_/g, " ");
}
