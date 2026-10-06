import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Receipt, TrendingUp, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BalanceCard } from "@/components/BalanceCard";
import { TransactionRow } from "@/components/TransactionRow";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import {
  restrictionActive,
  useAccount,
  useFundLocks,
  useRestriction,
  useTransactions,
  useWithdrawals,
} from "@/hooks/useBanking";
import { formatDate, money, timeRemaining } from "@/lib/format";
import { usePositions } from "@/hooks/useInvestments";
import { formatPct } from "@/lib/investments";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vaultline Banking" },
      { name: "description", content: "Your Vaultline overview: total, available and locked balances plus recent activity." },
      { property: "og:title", content: "Dashboard — Vaultline Banking" },
      { property: "og:description", content: "Your balances, withdrawals and recent banking activity." },
    ],
  }),
  component: DashboardPage,
});

const actions = [
  { to: "/withdraw", label: "Withdraw", icon: Wallet },
  { to: "/investments", label: "Invest", icon: TrendingUp },
  { to: "/fund-lock", label: "Lock funds", icon: Lock },
  { to: "/transactions", label: "History", icon: Receipt },
] as const;


function DashboardPage() {
  const { profile } = useAuth();
  const uid = profile?.id;
  const account = useAccount(uid);
  const txns = useTransactions(uid, 6);
  const withdrawals = useWithdrawals(uid);
  const locks = useFundLocks(uid);
  const restriction = useRestriction(uid);

  const activeLocks = (locks.data ?? []).filter((l) => l.status === "active");
  const recentWithdrawals = (withdrawals.data ?? []).slice(0, 3);
  const blocked = restrictionActive(restriction.data);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <AppShell title={`Good to see you, ${firstName}`} subtitle="Here's where your money stands today.">
      <div className="space-y-6">
        {profile?.status && profile.status !== "active" ? (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4">
            <p className="text-sm font-semibold text-warning">
              Account {profile.status === "suspended" ? "suspended" : "restricted"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.status_message ?? "Please contact support for more information."}
            </p>
          </div>
        ) : null}

        {blocked ? (
          <div className="rounded-2xl border border-info/30 bg-info/10 px-5 py-4">
            <p className="text-sm font-semibold text-info">Withdrawals are temporarily on hold</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {restriction.data?.message ?? "A review is in progress on your account."}
            </p>
          </div>
        ) : null}

        {account.isError ? (
          <ErrorState onRetry={() => void account.refetch()} />
        ) : (
          <BalanceCard
            snapshot={account.data}
            accountNumber={profile?.account_number}
            holder={profile?.full_name}
          />
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="surface-card group flex flex-col items-start gap-3 p-4 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-elevated">
                <a.icon className="h-[18px] w-[18px] text-primary-glow" />
              </span>
              <span className="text-sm font-semibold">{a.label}</span>
            </Link>
          ))}
        </div>

        <InvestmentSummary userId={uid} />



        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <section className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Recent activity</h2>
              <Link to="/transactions" className="text-xs font-semibold text-primary-glow hover:underline">
                View all
              </Link>
            </div>
            {txns.isLoading ? (
              <SkeletonRows rows={4} />
            ) : txns.isError ? (
              <ErrorState onRetry={() => void txns.refetch()} />
            ) : (txns.data ?? []).length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No transactions yet"
                description="Once money moves in or out of your account, it will appear here."
              />
            ) : (
              <div className="space-y-2.5">
                {(txns.data ?? []).map((t) => (
                  <TransactionRow key={t.id} txn={t} />
                ))}
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className="surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Withdrawals</h2>
                <Link to="/withdraw" className="text-xs font-semibold text-primary-glow hover:underline">
                  Request <ArrowRight className="inline h-3 w-3" />
                </Link>
              </div>
              {withdrawals.isLoading ? (
                <SkeletonRows rows={2} />
              ) : recentWithdrawals.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="No requests yet"
                  description="Withdrawal requests you submit will be tracked here."
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {recentWithdrawals.map((w) => (
                    <div key={w.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="numeric text-sm font-bold">{money(Number(w.amount))}</p>
                        <StatusBadge status={w.status} />
                      </div>
                      <p className="mt-1.5 truncate text-xs text-muted-foreground">
                        {w.bank_name} · {formatDate(w.requested_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Locked funds</h2>
                <Link to="/fund-lock" className="text-xs font-semibold text-primary-glow hover:underline">
                  Manage
                </Link>
              </div>
              {activeLocks.length === 0 ? (
                <EmptyState
                  icon={Lock}
                  title="Nothing locked"
                  description="Lock part of your balance until a future date."
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {activeLocks.slice(0, 3).map((l) => (
                    <div key={l.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="numeric text-sm font-bold">{money(Number(l.amount))}</p>
                        <StatusBadge status="active" label="Locked" />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Unlocks {formatDate(l.unlock_date)} · {timeRemaining(l.unlock_date)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InvestmentSummary({ userId }: { userId?: string | undefined }) {
  const positions = usePositions(userId);
  const open = (positions.data ?? []).filter((p) => p.status !== "closed");
  if (open.length === 0) {
    return (
      <Link
        to="/investments"
        className="surface-card flex items-center gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-elevated">
          <TrendingUp className="h-5 w-5 text-primary-glow" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Start investing</p>
          <p className="text-xs text-muted-foreground">
            Simulated stocks, crypto and forex markets from {money(200)}.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    );
  }
  const invested = open.reduce((s, p) => s + Number(p.amount), 0);
  const value = open.reduce((s, p) => s + p.liveValue, 0);
  const profit = value - invested;
  const pct = invested ? (profit / invested) * 100 : 0;
  return (
    <Link to="/portfolio" className="surface-card block p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Investment portfolio
          </p>
          <p className="numeric mt-1 text-2xl font-bold">{money(value)}</p>
        </div>
        <div className="text-right">
          <p className={profit >= 0 ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>
            {profit >= 0 ? "+" : ""}
            {money(profit)} · {formatPct(pct)}
          </p>
          <p className="text-xs text-muted-foreground">
            {open.length} open position{open.length === 1 ? "" : "s"} · {money(invested)} invested
          </p>
        </div>
      </div>
    </Link>
  );
}
