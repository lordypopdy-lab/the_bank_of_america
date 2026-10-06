import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Info, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PriceChart } from "@/components/investments/PriceChart";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useBanking";
import {
  useAsset,
  useAssetSeries,
  useCloseInvestment,
  useCreateInvestment,
  useMarketTicker,
  usePositions,
} from "@/hooks/useInvestments";
import { formatDateTime, money } from "@/lib/format";
import {
  assetChangePct,
  CATEGORY_LABELS,
  formatPct,
  formatPrice,
  formatQuantity,
  MIN_INVESTMENT,
  type ChartPeriod,
} from "@/lib/investments";

export const Route = createFileRoute("/_authenticated/investments/$id")({
  head: () => ({
    meta: [
      { title: "Trading view — Vaultline Banking" },
      { name: "description", content: "Simulated price chart, market statistics and investment controls for this asset." },
      { property: "og:title", content: "Trading view — Vaultline Banking" },
      { property: "og:description", content: "Follow simulated price movement and manage your position." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssetPage,
});

function AssetPage() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  useMarketTicker(true);
  const asset = useAsset(id);
  const [period, setPeriod] = useState<ChartPeriod>("1D");
  const series = useAssetSeries(id, period);
  const positions = usePositions(profile?.id);
  const account = useAccount(profile?.id);
  const invest = useCreateInvestment();
  const close = useCloseInvestment();
  const [amount, setAmount] = useState("");

  const mine = useMemo(
    () => (positions.data ?? []).filter((p) => p.asset_id === id),
    [positions.data, id],
  );
  const open = mine.filter((p) => p.status !== "closed");

  if (asset.isLoading) return <AppShell title="Loading"><LoadingBlock label="Loading market" /></AppShell>;
  if (asset.isError || !asset.data)
    return (
      <AppShell title="Market">
        <ErrorState message="This asset is unavailable." onRetry={() => void asset.refetch()} />
      </AppShell>
    );

  const a = asset.data;
  const change = assetChangePct(a);
  const up = change >= 0;
  const available = Math.max(0, account.data?.available ?? 0);
  const locked = account.data?.locked ?? 0;
  const minimum = Math.max(MIN_INVESTMENT, Number(a.min_investment));
  const parsed = Number(amount);
  const value = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
  const qty = value > 0 ? value / Number(a.price) : 0;
  const noFunds = available <= 0;

  const error =
    noFunds
      ? locked > 0
        ? "Your funds are locked. Locked balance cannot be invested."
        : "You have no available balance to invest."
      : amount.trim() === ""
        ? null
        : value <= 0
          ? "Enter a valid investment amount."
          : value < minimum
            ? `Minimum investment is ${money(minimum)}.`
            : value > available
              ? `Insufficient available balance. You can invest up to ${money(available)}.`
              : null;

  const canSubmit = !error && value >= minimum && value <= available && !invest.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    invest.mutate(
      { assetId: a.id, amount: value },
      { onSuccess: () => setAmount("") },
    );
  };

  return (
    <AppShell title={a.symbol} subtitle={a.name}>
      <div className="space-y-6">
        <Link to="/investments" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to markets
        </Link>

        <section className="surface-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-elevated text-sm font-bold">
                {a.icon_url ? (
                  <img src={a.icon_url} alt={`${a.name} logo`} className="h-full w-full object-cover" />
                ) : (
                  a.symbol.slice(0, 3)
                )}
              </span>
              <div>
                <p className="numeric text-3xl font-bold">{formatPrice(a.price, a.category)}</p>
                <p className={cn("flex items-center gap-1 text-sm font-semibold", up ? "text-success" : "text-destructive")}>
                  {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formatPct(change)} today
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={up ? "completed" : "rejected"} label={CATEGORY_LABELS[a.category]} />
              <StatusBadge
                status={a.risk === "low" ? "active" : a.risk === "medium" ? "pending" : "rejected"}
                label={`${a.risk} risk`}
              />
            </div>
          </div>

          <div className="mt-5">
            {series.isLoading ? (
              <LoadingBlock label="Loading chart" />
            ) : (
              <PriceChart
                data={series.data ?? []}
                period={period}
                onPeriodChange={setPeriod}
                category={a.category}
                up={up}
              />
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Day open" value={formatPrice(a.day_open, a.category)} />
            <Stat label="Minimum" value={money(minimum)} />
            <Stat label="Volatility" value={`${(Number(a.volatility) * 100).toFixed(1)}%`} />
            <Stat label="Updated" value={formatDateTime(a.last_tick_at)} />
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{a.description}</p>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <section className="surface-card p-5">
            <h2 className="text-base font-bold">Open an investment</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Available balance {money(available)} · minimum {money(minimum)}
            </p>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder={String(minimum)}
                  disabled={noFunds}
                />
                {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {[minimum, 500, 1000, 5000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {money(v)}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-surface/70 p-4 text-sm">
                <Line label="Entry price" value={formatPrice(a.price, a.category)} />
                <Line label="Units" value={formatQuantity(qty)} />
                <Line label="Debited from balance" value={money(value)} strong />
              </div>
              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {invest.isPending ? "Opening…" : "Confirm investment"}
              </Button>
              <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Simulated market. Value moves with the simulation engine and is credited back to your balance when the
                position is closed.
              </p>
            </form>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-base font-bold">Your positions in {a.symbol}</h2>
            {mine.length === 0 ? (
              <EmptyState
                icon={Info}
                title="No positions yet"
                description="Open an investment to start tracking performance here."
                className="py-10"
              />
            ) : (
              <div className="mt-4 space-y-3">
                {mine.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="numeric text-sm font-bold">{money(p.liveValue)}</p>
                      <StatusBadge
                        status={p.status === "active" ? "active" : p.status === "paused" ? "pending" : "released"}
                        label={p.status === "paused" ? "Paused" : p.status === "closed" ? "Closed" : "Active"}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.reference} · {money(p.amount)} at {formatPrice(p.entry_price, a.category)} ·{" "}
                      {formatQuantity(p.quantity)} units
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-semibold",
                        p.profit >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {p.profit >= 0 ? "+" : ""}
                      {money(p.profit)} ({formatPct(p.profitPct)})
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Opened {formatDateTime(p.created_at)}</p>
                    {p.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        disabled={close.isPending}
                        onClick={() => close.mutate({ id: p.id, reason: "Closed by customer" })}
                      >
                        Close position
                      </Button>
                    ) : p.status === "paused" ? (
                      <p className="mt-3 text-[11px] text-warning">
                        This position is paused by an administrator and cannot be closed right now.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {open.length > 1 ? (
              <p className="mt-3 text-[11px] text-muted-foreground">
                You hold {open.length} open positions in this asset.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="numeric mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("numeric text-sm", strong ? "font-bold" : "font-medium")}>{value}</span>
    </div>
  );
}
