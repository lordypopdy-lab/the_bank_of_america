import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Receipt, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TransactionRow } from "@/components/TransactionRow";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useBanking";
import { cn } from "@/lib/utils";
import type { TxnType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Vaultline Banking" },
      { name: "description", content: "Browse and search every credit, debit and adjustment on your Vaultline account." },
      { property: "og:title", content: "Transactions — Vaultline Banking" },
      { property: "og:description", content: "Your full Vaultline transaction ledger." },
    ],
  }),
  component: TransactionsPage,
});

const filters: { key: TxnType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "adjustment", label: "Adjustments" },
  { key: "fund_lock", label: "Locks" },
];

function TransactionsPage() {
  const { profile } = useAuth();
  const { data, isLoading, isError, refetch } = useTransactions(profile?.id);
  const [filter, setFilter] = useState<TxnType | "all">("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      const matchesFilter =
        filter === "all" ||
        t.type === filter ||
        (filter === "fund_lock" && t.type === "fund_unlock");
      const matchesQuery =
        !q ||
        t.description.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        String(t.amount).includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [data, filter, query]);

  return (
    <AppShell title="Transactions" subtitle="Every movement on your account, newest first.">
      <div className="surface-card p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search description, reference or amount"
              className="h-11 bg-background/60 pl-10"
              aria-label="Search transactions"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  filter === f.key
                    ? "border-primary/50 bg-primary/20 text-foreground"
                    : "border-border bg-elevated text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <SkeletonRows rows={6} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nothing to show"
              description={
                query || filter !== "all"
                  ? "No transactions match your filters."
                  : "Your transaction history will appear here."
              }
            />
          ) : (
            <div className="space-y-2.5">
              {rows.map((t) => (
                <TransactionRow key={t.id} txn={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
