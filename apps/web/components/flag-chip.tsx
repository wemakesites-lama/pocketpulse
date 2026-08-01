import type { Flag } from "@pocketpulse/core";

// 3.3 Colour discipline: colour only where money is at stake. Recurring is blue (info),
// high severity is red (loss), estimates/medium are amber (uncertainty), low is muted.
function tone(f: Flag): string {
  if (f.code === "recurring_commitment") return "bg-accent text-accent-foreground";
  if (f.resolved) return "bg-success/12 text-success line-through/none";
  if (f.severity === "high") return "bg-destructive/10 text-destructive";
  if (f.is_estimate || f.severity === "medium") return "bg-warning/14 text-warning";
  return "bg-secondary text-muted-foreground";
}

export function FlagChip({ flag }: { flag: Flag }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone(flag)}`}
      title={flag.resolution ?? flag.message}
    >
      <span>{flag.message}</span>
      {flag.amount_label && <span className="font-semibold">· {flag.amount_label}</span>}
      {flag.is_estimate && !flag.resolved && (
        <span className="rounded bg-warning/20 px-1 text-[10px] font-semibold uppercase tracking-wide">est</span>
      )}
      {flag.resolved && <span className="text-[10px] font-semibold uppercase">done</span>}
    </span>
  );
}

// "Not found" / "Not confirmed" amber chips for null values (13 copy rules).
export function NullChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-warning/14 px-2.5 py-1 text-xs font-medium text-warning">
      {label}
    </span>
  );
}
