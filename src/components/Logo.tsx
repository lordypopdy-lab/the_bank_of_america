import { Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ compact, admin }: { compact?: boolean; admin?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl shadow-[var(--shadow-glow)]">
        <Landmark className="h-5 w-5 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-tight">Vaultline</span>
          <span className={cn("pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground")}>
            {admin ? "Admin Console" : "INTERACTIVE IBKR"}
          </span>
        </span>
      )}
    </Link>
  );
}
