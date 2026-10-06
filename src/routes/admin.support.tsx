import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { SupportThread } from "@/components/SupportThread";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useAdminConversations, useSupportRealtime } from "@/hooks/useSupport";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/support")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customer Support — Vaultline Console" },
      { name: "description", content: "Reply to customer support conversations." },
      { property: "og:title", content: "Customer Support — Vaultline Console" },
      { property: "og:description", content: "Vaultline customer support inbox." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminConversations(isAdmin);
  useSupportRealtime(isAdmin);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (r) =>
        (filter === "all" || r.unread > 0) &&
        (!term || [r.full_name, r.email, r.last_message].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [data, q, filter]);
  const current = (data ?? []).find((r) => r.id === selected);

  return (
    <AdminShell title="Customer Support" subtitle="Conversations with customers.">
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className={cn("surface-card p-4", current && "hidden lg:block")}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or message" className="h-11 bg-background/60" />
          <div className="mt-3 flex gap-2">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {isLoading ? (
              <SkeletonRows rows={4} />
            ) : isError ? (
              <ErrorState onRetry={() => void refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState icon={MessageCircle} title="No conversations" description="Customer messages will appear here." />
            ) : (
              rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-elevated",
                    selected === r.id && "bg-primary/15",
                  )}
                >
                  <ProfileAvatar path={r.avatar_url} name={r.full_name} size="sm" ring={false} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-sm", r.unread > 0 ? "font-bold" : "font-medium")}>
                        {r.full_name || r.email || "Customer"}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(r.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {r.last_sender === "admin" ? "You: " : ""}
                        {r.last_message}
                      </p>
                      {r.unread > 0 ? (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {r.unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className={cn("surface-card overflow-hidden", !current && "hidden lg:block")}>
          {current ? (
            <>
              <div className="flex items-center gap-3 border-b border-border p-4">
                <button onClick={() => setSelected(null)} className="lg:hidden" aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <ProfileAvatar path={current.avatar_url} name={current.full_name} size="sm" ring={false} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{current.full_name || "Customer"}</p>
                  <p className="truncate text-xs text-muted-foreground">{current.email}</p>
                </div>
              </div>
              <SupportThread conversationId={current.id} viewer="admin" otherName={current.full_name ?? undefined} />
            </>
          ) : (
            <div className="p-10">
              <EmptyState icon={MessageCircle} title="Select a conversation" description="Choose a customer to view and reply." />
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
