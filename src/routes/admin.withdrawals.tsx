import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useAdminWithdrawals } from "@/hooks/useBanking";
import { db, friendlyError } from "@/lib/db";
import { formatDate, formatDateTime, money, statusLabel, toDateTimeLocal, withdrawalStatuses } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WithdrawalStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/withdrawals")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Withdrawals — Vaultline Console" },
      { name: "description", content: "Review, approve, schedule and complete customer withdrawal requests on Vaultline." },
      { property: "og:title", content: "Withdrawals — Vaultline Console" },
      { property: "og:description", content: "Manage the Vaultline withdrawal queue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminWithdrawalsPage,
});

const tabs: (WithdrawalStatus | "all")[] = ["all", ...withdrawalStatuses];

function AdminWithdrawalsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useAdminWithdrawals(isAdmin);
  const [tab, setTab] = useState<WithdrawalStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    status: "pending" as WithdrawalStatus,
    processing_date: "",
    expected_date: "",
    completed_at: "",
    reason: "",
  });

  const rows = useMemo(
    () => (data ?? []).filter((w) => tab === "all" || w.status === tab),
    [data, tab],
  );

  const update = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("admin_update_withdrawal", {
        _id: id,
        _status: draft.status,
        _processing_date: draft.processing_date ? new Date(draft.processing_date).toISOString() : null,
        _expected_date: draft.expected_date ? new Date(draft.expected_date).toISOString() : null,
        _completed_at: draft.completed_at ? new Date(draft.completed_at).toISOString() : null,
        _reason: draft.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal updated");
      setOpenId(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't update this request.")),
  });

  return (
    <AdminShell title="Withdrawals" subtitle="Move requests through review, processing and completion.">
      <div className="surface-card p-5 sm:p-6">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                tab === t
                  ? "border-primary/50 bg-primary/20 text-foreground"
                  : "border-border bg-elevated text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All" : statusLabel(t)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Wallet} title="Nothing here" description="No requests match this filter." />
        ) : (
          <div className="space-y-3">
            {rows.map((w) => {
              const open = openId === w.id;
              return (
                <article key={w.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="numeric text-base font-bold">{money(Number(w.amount))}</p>
                        <StatusBadge status={w.status} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {w.profile?.full_name ?? "Unknown customer"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.bank_name} · {w.account_name} · {w.account_number}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Requested {formatDateTime(w.requested_at)} · Ref {w.reference}
                      </p>
                      {w.note ? (
                        <p className="mt-2 text-xs italic text-muted-foreground">"{w.note}"</p>
                      ) : null}
                    </div>
                    <Button
                      variant={open ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (open) {
                          setOpenId(null);
                          return;
                        }
                        setOpenId(w.id);
                        setDraft({
                          status: w.status,
                          processing_date: toDateTimeLocal(w.processing_date),
                          expected_date: toDateTimeLocal(w.expected_completion_date),
                          completed_at: toDateTimeLocal(w.completed_at),
                          reason: w.rejection_reason ?? "",
                        });
                      }}
                    >
                      {open ? "Close" : "Manage"}
                    </Button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Processing</p>
                      <p className="mt-0.5 font-medium">{formatDate(w.processing_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expected</p>
                      <p className="mt-0.5 font-medium">{formatDate(w.expected_completion_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="mt-0.5 font-medium">{formatDate(w.completed_at)}</p>
                    </div>
                  </div>

                  {open ? (
                    <div className="mt-4 space-y-4 rounded-2xl border border-border bg-background/50 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`status-${w.id}`}>Status</Label>
                          <Select
                            value={draft.status}
                            onValueChange={(v) => setDraft((d) => ({ ...d, status: v as WithdrawalStatus }))}
                          >
                            <SelectTrigger id={`status-${w.id}`} className="h-11 bg-background/60">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {withdrawalStatuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {statusLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`processing-${w.id}`}>Processing date</Label>
                          <Input
                            id={`processing-${w.id}`}
                            type="datetime-local"
                            value={draft.processing_date}
                            onChange={(e) => setDraft((d) => ({ ...d, processing_date: e.target.value }))}
                            className="h-11 bg-background/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`expected-${w.id}`}>Expected completion</Label>
                          <Input
                            id={`expected-${w.id}`}
                            type="datetime-local"
                            value={draft.expected_date}
                            onChange={(e) => setDraft((d) => ({ ...d, expected_date: e.target.value }))}
                            className="h-11 bg-background/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`completed-${w.id}`}>Completed at</Label>
                          <Input
                            id={`completed-${w.id}`}
                            type="datetime-local"
                            value={draft.completed_at}
                            onChange={(e) => setDraft((d) => ({ ...d, completed_at: e.target.value }))}
                            className="h-11 bg-background/60"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reason-${w.id}`}>
                          Note to customer {draft.status === "rejected" ? "(required for rejection)" : ""}
                        </Label>
                        <Textarea
                          id={`reason-${w.id}`}
                          rows={2}
                          value={draft.reason}
                          onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
                          className="resize-none bg-background/60"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => update.mutate(w.id)}
                          disabled={update.isPending}
                          className="h-11"
                        >
                          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                        </Button>
                        <Button variant="ghost" className="h-11" onClick={() => setOpenId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
