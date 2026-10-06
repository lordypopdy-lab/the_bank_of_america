import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useAdminUsers } from "@/hooks/useBanking";
import { formatDate, money } from "@/lib/format";

export const Route = createFileRoute("/admin/users/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Users — Vaultline Console" },
      { name: "description", content: "Search Vaultline customers, review balances and open individual account controls." },
      { property: "og:title", content: "Users — Vaultline Console" },
      { property: "og:description", content: "Customer directory for Vaultline administrators." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminUsers(isAdmin);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.account_number.includes(q),
    );
  }, [data, query]);

  return (
    <AdminShell title="Customers" subtitle="Search accounts and manage balances, status and restrictions.">
      <div className="surface-card p-5 sm:p-6">
        <div className="relative mb-5 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or account number"
            className="h-11 bg-background/60 pl-10"
            aria-label="Search customers"
          />
        </div>

        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" description="Try a different search term." />
        ) : (
          <div className="space-y-2.5">
            {rows.map((u) => (
              <Link
                key={u.id}
                to="/admin/users/$id"
                params={{ id: u.id }}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-surface/70 px-4 py-3.5 transition-colors hover:bg-elevated"
              >
                <ProfileAvatar path={u.avatar_url} name={u.full_name} size="md" ring={false} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{u.full_name}</p>
                    <StatusBadge status={u.status} />
                    {u.is_restricted ? <StatusBadge status="restricted" label="No withdrawals" /> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email} · {u.account_number} · joined {formatDate(u.created_at)}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="numeric text-sm font-bold">{money(Number(u.total_balance))}</p>
                  <p className="numeric text-[11px] text-muted-foreground">
                    {money(Number(u.available_balance))} available
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
