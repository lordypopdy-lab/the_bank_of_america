import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import { assetChangePct, formatPct, formatPrice, type InvestmentAsset } from "@/lib/investments";

export function AssetRow({ asset }: { asset: InvestmentAsset }) {
  const change = assetChangePct(asset);
  const up = change >= 0;
  return (
    <Link
      to="/investments/$id"
      params={{ id: asset.id }}
      className="surface-card flex items-center gap-4 p-4 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-elevated text-xs font-bold">
        {asset.icon_url ? (
          <img src={asset.icon_url} alt={`${asset.name} logo`} className="h-full w-full object-cover" />
        ) : (
          asset.symbol.slice(0, 3)
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{asset.symbol}</p>
        <p className="truncate text-xs text-muted-foreground">{asset.name}</p>
      </div>
      <div className="text-right">
        <p className="numeric text-sm font-bold">{formatPrice(asset.price, asset.category)}</p>
        <p
          className={cn(
            "flex items-center justify-end gap-1 text-xs font-semibold",
            up ? "text-success" : "text-destructive",
          )}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatPct(change)}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">min {money(asset.min_investment)}</p>
      </div>
    </Link>
  );
}
