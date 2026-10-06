import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Briefcase, History, PieChart as PieIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useCloseInvestment,
  useInvestmentHistory,
  useMarketTicker,
  usePositions,
} from "@/hooks/useInvestments";
import { formatDateTime, money } from "@/lib/format";
import { CATEGORY_LABELS, formatPct, formatQuantity, type InvestCategory } from "@/lib/investments";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Vaultline Banking" },
      { name: "description", content: "Track your simulated investment portfolio: allocation, profit and loss, and full trade history." },
      { property: "og:title", content: "Portfolio — Vaultline Banking" },
      { property: "og:description", content: "Allocation breakdown, live position values and investment history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

const SLICES = ["var(--color-primary)", "var(--color-info)", "var(--color-success)"];

function PortfolioPage() {
  const { profile } = useAuth();
  useMarketTicker(true);
  const positions = usePositions(profile?.id);
  const history = useInvestmentHistory(profile?.id);
  const close = useCloseInvestment();

  const all = positions.data ?? [];
  const open = all.filter((p) => p.status !== "closed");
  const closed = all.filter((p) => p.status === "closed");

  const invested = open.reduce((s, p) => s + Number(p.amount), 0);
  const value = open.reduce((s, p) => s + p.liveValue, 0);
  const profit = value - invested;
  const realised = closed.reduce((s, p) => s + (Number(p.final_value ?? 0) - Number(p.amount)), 0);

  const allocation = useMemo(() => {
    const totals = new Map<InvestCategory, number>();
    for (const p of open) totals.set(p.category, (totals.get(p.category) ?? 0) + p.liveValue);
    return [...totals.entries()].map(([name, val]) => ({ name, value: Number(val.toFixed(2)) }));
  }, [open]);

  return (
    <AppShell title="Portfolio" subtitle="Your simulated holdings, performance and trade history.">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Portfolio value" value={money(value)} />
          <Metric label="Total invested" value={money(invested)} />
          <Metric
            label="Unrealised P&L"
            value={`${profit >= 0 ? "+" : ""}${money(profit)}`}
            tone={profit >= 0 ? "up" : "down"}
          />
          <Metric
            label="Realised P&L"
            value={`${realised >= 0 ? "+" : ""}${money(realised)}`}
            tone={realised >= 0 ? "up" : "down"}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <section className="surface-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <PieIcon className="h-4 w-4 text-primary-glow" /> Allocation
            </h2>
            {allocation.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="Nothing invested"
                description="Open your first position from the marketplace."
                className="py-10"
                action={
                  <Button asChild>
                    <Link to="/investments">Browse markets</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocation}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={92}
                        paddingAngle={3}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {allocation.map((entry, i) => (
                          <Cell key={entry.name} fill={SLICES[i % SLICES.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-elevated)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v, n) => [money(Number(v)), CATEGORY_LABELS[n as InvestCategory]]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2">
                  {allocation.map((slice, i) => (
                    <div key={slice.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: SLICES[i % SLICES.length] }}
                        />
                        {CATEGORY_LABELS[slice.name as InvestCategory]}
                      </span>
                      <span className="numeric font-semibold">
                        {money(slice.value)} · {value ? ((slice.value / value) * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Holdings</h2>
              <Link to="/investments" className="text-xs font-semibold text-primary-glow hover:underline">
                Marketplace
              </Link>
            </div>
            {positions.isLoading ? (
              <SkeletonRows rows={4} />
            ) : positions.isError ? (
              <ErrorState onRetry={() => void positions.refetch()} />
            ) : all.length === 0 ? (
              <EmptyState icon={Briefcase} title="No investments yet" description="Positions you open will appear here." />
            ) : (
              <div className="space-y-3">
                {all.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to="/investments/$id"
                        params={{ id: p.asset_id }}
                        className="text-sm font-bold hover:text-primary-glow"
                      >
                        {p.asset?.symbol ?? "Asset"} · {p.asset?.name}
                      </Link>
                      <StatusBadge
                        status={p.status === "active" ? "active" : p.status === "paused" ? "pending" : "released"}
                        label={p.status === "paused" ? "Paused" : p.status === "closed" ? "Closed" : "Active"}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                      <span>Invested {money(p.amount)}</span>
                      <span>{formatQuantity(p.quantity)} units</span>
                      <span className="numeric font-semibold text-foreground">{money(p.liveValue)}</span>
                      <span className={cn("font-semibold", p.profit >= 0 ? "text-success" : "text-destructive")}>
                        {p.profit >= 0 ? "+" : ""}
                        {money(p.profit)} ({formatPct(p.profitPct)})
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {p.reference} · opened {formatDateTime(p.created_at)}
                      {p.closed_at ? ` · closed ${formatDateTime(p.closed_at)}` : ""}
                    </p>
                    {p.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        disabled={close.isPending}
                        onClick={() => close.mutate({ id: p.id, reason: "Closed by customer" })}
                      >
                        Close position
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="surface-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
            <History className="h-4 w-4 text-primary-glow" /> Investment history
          </h2>
          {(history.data ?? []).length === 0 ? (
            <EmptyState icon={History} title="No activity yet" description="Opening and closing investments is recorded here." className="py-10" />
          ) : (
            <div className="space-y-2.5">
              {(history.data ?? []).map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/70 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize">
                      {h.type === "open" ? "Investment opened" : "Investment closed"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(h.created_at)} · {formatQuantity(h.quantity)} units{h.note ? ` · ${h.note}` : ""}
                    </p>
                  </div>
                  <p className={cn("numeric text-sm font-bold", h.type === "open" ? "text-destructive" : "text-success")}>
                    {h.type === "open" ? "−" : "+"}
                    {money(h.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="surface-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "numeric mt-1 text-xl font-bold",
          tone === "up" && "text-success",
          tone === "down" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}
