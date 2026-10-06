import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useBanking";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Vaultline Banking" },
      { name: "description", content: "Alerts about withdrawals, balance changes, fund locks and account status on Vaultline." },
      { property: "og:title", content: "Notifications — Vaultline Banking" },
      { property: "og:description", content: "Stay on top of every Vaultline account alert." },
    ],
  }),
  component: NotificationsPage,
});

const tone: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
};

function NotificationsPage() {
  const { profile } = useAuth();
  const uid = profile?.id;
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useNotifications(uid);

  const unread = (data ?? []).filter((n) => !n.read);

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("notifications")
        .update({ read: true })
        .eq("user_id", uid)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <AppShell
      title="Notifications"
      subtitle={unread.length ? `${unread.length} unread` : "You're all caught up"}
    >
      <div className="surface-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold">Account alerts</h2>
          {unread.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <SkeletonRows rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="We'll let you know when something happens on your account."
          />
        ) : (
          <div className="space-y-2.5">
            {(data ?? []).map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markOne.mutate(n.id)}
                className={cn(
                  "grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                  n.read
                    ? "border-border bg-surface/50"
                    : "border-primary/30 bg-primary/10 hover:bg-primary/15",
                )}
              >
                <span
                  className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone[n.type] ?? "bg-info")}
                />
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.message}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
