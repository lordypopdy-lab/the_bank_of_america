import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Search } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdminInvestments,
  useAdminSetInvestmentStatus,
  useMarketTicker,
} from "@/hooks/useInvestments";
import { formatDateTime, money } from "@/lib/format";
import { CATEGORY_LABELS, formatPct, formatPrice, formatQuantity, type InvestCategory } from "@/lib/investments";

export const Route = createFileRoute("/admin/investments")({
  head: () => ({
    meta: [
      { title: "Investments — Vaultline Admin" },
      { name: "description", content: "Monitor every customer investment position, pause, resume or close simulated trades." },
      { property: "og:title", content: "Investments — Vaultline Admin" },
      { property: "og:description", content: "Administrative oversight of all simulated investment positions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminInvestmentsPage,
});

const filters = ["all", "active", "paused", "closed"] as const;

function AdminInvestmentsPage() {
  const { isAdmin } = useAuth();
  useMarketTicker(isAdmin);
  const rows = useAdminInvestments(isAdmin);
  const setStatus = useAdminSetInvestmentStatus();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [search, setSearch] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows.data ?? []).filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!q ||
          [r.full_name, r.email, r.symbol, r.reference].some((v) => (v ?? "").toLowerCase().includes(q))),
    );
  }, [rows.data, filter, search]);

  const totals = useMemo(() => {
    const open = (rows.data ?? []).filter((r) => r.status !== "closed");
    return {
      count: open.length,
      invested: open.reduce((s, r) => s + Number(r.amount), 0),
      value: open.reduce((s, r) => s + Number(r.current_value), 0),
    };
  }, [rows.data]);

  return (
    <AdminShell title="Investments" subtitle="Every simulated position across all customers.">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Open positions" value={String(totals.count)} />
          <Metric label="Capital invested" value={money(totals.invested)} />
          <Metric
            label="Current value"
            value={money(totals.value)}
            tone={totals.value >= totals.invested ? "up" : "down"}
          />
        </div>

        <section className="surface-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-lg border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
                    f === filter
                      ? "border-primary/40 bg-primary/15 text-primary-glow"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, symbol or reference"
                className="pl-9"
              />
            </div>
          </div>

          {rows.isLoading ? (
            <SkeletonRows rows={5} />
          ) : rows.isError ? (
            <ErrorState onRetry={() => void rows.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState icon={Briefcase} title="No investments" description="Nothing matches this filter yet." />
          ) : (
            <div className="space-y-3">
              {list.map((r) => {
                const profit = Number(r.current_value) - Number(r.amount);
                const pct = Number(r.amount) ? (profit / Number(r.amount)) * 100 : 0;
                return (
                  <div key={r.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">
                          {r.symbol} · {r.asset_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.full_name ?? "Customer"} · {r.email ?? "—"} · {r.reference}
                        </p>
                      </div>
                      <StatusBadge
                        status={r.status === "active" ? "active" : r.status === "paused" ? "pending" : "released"}
                        label={r.status === "paused" ? "Paused" : r.status === "closed" ? "Closed" : "Active"}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
                      <span>{CATEGORY_LABELS[r.category as InvestCategory]}</span>
                      <span>Invested {money(r.amount)}</span>
                      <span>
                        {formatQuantity(r.quantity)} @ {formatPrice(r.entry_price, r.category)}
                      </span>
                      <span className="numeric font-semibold text-foreground">{money(r.current_value)}</span>
                      <span className={cn("font-semibold", profit >= 0 ? "text-success" : "text-destructive")}>
                        {profit >= 0 ? "+" : ""}
                        {money(profit)} ({formatPct(pct)})
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Opened {formatDateTime(r.created_at)}
                      {r.closed_at ? ` · closed ${formatDateTime(r.closed_at)}` : ""}
                    </p>

                    {r.status !== "closed" ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Input
                          value={reasons[r.id] ?? ""}
                          onChange={(e) => setReasons((s) => ({ ...s, [r.id]: e.target.value }))}
                          placeholder="Reason (recorded in the audit log)"
                          className="h-9 max-w-xs"
                        />
                        {r.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={setStatus.isPending}
                            onClick={() => setStatus.mutate({ id: r.id, status: "paused", reason: reasons[r.id] ?? "" })}
                          >
                            Pause
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={setStatus.isPending}
                            onClick={() => setStatus.mutate({ id: r.id, status: "active", reason: reasons[r.id] ?? "" })}
                          >
                            Resume
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: r.id, status: "closed", reason: reasons[r.id] ?? "" })}
                        >
                          Close &amp; return funds
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Final value {money(r.final_value ?? r.current_value)} returned to the customer balance.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
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
