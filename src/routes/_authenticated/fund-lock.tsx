import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, SkeletonRows } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useAccount, useFundLocks } from "@/hooks/useBanking";
import { db, friendlyError } from "@/lib/db";
import { formatDate, formatDateTime, money, timeRemaining } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fund-lock")({
  head: () => ({
    meta: [
      { title: "Fund lock — Vaultline Banking" },
      { name: "description", content: "Lock part of your available balance until a future date and track every active lock." },
      { property: "og:title", content: "Fund lock — Vaultline Banking" },
      { property: "og:description", content: "Time-lock your Vaultline balance until a date you choose." },
    ],
  }),
  component: FundLockPage,
});

const schema = z.object({
  amount: z.number().positive("Enter an amount greater than zero"),
  unlock_date: z
    .string()
    .min(1, "Choose an unlock date")
    .refine((v) => new Date(v).getTime() > Date.now(), "Unlock date must be in the future"),
});

function FundLockPage() {
  const { profile } = useAuth();
  const uid = profile?.id;
  const queryClient = useQueryClient();
  const account = useAccount(uid);
  const locks = useFundLocks(uid);

  const [amount, setAmount] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const available = account.data?.available ?? 0;
  const active = (locks.data ?? []).filter((l) => l.status === "active");
  const released = (locks.data ?? []).filter((l) => l.status !== "active");
  const lockedTotal = active.reduce((s, l) => s + Number(l.amount), 0);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const { error } = await db.rpc("create_fund_lock", {
        _amount: values.amount,
        _unlock_date: new Date(values.unlock_date).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Funds locked");
      setAmount("");
      setUnlockDate("");
      void queryClient.invalidateQueries({ queryKey: ["fund-locks"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => toast.error(friendlyError(error, "We couldn't lock those funds.")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;
    const parsed = schema.safeParse({ amount: Number(amount), unlock_date: unlockDate });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
      setErrors(next);
      return;
    }
    if (parsed.data.amount > available) {
      setErrors({ amount: `You can lock up to ${money(available)}` });
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <AppShell title="Fund lock" subtitle="Set money aside until a date you choose.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <section className="surface-card p-6">
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-elevated px-4 py-3">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="numeric mt-1 text-xl font-extrabold text-success">{money(available)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-elevated px-4 py-3">
              <p className="text-xs text-muted-foreground">Currently locked</p>
              <p className="numeric mt-1 text-xl font-extrabold text-primary-glow">
                {money(lockedTotal)}
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="lock-amount">Amount to lock</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="lock-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="numeric h-12 bg-background/60 pl-8 text-lg font-semibold"
                />
              </div>
              {errors["amount"] ? <p className="text-xs text-destructive">{errors["amount"]}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unlock-date">Unlock date</Label>
              <Input
                id="unlock-date"
                type="datetime-local"
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                className="h-12 bg-background/60"
              />
              {errors["unlock_date"] ? (
                <p className="text-xs text-destructive">{errors["unlock_date"]}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-12 w-full text-sm font-semibold"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lock funds"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Locked funds stay in your total balance but can't be withdrawn until the unlock date.
              They release automatically.
            </p>
          </form>
        </section>

        <section className="surface-card p-6">
          <h2 className="mb-4 text-base font-bold">Your locks</h2>
          {locks.isLoading ? (
            <SkeletonRows rows={3} />
          ) : (locks.data ?? []).length === 0 ? (
            <EmptyState
              icon={Lock}
              title="No funds locked"
              description="Create a lock to keep money out of reach until a future date."
            />
          ) : (
            <div className="space-y-3">
              {[...active, ...released].map((l) => (
                <article key={l.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="numeric text-lg font-bold">{money(Number(l.amount))}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.reference}</p>
                    </div>
                    <StatusBadge
                      status={l.status === "active" ? "active" : "released"}
                      label={l.status === "active" ? "Locked" : "Released"}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Locked on</p>
                      <p className="mt-0.5 font-medium">{formatDateTime(l.locked_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {l.status === "active" ? "Unlocks" : "Released"}
                      </p>
                      <p className="mt-0.5 font-medium">
                        {formatDate(l.status === "active" ? l.unlock_date : l.released_at)}
                      </p>
                    </div>
                  </div>
                  {l.status === "active" ? (
                    <p className="mt-3 text-xs font-medium text-primary-glow">
                      {timeRemaining(l.unlock_date)}
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
