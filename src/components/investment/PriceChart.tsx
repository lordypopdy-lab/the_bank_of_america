import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { CHART_PERIODS, formatPrice, type ChartPeriod, type InvestCategory, type SeriesPoint } from "@/lib/investments";

export function PriceChart({
  data,
  period,
  onPeriodChange,
  category,
  up,
  height = 260,
}: {
  data: SeriesPoint[];
  period: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  category?: InvestCategory;
  up: boolean;
  height?: number;
}) {
  const stroke = up ? "var(--color-success)" : "var(--color-destructive)";
  const points = data.map((d) => ({ ...d, label: new Date(d.t) }));
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices, Number.POSITIVE_INFINITY);
  const max = Math.max(...prices, Number.NEGATIVE_INFINITY);
  const pad = (max - min || max * 0.02) * 0.15;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CHART_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPeriodChange(p)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
              p === period
                ? "border-primary/40 bg-primary/15 text-primary-glow"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tickFormatter={(v: string) =>
                period === "1D"
                  ? new Date(v).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  : new Date(v).toLocaleDateString("en-US", { day: "2-digit", month: "short" })
              }
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={[min - pad, max + pad]}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={70}
              tickFormatter={(v: number) => formatPrice(v, category)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(v) => new Date(v as string).toLocaleString("en-US")}
              formatter={(v) => [formatPrice(Number(v), category), "Price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={stroke}
              strokeWidth={2}
              fill="url(#priceFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Sparkline({ data, up }: { data: SeriesPoint[]; up: boolean }) {
  const stroke = up ? "var(--color-success)" : "var(--color-destructive)";
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${up ? "u" : "d"}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="price"
            stroke={stroke}
            strokeWidth={1.6}
            fill={`url(#spark-${up ? "u" : "d"})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
