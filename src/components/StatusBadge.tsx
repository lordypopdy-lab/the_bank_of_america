import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/format";

const tones: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  under_review: "bg-info/15 text-info border-info/30",
  approved: "bg-primary/20 text-primary-glow border-primary/40",
  processing: "bg-info/15 text-info border-info/30",
  completed: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  active: "bg-success/15 text-success border-success/30",
  restricted: "bg-warning/15 text-warning border-warning/30",
  suspended: "bg-destructive/15 text-destructive border-destructive/30",
  released: "bg-muted text-muted-foreground border-border",
  deposit: "bg-success/15 text-success border-success/30",
  withdrawal: "bg-destructive/15 text-destructive border-destructive/30",
  adjustment: "bg-info/15 text-info border-info/30",
  fund_lock: "bg-primary/15 text-primary-glow border-primary/30",
  fund_unlock: "bg-success/15 text-success border-success/30",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        tones[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label ?? statusLabel(status)}
    </span>
  );
}
