export type InvestCategory = "stocks" | "crypto" | "forex";
export type InvestStatus = "active" | "paused" | "closed";
export type RiskLevel = "low" | "medium" | "high";
export type ChartPeriod = "1D" | "1W" | "1M" | "3M" | "1Y";

export const MIN_INVESTMENT = 200;

export const CHART_PERIODS: ChartPeriod[] = ["1D", "1W", "1M", "3M", "1Y"];

export const CATEGORY_LABELS: Record<InvestCategory, string> = {
  stocks: "Stocks",
  crypto: "Crypto",
  forex: "Forex",
};

export interface InvestmentAsset {
  id: string;
  name: string;
  symbol: string;
  category: InvestCategory;
  description: string;
  icon_url: string | null;
  min_investment: number;
  risk: RiskLevel;
  enabled: boolean;
  price: number;
  day_open: number;
  day_open_at: string;
  volatility: number;
  trend: number;
  max_daily_move: number;
  update_interval_seconds: number;
  last_tick_at: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentPosition {
  id: string;
  user_id: string;
  asset_id: string;
  category: InvestCategory;
  amount: number;
  entry_price: number;
  quantity: number;
  current_value: number;
  status: InvestStatus;
  reference: string;
  paused_at: string | null;
  closed_at: string | null;
  final_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface PositionWithAsset extends InvestmentPosition {
  asset: InvestmentAsset | null;
  liveValue: number;
  profit: number;
  profitPct: number;
}

export interface InvestmentTxn {
  id: string;
  position_id: string;
  user_id: string;
  asset_id: string;
  type: string;
  amount: number;
  price: number;
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface SimulationSettings {
  id: string;
  engine_enabled: boolean;
  update_interval_seconds: number;
  max_daily_move: number;
  default_volatility: number;
  market_trend: number;
  updated_at: string;
}

export interface AdminInvestmentRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  asset_id: string;
  symbol: string;
  asset_name: string;
  category: InvestCategory;
  amount: number;
  entry_price: number;
  quantity: number;
  current_price: number;
  current_value: number;
  status: InvestStatus;
  reference: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  final_value: number | null;
}

export interface SeriesPoint {
  t: string;
  price: number;
}

export function assetChangePct(asset?: Pick<InvestmentAsset, "price" | "day_open"> | null) {
  if (!asset || !asset.day_open) return 0;
  return ((Number(asset.price) - Number(asset.day_open)) / Number(asset.day_open)) * 100;
}

export function formatPct(value: number, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatPrice(value: number | null | undefined, category?: InvestCategory) {
  const n = Number(value ?? 0);
  const digits = category === "forex" ? 4 : n < 10 ? 4 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatQuantity(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function decorate(position: InvestmentPosition, asset: InvestmentAsset | null): PositionWithAsset {
  const live =
    position.status === "closed"
      ? Number(position.final_value ?? position.current_value)
      : asset
        ? Number(position.quantity) * Number(asset.price)
        : Number(position.current_value);
  const profit = live - Number(position.amount);
  return {
    ...position,
    asset,
    liveValue: live,
    profit,
    profitPct: Number(position.amount) ? (profit / Number(position.amount)) * 100 : 0,
  };
}
