import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, friendlyError } from "@/lib/db";
import { toast } from "sonner";
import {
  decorate,
  type AdminInvestmentRow,
  type ChartPeriod,
  type InvestmentAsset,
  type InvestmentPosition,
  type InvestmentTxn,
  type PositionWithAsset,
  type SeriesPoint,
  type SimulationSettings,
} from "@/lib/investments";

export function useAssets(includeDisabled = false) {
  return useQuery({
    queryKey: ["assets", includeDisabled],
    refetchInterval: 15000,
    queryFn: async (): Promise<InvestmentAsset[]> => {
      let q = db.from("investment_assets").select("*").order("category").order("symbol");
      if (!includeDisabled) q = q.eq("enabled", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as InvestmentAsset[];
    },
  });
}

export function useAsset(id?: string) {
  return useQuery({
    queryKey: ["asset", id],
    enabled: !!id,
    refetchInterval: 10000,
    queryFn: async (): Promise<InvestmentAsset | null> => {
      const { data, error } = await db.from("investment_assets").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as InvestmentAsset) ?? null;
    },
  });
}

export function useAssetSeries(id?: string, period: ChartPeriod = "1D") {
  return useQuery({
    queryKey: ["asset-series", id, period],
    enabled: !!id,
    refetchInterval: 20000,
    queryFn: async (): Promise<SeriesPoint[]> => {
      const { data, error } = await db.rpc("asset_series", { _asset_id: id, _period: period });
      if (error) throw error;
      return ((data ?? []) as { t: string; price: number }[]).map((r) => ({
        t: r.t,
        price: Number(r.price),
      }));
    },
  });
}

export function usePositions(userId?: string) {
  return useQuery({
    queryKey: ["positions", userId],
    enabled: !!userId,
    refetchInterval: 15000,
    queryFn: async (): Promise<PositionWithAsset[]> => {
      const [{ data: positions, error }, { data: assets }] = await Promise.all([
        db.from("investment_positions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        db.from("investment_assets").select("*"),
      ]);
      if (error) throw error;
      const map = new Map<string, InvestmentAsset>(
        ((assets ?? []) as InvestmentAsset[]).map((a) => [a.id, a]),
      );
      return ((positions ?? []) as InvestmentPosition[]).map((p) => decorate(p, map.get(p.asset_id) ?? null));
    },
  });
}

export function useInvestmentHistory(userId?: string) {
  return useQuery({
    queryKey: ["investment-history", userId],
    enabled: !!userId,
    queryFn: async (): Promise<InvestmentTxn[]> => {
      const { data, error } = await db
        .from("investment_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as InvestmentTxn[];
    },
  });
}

export function useSimulationSettings() {
  return useQuery({
    queryKey: ["simulation-settings"],
    queryFn: async (): Promise<SimulationSettings | null> => {
      const { data, error } = await db.from("investment_simulation_settings").select("*").maybeSingle();
      if (error) throw error;
      return (data as SimulationSettings) ?? null;
    },
  });
}

/** Advances the simulated market on a timer while an investments screen is open. */
export function useMarketTicker(enabled = true) {
  const queryClient = useQueryClient();
  const { data: settings } = useSimulationSettings();
  const interval = Math.max(5, Number(settings?.update_interval_seconds ?? 20)) * 1000;
  const engineOn = settings?.engine_enabled !== false;

  useEffect(() => {
    if (!enabled || !engineOn) return;
    let cancelled = false;
    const tick = async () => {
      const { error } = await db.rpc("tick_market");
      if (cancelled || error) return;
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
      void queryClient.invalidateQueries({ queryKey: ["asset"] });
      void queryClient.invalidateQueries({ queryKey: ["positions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-investments"] });
    };
    void tick();
    const id = window.setInterval(() => void tick(), interval);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, engineOn, interval, queryClient]);
}

function refreshAll(queryClient: ReturnType<typeof useQueryClient>) {
  for (const key of [
    "positions",
    "account",
    "transactions",
    "notifications",
    "investment-history",
    "admin-investments",
    "admin-overview",
    "admin-activity",
    "admin-users",
    "admin-user",
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, amount }: { assetId: string; amount: number }) => {
      const { data, error } = await db.rpc("create_investment", { _asset_id: assetId, _amount: amount });
      if (error) throw error;
      return data as InvestmentPosition;
    },
    onSuccess: () => {
      toast.success("Investment opened");
      refreshAll(queryClient);
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't open that investment.")),
  });
}

export function useCloseInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await db.rpc("close_investment", { _id: id, _reason: reason ?? null });
      if (error) throw error;
      return data as InvestmentPosition;
    },
    onSuccess: () => {
      toast.success("Investment closed and funds returned");
      refreshAll(queryClient);
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't close that investment.")),
  });
}

/* ---------------------------------- admin --------------------------------- */

export function useAdminInvestments(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-investments"],
    enabled,
    refetchInterval: 20000,
    queryFn: async (): Promise<AdminInvestmentRow[]> => {
      const { data, error } = await db.rpc("admin_investments");
      if (error) throw error;
      return (data ?? []) as AdminInvestmentRow[];
    },
  });
}

export function useAdminSetInvestmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const { data, error } = await db.rpc("admin_set_investment_status", {
        _id: id,
        _status: status,
        _reason: reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Investment updated");
      refreshAll(queryClient);
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't update that investment.")),
  });
}

export interface AssetDraft {
  id?: string | null;
  name: string;
  symbol: string;
  category: string;
  description: string;
  icon_url: string | null;
  min_investment: number;
  risk: string;
  enabled: boolean;
  price: number;
  volatility: number;
  trend: number;
  max_daily_move: number;
  update_interval_seconds: number;
  reason?: string;
}

export function useUpsertAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: AssetDraft) => {
      const { data, error } = await db.rpc("admin_upsert_asset", {
        _id: draft.id ?? null,
        _name: draft.name,
        _symbol: draft.symbol,
        _category: draft.category,
        _description: draft.description,
        _icon_url: draft.icon_url,
        _min_investment: draft.min_investment,
        _risk: draft.risk,
        _enabled: draft.enabled,
        _price: draft.price,
        _volatility: draft.volatility,
        _trend: draft.trend,
        _max_daily_move: draft.max_daily_move,
        _update_interval_seconds: draft.update_interval_seconds,
        _reason: draft.reason ?? null,
      });
      if (error) throw error;
      return data as InvestmentAsset;
    },
    onSuccess: () => {
      toast.success("Asset saved");
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't save that asset.")),
  });
}

export function useUpdateSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      engine_enabled: boolean;
      update_interval_seconds: number;
      max_daily_move: number;
      default_volatility: number;
      market_trend: number;
      reason?: string;
    }) => {
      const { data, error } = await db.rpc("admin_update_simulation", {
        _engine_enabled: input.engine_enabled,
        _update_interval_seconds: input.update_interval_seconds,
        _max_daily_move: input.max_daily_move,
        _default_volatility: input.default_volatility,
        _market_trend: input.market_trend,
        _reason: input.reason ?? null,
      });
      if (error) throw error;
      return data as SimulationSettings;
    },
    onSuccess: () => {
      toast.success("Simulation settings updated");
      void queryClient.invalidateQueries({ queryKey: ["simulation-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't update the simulation.")),
  });
}
