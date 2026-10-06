import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { useAdminActivity } from "@/hooks/useBanking";
import { formatDateTime, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/admin/activity")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Audit log — Vaultline Console" },
      { name: "description", content: "Immutable record of every administrative action taken across Vaultline accounts." },
      { property: "og:title", content: "Audit log — Vaultline Console" },
      { property: "og:description", content: "Immutable Vaultline administrative audit trail." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminActivityPage,
});

function AdminActivityPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminActivity(isAdmin);

  return (
    <AdminShell title="Audit log" subtitle="Every administrative action, newest first.">
      <div className="surface-card p-5 sm:p-6">
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={Activity} title="No activity recorded" description="Admin actions will appear here." />
        ) : (
          <div className="space-y-2.5">
            {(data ?? []).map((a) => (
              <article
                key={a.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{statusLabel(a.action)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.admin_email ?? "Administrator"} · Ref {a.reference}
                  </p>
                  {a.previous_value || a.new_value ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {a.previous_value ?? "—"} → <span className="text-foreground">{a.new_value ?? "—"}</span>
                    </p>
                  ) : null}
                  {a.reason ? <p className="mt-1 text-xs italic text-muted-foreground">{a.reason}</p> : null}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDateTime(a.created_at)}
                </span>
              </article>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
