import { ArrowDownLeft, ArrowUpRight, Lock, LockOpen, SlidersHorizontal } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { formatDateTime, money } from "@/lib/format";
import { cn } from "@/lib/utils";

const meta = {
  deposit: { icon: ArrowDownLeft, tone: "text-success", bg: "bg-success/15", sign: "+" },
  withdrawal: { icon: ArrowUpRight, tone: "text-destructive", bg: "bg-destructive/15", sign: "−" },
  adjustment: { icon: SlidersHorizontal, tone: "text-info", bg: "bg-info/15", sign: "" },
  fund_lock: { icon: Lock, tone: "text-primary-glow", bg: "bg-primary/15", sign: "−" },
  fund_unlock: { icon: LockOpen, tone: "text-success", bg: "bg-success/15", sign: "+" },
} as const;

export function TransactionRow({ txn }: { txn: Transaction }) {
  const m = meta[txn.type] ?? meta.adjustment;
  const Icon = m.icon;
  const amount = Number(txn.amount);
  const sign = m.sign || (amount < 0 ? "−" : "+");

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3.5 transition-colors hover:bg-elevated sm:gap-4">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", m.bg)}>
        <Icon className={cn("h-[18px] w-[18px]", m.tone)} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{txn.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDateTime(txn.created_at)} · {txn.reference}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("numeric text-sm font-bold", m.tone)}>
          {sign}
          {money(Math.abs(amount))}
        </p>
        <p className="numeric text-[11px] text-muted-foreground">
          Bal {money(Number(txn.balance_after))}
        </p>
      </div>
    </div>
  );
}
