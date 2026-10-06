import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, LineChart, PieChart, Search, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AssetRow } from "@/components/investments/AssetRow";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAssets, useMarketTicker, usePositions } from "@/hooks/useInvestments";
import { money } from "@/lib/format";
import {
  CATEGORY_LABELS,
  formatPct,
  formatPrice,
  type InvestCategory,
} from "@/lib/investments";

export const Route = createFileRoute("/_authenticated/investments/")({
  head: () => ({
    meta: [
      { title: "Investments — Vaultline Banking" },
      {
        name: "description",
        content: "Browse simulated stocks, crypto and forex markets and open investments from your Vaultline balance.",
      },
      { property: "og:title", content: "Investments — Vaultline Banking" },
      { property: "og:description", content: "Simulated trading marketplace with live price movement and portfolio tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvestmentsPage,
});

const tabs = ["all", "stocks", "crypto", "forex"] as const;

function InvestmentsPage() {
  const { profile } = useAuth();
  useMarketTicker(true);
  const assets = useAssets();
  const positions = usePositions(profile?.id);
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (assets.data ?? []).filter(
      (a) =>
        (tab === "all" || a.category === (tab as InvestCategory)) &&
        (!q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)),
    );
  }, [assets.data, tab, search]);

  const active = (positions.data ?? []).filter((p) => p.status !== "closed");
  const invested = active.reduce((s, p) => s + Number(p.amount), 0);
  const value = active.reduce((s, p) => s + p.liveValue, 0);
  const profit = value - invested;
  const profitPct = invested ? (profit / invested) * 100 : 0;

  return (
    <AppShell title="Investments" subtitle="Simulated markets — trade with your available balance.">
      <div className="space-y-6">
        <section className="surface-card overflow-hidden p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Portfolio value
              </p>
              <p className="numeric mt-1 text-3xl font-bold sm:text-4xl">{money(value)}</p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold",
                  profit >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {profit >= 0 ? "+" : ""}
                {money(profit)} · {formatPct(profitPct)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/portfolio"
                className="flex items-center gap-2 rounded-xl border border-border bg-elevated px-4 py-2.5 text-sm font-semibold transition-colors hover:text-primary-glow"
              >
                <PieChart className="h-4 w-4" /> Portfolio
              </Link>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Invested" value={money(invested)} />
            <Stat label="Open positions" value={String(active.length)} />
            <Stat label="Assets tracked" value={String((assets.data ?? []).length)} />
          </div>
        </section>

        {active.length > 0 ? (
          <section className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Your positions</h2>
              <Link to="/portfolio" className="text-xs font-semibold text-primary-glow hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2.5">
              {active.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to="/investments/$id"
                  params={{ id: p.asset_id }}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface/70 p-4 transition-colors hover:bg-elevated"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-elevated text-[11px] font-bold">
                    {p.asset?.symbol.slice(0, 3) ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.asset?.name ?? "Asset"}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(p.amount)} invested · {p.reference}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="numeric text-sm font-bold">{money(p.liveValue)}</p>
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        p.profit >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {formatPct(p.profitPct)}
                    </p>
                  </div>
                  {p.status === "paused" ? <StatusBadge status="pending" label="Paused" /> : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="surface-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <LineChart className="h-4 w-4 text-primary-glow" /> Marketplace
            </h2>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol or name"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
                  t === tab
                    ? "border-primary/40 bg-primary/15 text-primary-glow"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "all" ? "All markets" : CATEGORY_LABELS[t as InvestCategory]}
              </button>
            ))}
          </div>

          {assets.isLoading ? (
            <SkeletonRows rows={5} />
          ) : assets.isError ? (
            <ErrorState onRetry={() => void assets.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No assets found"
              description="Try a different search or category."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((a) => (
                <AssetRow key={a.id} asset={a} />
              ))}
            </div>
          )}
        </section>

        <p className="flex items-start gap-2 rounded-2xl border border-info/25 bg-info/10 px-4 py-3 text-xs text-muted-foreground">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          Prices shown are simulated for demonstration purposes only and do not represent real market data.
          Minimum investment is {formatPrice(200)}.
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="numeric mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
