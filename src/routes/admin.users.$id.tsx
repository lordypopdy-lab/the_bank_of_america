import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminShell } from "@/components/AdminShell";
import { AdminRoleCard } from "@/components/AdminRoleCard";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { TransactionRow } from "@/components/TransactionRow";
import { EmptyState, LoadingBlock } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { db, friendlyError } from "@/lib/db";
import { formatDate, formatDateTime, money, toDateTimeLocal } from "@/lib/format";
import type {
  AccountStatus,
  AppNotification,
  Profile,
  Transaction,
  Withdrawal,
  WithdrawalRestriction,
} from "@/lib/types";


export const Route = createFileRoute("/admin/users/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customer detail — Vaultline Console" },
      { name: "description", content: "Adjust balances, account status and withdrawal restrictions for a Vaultline customer." },
      { property: "og:title", content: "Customer detail — Vaultline Console" },
      { property: "og:description", content: "Manage an individual Vaultline customer account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUserDetailPage,
});

interface Detail {
  profile: Profile | null;
  total: number;
  locked: number;
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  restriction: WithdrawalRestriction | null;
  notifications: AppNotification[];
}

interface NotificationDraft {
  id: string | null;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read: boolean;
}

function AdminUserDetailPage() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["admin-user", id],
    enabled: isAdmin,
    queryFn: async (): Promise<Detail> => {
      const [{ data: profile }, { data: account }, { data: txns }, { data: ws }, { data: r }, { data: notes }] =
        await Promise.all([
          db.from("profiles").select("*").eq("id", id).maybeSingle(),
          db.from("accounts").select("*").eq("user_id", id).maybeSingle(),
          db.from("transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(25),
          db.from("withdrawals").select("*").eq("user_id", id).order("requested_at", { ascending: false }),
          db.from("withdrawal_restrictions").select("*").eq("user_id", id).maybeSingle(),
          db.from("notifications").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(100),
        ]);
      return {
        profile: (profile as Profile) ?? null,
        total: Number(account?.total_balance ?? 0),
        locked: Number(account?.locked_balance ?? 0),
        transactions: (txns ?? []) as Transaction[],
        withdrawals: (ws ?? []) as Withdrawal[],
        restriction: (r as WithdrawalRestriction) ?? null,
        notifications: (notes ?? []) as AppNotification[],
      };
    },
  });

  const p = detail.data?.profile;

  const [adjust, setAdjust] = useState({ amount: "", direction: "credit", reason: "" });
  const [status, setStatus] = useState<AccountStatus>("active");
  const [statusMessage, setStatusMessage] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [restrictMessage, setRestrictMessage] = useState("");
  const [restrictReason, setRestrictReason] = useState("");
  const [restrictStart, setRestrictStart] = useState("");
  const [restrictEnd, setRestrictEnd] = useState("");
  const [details, setDetails] = useState({ fullName: "", phone: "", accountNumber: "", memberSince: "" });
  const [draft, setDraft] = useState<NotificationDraft | null>(null);

  useEffect(() => {
    if (!detail.data) return;
    setStatus(detail.data.profile?.status ?? "active");
    setStatusMessage(detail.data.profile?.status_message ?? "");
    setRestricted(Boolean(detail.data.restriction?.is_restricted));
    setRestrictMessage(detail.data.restriction?.message ?? "");
    setRestrictReason(detail.data.restriction?.reason ?? "");
    setRestrictStart(toDateTimeLocal(detail.data.restriction?.start_date));
    setRestrictEnd(toDateTimeLocal(detail.data.restriction?.end_date));
    setDetails({
      fullName: detail.data.profile?.full_name ?? "",
      phone: detail.data.profile?.phone ?? "",
      accountNumber: detail.data.profile?.account_number ?? "",
      memberSince: toDateTimeLocal(detail.data.profile?.created_at),
    });
  }, [detail.data]);


  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
    void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
  };

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const parsed = z
        .object({
          amount: z.number().positive("Enter an amount greater than zero"),
          reason: z.string().trim().min(3, "A reason is required for the audit log").max(240),
        })
        .safeParse({ amount: Number(adjust.amount), reason: adjust.reason });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      const { error } = await db.rpc("admin_adjust_balance", {
        _target: id,
        _amount: parsed.data.amount,
        _direction: adjust.direction,
        _reason: parsed.data.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Balance updated");
      setAdjust({ amount: "", direction: "credit", reason: "" });
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't adjust that balance.")),
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("admin_set_status", {
        _target: id,
        _status: status,
        _message: statusMessage || null,
        _reason: `Status set to ${status}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account status updated");
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't update the status.")),
  });

  const restrictionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("admin_set_restriction", {
        _target: id,
        _is_restricted: restricted,
        _message: restrictMessage || null,
        _reason: restrictReason || null,
        _start: restrictStart ? new Date(restrictStart).toISOString() : null,
        _end: restrictEnd ? new Date(restrictEnd).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal restriction saved");
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't save the restriction.")),
  });

  const detailsMutation = useMutation({
    mutationFn: async () => {
      const parsed = z
        .object({
          fullName: z.string().trim().min(2, "Enter the customer's full name").max(120),
          accountNumber: z
            .string()
            .trim()
            .regex(/^\d{6,20}$/, "Account number must be 6–20 digits"),
        })
        .safeParse({ fullName: details.fullName, accountNumber: details.accountNumber });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      const { error } = await db.rpc("admin_update_profile", {
        _target: id,
        _full_name: parsed.data.fullName,
        _phone: details.phone,
        _account_number: parsed.data.accountNumber,
        _created_at: details.memberSince ? new Date(details.memberSince).toISOString() : null,
        _reason: "Account details updated",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account details saved");
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't save those details.")),
  });

  const notificationMutation = useMutation({
    mutationFn: async (d: NotificationDraft) => {
      if (!d.title.trim()) throw new Error("A title is required");
      const { error } = await db.rpc("admin_upsert_notification", {
        _id: d.id,
        _target: id,
        _title: d.title,
        _message: d.message,
        _type: d.type,
        _created_at: d.created_at ? new Date(d.created_at).toISOString() : null,
        _read: d.read,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification saved");
      setDraft(null);
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't save that notification.")),
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await db.rpc("admin_delete_notification", { _id: notificationId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification deleted");
      setDraft(null);
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't delete that notification.")),
  });


  if (detail.isLoading) {
    return (
      <AdminShell title="Customer">
        <LoadingBlock label="Loading customer" />
      </AdminShell>
    );
  }

  if (!p) {
    return (
      <AdminShell title="Customer">
        <EmptyState title="Customer not found" description="This account no longer exists." />
      </AdminShell>
    );
  }

  const available = detail.data!.total - detail.data!.locked;

  return (
    <AdminShell title={p.full_name} subtitle={`${p.email} · ${p.account_number}`}>
      <Link
        to="/admin/users"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <AdminRoleCard userId={id} />
          <section className="surface-card p-6">
            <div className="flex items-center gap-4">
              <ProfileAvatar path={p.avatar_url} name={p.full_name} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{p.full_name}</h2>
                <p className="truncate text-sm text-muted-foreground">{p.phone ?? "No phone on file"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={p.status} />
                  {detail.data?.restriction?.is_restricted ? (
                    <StatusBadge status="restricted" label="Withdrawals blocked" />
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["Total", detail.data!.total],
                ["Available", available],
                ["Locked", detail.data!.locked],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-border bg-elevated px-3 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="numeric mt-1 truncate text-sm font-bold">{money(Number(value))}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Member since {formatDate(p.created_at)}
            </p>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-base font-bold">Account details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit the customer's identity fields and the "Member since" date shown on their profile.
            </p>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="d-name">Full name</Label>
                <Input
                  id="d-name"
                  value={details.fullName}
                  onChange={(e) => setDetails((d) => ({ ...d, fullName: e.target.value }))}
                  className="h-11 bg-background/60"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="d-phone">Phone</Label>
                  <Input
                    id="d-phone"
                    value={details.phone}
                    onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
                    className="h-11 bg-background/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d-account">Account number</Label>
                  <Input
                    id="d-account"
                    inputMode="numeric"
                    value={details.accountNumber}
                    onChange={(e) => setDetails((d) => ({ ...d, accountNumber: e.target.value }))}
                    className="numeric h-11 bg-background/60"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-member">Member since</Label>
                <Input
                  id="d-member"
                  type="datetime-local"
                  value={details.memberSince}
                  onChange={(e) => setDetails((d) => ({ ...d, memberSince: e.target.value }))}
                  className="h-11 bg-background/60"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email is managed by the customer and can't be changed here.
              </p>
              <Button
                variant="outline"
                onClick={() => detailsMutation.mutate()}
                disabled={detailsMutation.isPending}
                className="h-11 w-full"
              >
                {detailsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save account details"}
              </Button>
            </div>
          </section>



          <section className="surface-card p-6">
            <h2 className="text-base font-bold">Adjust balance</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Credits and debits are written to the customer ledger and audit log.
            </p>
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adj-amount">Amount</Label>
                  <Input
                    id="adj-amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={adjust.amount}
                    onChange={(e) => setAdjust((a) => ({ ...a, amount: e.target.value }))}
                    className="numeric h-11 bg-background/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adj-direction">Direction</Label>
                  <Select
                    value={adjust.direction}
                    onValueChange={(v) => setAdjust((a) => ({ ...a, direction: v }))}
                  >
                    <SelectTrigger id="adj-direction" className="h-11 bg-background/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit (add funds)</SelectItem>
                      <SelectItem value="debit">Debit (remove funds)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adj-reason">Reason</Label>
                <Textarea
                  id="adj-reason"
                  rows={2}
                  placeholder="Deposit confirmation, correction, etc."
                  value={adjust.reason}
                  onChange={(e) => setAdjust((a) => ({ ...a, reason: e.target.value }))}
                  className="resize-none bg-background/60"
                />
              </div>
              <Button
                onClick={() => adjustMutation.mutate()}
                disabled={adjustMutation.isPending}
                className="h-11 w-full"
              >
                {adjustMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply adjustment"}
              </Button>
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-base font-bold">Account status</h2>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
                  <SelectTrigger id="status" className="h-11 bg-background/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-message">Message shown to customer</Label>
                <Textarea
                  id="status-message"
                  rows={2}
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  className="resize-none bg-background/60"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                className="h-11 w-full"
              >
                {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save status"}
              </Button>
            </div>
          </section>

          <section className="surface-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold">Withdrawal restriction</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Block new withdrawal requests and explain why.
                </p>
              </div>
              <Switch checked={restricted} onCheckedChange={setRestricted} aria-label="Restrict withdrawals" />
            </div>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restrict-message">Customer-facing message</Label>
                <Textarea
                  id="restrict-message"
                  rows={2}
                  placeholder="Withdrawals are paused while we verify your account."
                  value={restrictMessage}
                  onChange={(e) => setRestrictMessage(e.target.value)}
                  className="resize-none bg-background/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restrict-reason">Internal reason</Label>
                <Input
                  id="restrict-reason"
                  value={restrictReason}
                  onChange={(e) => setRestrictReason(e.target.value)}
                  className="h-11 bg-background/60"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="restrict-start">Start</Label>
                  <Input
                    id="restrict-start"
                    type="datetime-local"
                    value={restrictStart}
                    onChange={(e) => setRestrictStart(e.target.value)}
                    className="h-11 bg-background/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restrict-end">End</Label>
                  <Input
                    id="restrict-end"
                    type="datetime-local"
                    value={restrictEnd}
                    onChange={(e) => setRestrictEnd(e.target.value)}
                    className="h-11 bg-background/60"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => restrictionMutation.mutate()}
                disabled={restrictionMutation.isPending}
                className="h-11 w-full"
              >
                {restrictionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save restriction"
                )}
              </Button>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="surface-card p-6">
            <h2 className="mb-4 text-base font-bold">Withdrawal requests</h2>
            {detail.data!.withdrawals.length === 0 ? (
              <EmptyState title="No requests" description="This customer hasn't requested a withdrawal." className="py-10" />
            ) : (
              <div className="space-y-2.5">
                {detail.data!.withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="numeric text-sm font-bold">{money(Number(w.amount))}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.bank_name} · {formatDate(w.requested_at)}
                      </p>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card p-6">
            <h2 className="mb-4 text-base font-bold">Recent transactions</h2>
            {detail.data!.transactions.length === 0 ? (
              <EmptyState title="No transactions" className="py-10" />
            ) : (
              <div className="space-y-2.5">
                {detail.data!.transactions.map((t) => (
                  <TransactionRow key={t.id} txn={t} />
                ))}
              </div>
            )}
          </section>

          <section className="surface-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold">Notifications</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Edit the title, message, read state and the time each alert appears to have arrived.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: null,
                    title: "",
                    message: "",
                    type: "info",
                    created_at: toDateTimeLocal(new Date().toISOString()),
                    read: false,
                  })
                }
              >
                <Plus className="h-4 w-4" /> New
              </Button>
            </div>

            {draft ? (
              <div className="mb-4 space-y-3 rounded-2xl border border-border bg-elevated p-4">
                <div className="space-y-2">
                  <Label htmlFor="n-title">Title</Label>
                  <Input
                    id="n-title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="h-11 bg-background/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="n-message">Message</Label>
                  <Textarea
                    id="n-message"
                    rows={2}
                    value={draft.message}
                    onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                    className="resize-none bg-background/60"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="n-type">Type</Label>
                    <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                      <SelectTrigger id="n-type" className="h-11 bg-background/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="n-time">Date &amp; time</Label>
                    <Input
                      id="n-time"
                      type="datetime-local"
                      value={draft.created_at}
                      onChange={(e) => setDraft({ ...draft, created_at: e.target.value })}
                      className="h-11 bg-background/60"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface/70 px-3 py-2.5">
                  <Label htmlFor="n-read" className="text-sm">
                    Marked as read
                  </Label>
                  <Switch
                    id="n-read"
                    checked={draft.read}
                    onCheckedChange={(v) => setDraft({ ...draft, read: v })}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => notificationMutation.mutate(draft)}
                    disabled={notificationMutation.isPending}
                    className="h-10"
                  >
                    {notificationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : draft.id ? (
                      "Save changes"
                    ) : (
                      "Send notification"
                    )}
                  </Button>
                  <Button variant="ghost" className="h-10" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                  {draft.id ? (
                    <Button
                      variant="ghost"
                      className="h-10 text-destructive hover:text-destructive"
                      disabled={deleteNotification.isPending}
                      onClick={() => deleteNotification.mutate(draft.id!)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {detail.data!.notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications" className="py-10" />
            ) : (
              <div className="space-y-2.5">
                {detail.data!.notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() =>
                      setDraft({
                        id: n.id,
                        title: n.title,
                        message: n.message,
                        type: n.type,
                        created_at: toDateTimeLocal(n.created_at),
                        read: n.read,
                      })
                    }
                    className="w-full rounded-2xl border border-border bg-surface/70 px-4 py-3 text-left transition-colors hover:bg-elevated"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{n.title}</p>
                      <StatusBadge status={n.read ? "completed" : "pending"} label={n.read ? "Read" : "Unread"} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

      </div>
    </AdminShell>
  );
}
