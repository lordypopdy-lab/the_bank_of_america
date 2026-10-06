import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { money } from "@/lib/format";
import type { AccountSnapshot } from "@/hooks/useBanking";

export function BalanceCard({
  snapshot,
  accountNumber,
  holder,
}: {
  snapshot: AccountSnapshot | undefined;
  accountNumber?: string | undefined;
  holder?: string | undefined;
}) {
  const [hidden, setHidden] = useState(false);
  const show = (v: number) => (hidden ? "••••••" : money(v, snapshot?.account?.currency ?? "USD"));

  return (
    <section className="balance-gradient relative overflow-hidden rounded-3xl border border-white/10 p-6 shadow-[var(--shadow-float)] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
            Total balance
          </p>
          <p className="numeric mt-2 truncate text-[34px] font-extrabold leading-none text-primary-foreground sm:text-5xl">
            {show(snapshot?.total ?? 0)}
          </p>
          <p className="mt-3 text-xs text-primary-foreground/70">
            {holder ? `${holder} · ` : ""}
            {accountNumber ? `Acct ${accountNumber}` : "Account pending"}
          </p>
        </div>
        <button
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? "Show balances" : "Hide balances"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-primary-foreground transition-colors hover:bg-white/20"
        >
          {hidden ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <div className="relative mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Available", value: snapshot?.available ?? 0, tone: "text-success" },
          { label: "Locked", value: snapshot?.locked ?? 0, tone: "text-primary-foreground" },
          { label: "Pending withdrawals", value: snapshot?.pending ?? 0, tone: "text-warning" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-black/25 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary-foreground/60">
              {item.label}
            </p>
            <p className={`numeric mt-1 text-lg font-bold ${item.tone}`}>{show(item.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
