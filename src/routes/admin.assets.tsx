import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Settings2, Sparkles } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { ErrorState, SkeletonRows } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useAssets,
  useSimulationSettings,
  useUpdateSimulation,
  useUpsertAsset,
  type AssetDraft,
} from "@/hooks/useInvestments";
import { money } from "@/lib/format";
import { assetChangePct, CATEGORY_LABELS, formatPct, formatPrice, type InvestmentAsset } from "@/lib/investments";

export const Route = createFileRoute("/admin/assets")({
  head: () => ({
    meta: [
      { title: "Assets & simulation — Vaultline Admin" },
      { name: "description", content: "Create investment assets, set minimums and risk, and tune the market simulation engine." },
      { property: "og:title", content: "Assets & simulation — Vaultline Admin" },
      { property: "og:description", content: "Manage the investment marketplace and price simulation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAssetsPage,
});

const emptyDraft: AssetDraft = {
  id: null,
  name: "",
  symbol: "",
  category: "stocks",
  description: "",
  icon_url: null,
  min_investment: 200,
  risk: "medium",
  enabled: true,
  price: 100,
  volatility: 0.015,
  trend: 0,
  max_daily_move: 0.12,
  update_interval_seconds: 20,
  reason: "",
};

function toDraft(a: InvestmentAsset): AssetDraft {
  return {
    id: a.id,
    name: a.name,
    symbol: a.symbol,
    category: a.category,
    description: a.description,
    icon_url: a.icon_url,
    min_investment: Number(a.min_investment),
    risk: a.risk,
    enabled: a.enabled,
    price: Number(a.price),
    volatility: Number(a.volatility),
    trend: Number(a.trend),
    max_daily_move: Number(a.max_daily_move),
    update_interval_seconds: a.update_interval_seconds,
    reason: "",
  };
}

function AdminAssetsPage() {
  const { isAdmin } = useAuth();
  const assets = useAssets(true);
  const upsert = useUpsertAsset();
  const settings = useSimulationSettings();
  const updateSim = useUpdateSimulation();
  const [draft, setDraft] = useState<AssetDraft | null>(null);

  const [sim, setSim] = useState({
    engine_enabled: true,
    update_interval_seconds: 20,
    max_daily_move: 0.12,
    default_volatility: 0.015,
    market_trend: 0,
    reason: "",
  });

  useEffect(() => {
    if (settings.data) {
      setSim({
        engine_enabled: settings.data.engine_enabled,
        update_interval_seconds: settings.data.update_interval_seconds,
        max_daily_move: Number(settings.data.max_daily_move),
        default_volatility: Number(settings.data.default_volatility),
        market_trend: Number(settings.data.market_trend),
        reason: "",
      });
    }
  }, [settings.data]);

  const set = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <AdminShell
      title="Assets & simulation"
      subtitle="Control the investment marketplace and how simulated prices move."
      actions={
        isAdmin ? (
          <Button size="sm" onClick={() => setDraft({ ...emptyDraft })}>
            <Plus className="mr-1.5 h-4 w-4" /> New asset
          </Button>
        ) : null
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="surface-card p-5">
          <h2 className="mb-4 text-base font-bold">Investment assets</h2>
          {assets.isLoading ? (
            <SkeletonRows rows={5} />
          ) : assets.isError ? (
            <ErrorState onRetry={() => void assets.refetch()} />
          ) : (
            <div className="space-y-3">
              {(assets.data ?? []).map((a) => {
                const change = assetChangePct(a);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setDraft(toDraft(a))}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors",
                      draft?.id === a.id
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-surface/70 hover:bg-elevated",
                    )}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-elevated text-[11px] font-bold">
                      {a.symbol.slice(0, 3)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {a.symbol} · {a.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {CATEGORY_LABELS[a.category]} · min {money(a.min_investment)} · {a.risk} risk
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="numeric text-sm font-bold">{formatPrice(a.price, a.category)}</p>
                      <p className={cn("text-xs font-semibold", change >= 0 ? "text-success" : "text-destructive")}>
                        {formatPct(change)}
                      </p>
                    </div>
                    <StatusBadge status={a.enabled ? "active" : "released"} label={a.enabled ? "Live" : "Hidden"} />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-5">
          {draft ? (
            <section className="surface-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
                <Sparkles className="h-4 w-4 text-primary-glow" />
                {draft.id ? "Edit asset" : "New asset"}
              </h2>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  upsert.mutate(draft, { onSuccess: (a) => setDraft(toDraft(a)) });
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name">
                    <Input value={draft.name} onChange={(e) => set("name", e.target.value)} required />
                  </Field>
                  <Field label="Symbol">
                    <Input value={draft.symbol} onChange={(e) => set("symbol", e.target.value.toUpperCase())} required />
                  </Field>
                  <Field label="Category">
                    <Select value={draft.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stocks">Stocks</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="forex">Forex</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Risk level">
                    <Select value={draft.risk} onValueChange={(v) => set("risk", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Description">
                  <Textarea
                    rows={3}
                    value={draft.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>

                <Field label="Icon URL (optional)">
                  <Input
                    value={draft.icon_url ?? ""}
                    onChange={(e) => set("icon_url", e.target.value || null)}
                    placeholder="https://…"
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Current price">
                    <Input
                      type="number"
                      step="0.000001"
                      value={draft.price}
                      onChange={(e) => set("price", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Minimum investment (≥ 200)">
                    <Input
                      type="number"
                      min={200}
                      step="1"
                      value={draft.min_investment}
                      onChange={(e) => set("min_investment", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Volatility (0–0.25)">
                    <Input
                      type="number"
                      step="0.001"
                      value={draft.volatility}
                      onChange={(e) => set("volatility", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Trend per tick (−0.05–0.05)">
                    <Input
                      type="number"
                      step="0.0001"
                      value={draft.trend}
                      onChange={(e) => set("trend", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Max daily move">
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.max_daily_move}
                      onChange={(e) => set("max_daily_move", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Update interval (seconds)">
                    <Input
                      type="number"
                      min={5}
                      value={draft.update_interval_seconds}
                      onChange={(e) => set("update_interval_seconds", Number(e.target.value))}
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4">
                  <div>
                    <p className="text-sm font-semibold">Visible to customers</p>
                    <p className="text-xs text-muted-foreground">Hidden assets disappear from the marketplace.</p>
                  </div>
                  <Switch checked={draft.enabled} onCheckedChange={(v) => set("enabled", v)} />
                </div>

                <Field label="Reason (audit log)">
                  <Input value={draft.reason ?? ""} onChange={(e) => set("reason", e.target.value)} />
                </Field>

                <div className="flex gap-2">
                  <Button type="submit" disabled={upsert.isPending}>
                    {upsert.isPending ? "Saving…" : "Save asset"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          <section className="surface-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              <Settings2 className="h-4 w-4 text-primary-glow" /> Simulation engine
            </h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateSim.mutate(sim);
              }}
            >
              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/70 p-4">
                <div>
                  <p className="text-sm font-semibold">Engine running</p>
                  <p className="text-xs text-muted-foreground">Pause to freeze all simulated prices.</p>
                </div>
                <Switch
                  checked={sim.engine_enabled}
                  onCheckedChange={(v) => setSim((s) => ({ ...s, engine_enabled: v }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Update interval (seconds)">
                  <Input
                    type="number"
                    min={5}
                    value={sim.update_interval_seconds}
                    onChange={(e) => setSim((s) => ({ ...s, update_interval_seconds: Number(e.target.value) }))}
                  />
                </Field>
                <Field label="Max daily movement">
                  <Input
                    type="number"
                    step="0.01"
                    value={sim.max_daily_move}
                    onChange={(e) => setSim((s) => ({ ...s, max_daily_move: Number(e.target.value) }))}
                  />
                </Field>
                <Field label="Default volatility">
                  <Input
                    type="number"
                    step="0.001"
                    value={sim.default_volatility}
                    onChange={(e) => setSim((s) => ({ ...s, default_volatility: Number(e.target.value) }))}
                  />
                </Field>
                <Field label="Market trend (bull / bear)">
                  <Input
                    type="number"
                    step="0.0001"
                    value={sim.market_trend}
                    onChange={(e) => setSim((s) => ({ ...s, market_trend: Number(e.target.value) }))}
                  />
                </Field>
              </div>
              <Field label="Reason (audit log)">
                <Input value={sim.reason} onChange={(e) => setSim((s) => ({ ...s, reason: e.target.value }))} />
              </Field>
              <Button type="submit" disabled={updateSim.isPending}>
                {updateSim.isPending ? "Saving…" : "Save simulation settings"}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
