import type { Flag } from "@pocketpulse/core";
import { Badge, type BadgeProps } from "@/components/ui/badge";

// 3.3 Colour discipline: colour only where money is at stake. Recurring is blue (info),
// high severity is red (loss), estimates/medium are amber (uncertainty), low is muted.
function toneVariant(f: Flag): BadgeProps["variant"] {
  if (f.code === "recurring_commitment") return "info";
  if (f.resolved) return "successSoft";
  if (f.severity === "high") return "dangerSoft";
  if (f.is_estimate || f.severity === "medium") return "warningSoft";
  return "secondary";
}

export function FlagChip({ flag }: { flag: Flag }) {
  return (
    <Badge
      variant={toneVariant(flag)}
      className="gap-1.5 rounded-full font-medium"
      title={flag.resolution ?? flag.message}
    >
      <span>{flag.message}</span>
      {flag.amount_label && <span className="font-semibold">· {flag.amount_label}</span>}
      {flag.is_estimate && !flag.resolved && (
        <span className="rounded bg-warning/20 px-1 text-[10px] font-semibold uppercase tracking-wide">
          est
        </span>
      )}
      {flag.resolved && <span className="text-[10px] font-semibold uppercase">done</span>}
    </Badge>
  );
}

// "Not found" / "Not confirmed" amber chips for null values (13 copy rules).
export function NullChip({ label }: { label: string }) {
  return (
    <Badge variant="warningSoft" className="rounded-full font-medium">
      {label}
    </Badge>
  );
}
