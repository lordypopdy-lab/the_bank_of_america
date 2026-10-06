import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert, Wallet } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, SkeletonRows } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { restrictionActive, useAccount, useRestriction, useWithdrawals } from "@/hooks/useBanking";
import { db, friendlyError } from "@/lib/db";
import { formatDate, formatDateTime, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw funds — Vaultline Banking" },
      { name: "description", content: "Request a withdrawal from your available Vaultline balance and track its progress." },
      { property: "og:title", content: "Withdraw funds — Vaultline Banking" },
      { property: "og:description", content: "Request and track withdrawals from your Vaultline account." },
    ],
  }),
  component: WithdrawPage,
});

const schema = z.object({
  amount: z.number().positive("Enter an amount greater than zero").max(10_000_000, "Amount is too large"),
  bank_name: z.string().trim().min(2, "Bank name is required").max(80),
  account_name: z.string().trim().min(2, "Account holder name is required").max(80),
  account_number: z
    .string()
    .trim()
    .min(4, "Enter a valid account number")
    .max(34, "Account number is too long")
    .regex(/^[A-Za-z0-9 -]+$/, "Only letters, numbers, spaces and dashes"),
  note: z.string().trim().max(240, "Note is too long").optional().or(z.literal("")),
});

function WithdrawPage() {
  const { profile } = useAuth();
  const uid = profile?.id;
  const queryClient = useQueryClient();
  const account = useAccount(uid);
  const withdrawals = useWithdrawals(uid);
  const restriction = useRestriction(uid);

  const [form, setForm] = useState({
    amount: "",
    bank_name: "",
    account_name: profile?.full_name ?? "",
    account_number: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const available = account.data?.available ?? 0;
  const blocked = restrictionActive(restriction.data) || profile?.status === "suspended";

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const { error } = await db.rpc("request_withdrawal", {
        _amount: values.amount,
        _bank_name: values.bank_name,
        _account_name: values.account_name,
        _account_number: values.account_number,
        _note: values.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal request submitted");
      setForm((f) => ({ ...f, amount: "", note: "" }));
      void queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => toast.error(friendlyError(error, "We couldn't submit your request.")),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    const parsed = schema.safeParse({ ...form, amount: Number(form.amount) });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
      setErrors(next);
      return;
    }
    if (parsed.data.amount > available) {
      setErrors({ amount: `You can withdraw up to ${money(available)} right now` });
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <AppShell title="Withdraw funds" subtitle="Send money from your available balance to a bank account.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface-card p-6">
          <div className="mb-6 rounded-2xl border border-border bg-elevated px-4 py-3">
            <p className="text-xs text-muted-foreground">Available to withdraw</p>
            <p className="numeric mt-1 text-2xl font-extrabold text-success">{money(available)}</p>
          </div>

          {blocked ? (
            <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-semibold text-warning">Withdrawals unavailable</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {restriction.data?.message ??
                      profile?.status_message ??
                      "Your account is currently under review. Please contact support."}
                  </p>
                  {restriction.data?.end_date ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Expected to lift on {formatDate(restriction.data.end_date)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={set("amount")}
                    className="numeric h-12 bg-background/60 pl-8 text-lg font-semibold"
                  />
                </div>
                <div className="flex gap-2">
                  {[0.25, 0.5, 1].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, amount: (available * pct).toFixed(2) }))}
                      className="rounded-lg border border-border bg-elevated px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {pct === 1 ? "Max" : `${pct * 100}%`}
                    </button>
                  ))}
                </div>
                {errors["amount"] ? <p className="text-xs text-destructive">{errors["amount"]}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank name</Label>
                <Input
                  id="bank_name"
                  placeholder="Chase Bank"
                  value={form.bank_name}
                  onChange={set("bank_name")}
                  className="h-12 bg-background/60"
                />
                {errors["bank_name"] ? (
                  <p className="text-xs text-destructive">{errors["bank_name"]}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_name">Account holder name</Label>
                <Input
                  id="account_name"
                  placeholder="Alexandra Reed"
                  value={form.account_name}
                  onChange={set("account_name")}
                  className="h-12 bg-background/60"
                />
                {errors["account_name"] ? (
                  <p className="text-xs text-destructive">{errors["account_name"]}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account number</Label>
                <Input
                  id="account_number"
                  placeholder="0123456789"
                  value={form.account_number}
                  onChange={set("account_number")}
                  className="numeric h-12 bg-background/60"
                />
                {errors["account_number"] ? (
                  <p className="text-xs text-destructive">{errors["account_number"]}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  rows={3}
                  placeholder="What is this withdrawal for?"
                  value={form.note}
                  onChange={set("note")}
                  className="resize-none bg-background/60"
                />
                {errors["note"] ? <p className="text-xs text-destructive">{errors["note"]}</p> : null}
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="h-12 w-full text-sm font-semibold"
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Requests are reviewed before funds are released. The requested amount is held as
                pending until processed.
              </p>
            </form>
          )}
        </section>

        <section className="surface-card p-6">
          <h2 className="mb-4 text-base font-bold">Your requests</h2>
          {withdrawals.isLoading ? (
            <SkeletonRows rows={3} />
          ) : (withdrawals.data ?? []).length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No withdrawal requests"
              description="Requests you submit will be listed here with live status updates."
            />
          ) : (
            <div className="space-y-3">
              {(withdrawals.data ?? []).map((w) => (
                <article key={w.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="numeric text-lg font-bold">{money(Number(w.amount))}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.bank_name} · {w.account_number}
                      </p>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Requested</dt>
                      <dd className="mt-0.5 font-medium">{formatDateTime(w.requested_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Processing date</dt>
                      <dd className="mt-0.5 font-medium">{formatDate(w.processing_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Expected completion</dt>
                      <dd className="mt-0.5 font-medium">{formatDate(w.expected_completion_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Reference</dt>
                      <dd className="mt-0.5 font-medium">{w.reference}</dd>
                    </div>
                  </dl>

                  {w.status === "rejected" && w.rejection_reason ? (
                    <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {w.rejection_reason}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
