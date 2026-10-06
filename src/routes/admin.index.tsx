import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowLeftRight, Lock, ShieldAlert, Users, Wallet } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { useAdminActivity, useAdminOverview, useAdminWithdrawals } from "@/hooks/useBanking";
import { money, statusLabel, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin overview — Vaultline Console" },
      { name: "description", content: "Operational overview of users, balances and withdrawal queues across Vaultline." },
      { property: "og:title", content: "Admin overview — Vaultline Console" },
      { property: "og:description", content: "Operational overview for Vaultline administrators." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { isAdmin } = useAuth();
  const overview = useAdminOverview(isAdmin);
  const withdrawals = useAdminWithdrawals(isAdmin);
  const activity = useAdminActivity(isAdmin);

  const o = overview.data;
  const queue = (withdrawals.data ?? []).filter((w) =>
    ["pending", "under_review", "approved", "processing"].includes(w.status),
  );

  const stats = [
    { label: "Total users", value: String(o?.total_users ?? 0), icon: Users, tone: "text-primary-glow" },
    { label: "Customer balances", value: money(o?.total_balance ?? 0), icon: Wallet, tone: "text-success" },
    { label: "Locked funds", value: money(o?.locked_balance ?? 0), icon: Lock, tone: "text-info" },
    {
      label: "Pending withdrawals",
      value: money(o?.pending_withdrawals ?? 0),
      icon: ArrowLeftRight,
      tone: "text-warning",
    },
  ];

  return (
    <AdminShell title="Operations overview" subtitle="Live view of the Vaultline customer base.">
      {overview.isLoading ? (
        <LoadingBlock label="Loading metrics" />
      ) : overview.isError ? (
        <ErrorState onRetry={() => void overview.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="surface-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <s.icon className={`h-4 w-4 ${s.tone}`} />
                </div>
                <p className="numeric mt-3 truncate text-2xl font-extrabold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Active accounts", o?.active_users ?? 0, "text-success"],
              ["Restricted accounts", o?.restricted_users ?? 0, "text-warning"],
              ["Requests awaiting action", o?.pending_count ?? 0, "text-info"],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="surface-card p-5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`numeric mt-1.5 text-xl font-bold ${tone}`}>{String(value)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
            <section className="surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Withdrawal queue</h2>
                <Link to="/admin/withdrawals" className="text-xs font-semibold text-primary-glow hover:underline">
                  Manage all
                </Link>
              </div>
              {queue.length === 0 ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="Queue is clear"
                  description="No withdrawal requests are awaiting action."
                  className="py-10"
                />
              ) : (
                <div className="space-y-2.5">
                  {queue.slice(0, 6).map((w) => (
                    <div
                      key={w.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {w.profile?.full_name ?? "Unknown user"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {money(Number(w.amount))} · {w.bank_name} · {timeAgo(w.requested_at)}
                        </p>
                      </div>
                      <StatusBadge status={w.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Recent admin actions</h2>
                <Link to="/admin/activity" className="text-xs font-semibold text-primary-glow hover:underline">
                  Audit log
                </Link>
              </div>
              {(activity.data ?? []).length === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" className="py-10" />
              ) : (
                <div className="space-y-2.5">
                  {(activity.data ?? []).slice(0, 6).map((a) => (
                    <div key={a.id} className="rounded-2xl border border-border bg-surface/70 px-4 py-3">
                      <p className="truncate text-sm font-semibold">{statusLabel(a.action)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.admin_email ?? "Admin"} · {timeAgo(a.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
