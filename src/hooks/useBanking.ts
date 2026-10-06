import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import type {
  Account,
  AdminActivity,
  AdminOverview,
  AdminUserRow,
  AppNotification,
  FundLock,
  Profile,
  Transaction,
  Withdrawal,
  WithdrawalRestriction,
} from "@/lib/types";

const ACTIVE_WITHDRAWAL_STATES = ["pending", "under_review", "approved", "processing"];

export interface AccountSnapshot {
  account: Account | null;
  pending: number;
  locked: number;
  total: number;
  available: number;
}

export function useAccount(userId?: string) {
  return useQuery({
    queryKey: ["account", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AccountSnapshot> => {
      await db.rpc("release_due_fund_locks", { _user_id: userId });
      const [{ data: account }, { data: withdrawals }] = await Promise.all([
        db.from("accounts").select("*").eq("user_id", userId).maybeSingle(),
        db.from("withdrawals").select("amount,status").eq("user_id", userId),
      ]);
      const acct = (account as Account) ?? null;
      const pending = ((withdrawals ?? []) as Withdrawal[])
        .filter((w) => ACTIVE_WITHDRAWAL_STATES.includes(w.status))
        .reduce((sum, w) => sum + Number(w.amount), 0);
      const total = Number(acct?.total_balance ?? 0);
      const locked = Number(acct?.locked_balance ?? 0);
      return { account: acct, pending, locked, total, available: total - locked - pending };
    },
  });
}

export function useTransactions(userId?: string, limit?: number) {
  return useQuery({
    queryKey: ["transactions", userId, limit],
    enabled: !!userId,
    queryFn: async (): Promise<Transaction[]> => {
      let q = db
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}

export function useWithdrawals(userId?: string) {
  return useQuery({
    queryKey: ["withdrawals", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Withdrawal[]> => {
      const { data, error } = await db
        .from("withdrawals")
        .select("*")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });
}

export function useFundLocks(userId?: string) {
  return useQuery({
    queryKey: ["fund-locks", userId],
    enabled: !!userId,
    queryFn: async (): Promise<FundLock[]> => {
      const { data, error } = await db
        .from("fund_locks")
        .select("*")
        .eq("user_id", userId)
        .order("locked_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FundLock[];
    },
  });
}

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await db
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useRestriction(userId?: string) {
  return useQuery({
    queryKey: ["restriction", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WithdrawalRestriction | null> => {
      const { data } = await db
        .from("withdrawal_restrictions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return (data as WithdrawalRestriction) ?? null;
    },
  });
}

export function restrictionActive(r?: WithdrawalRestriction | null) {
  if (!r?.is_restricted) return false;
  const now = Date.now();
  if (r.start_date && new Date(r.start_date).getTime() > now) return false;
  if (r.end_date && new Date(r.end_date).getTime() <= now) return false;
  return true;
}

/* ---------------------------------- admin --------------------------------- */

export function useAdminOverview(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-overview"],
    enabled,
    queryFn: async (): Promise<AdminOverview> => {
      const { data, error } = await db.rpc("admin_overview");
      if (error) throw error;
      return data as AdminOverview;
    },
  });
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-users"],
    enabled,
    queryFn: async (): Promise<AdminUserRow[]> => {
      const { data, error } = await db.rpc("admin_users");
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
  });
}

export function useAdminWithdrawals(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-withdrawals"],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("withdrawals")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as Withdrawal[];
      const ids = [...new Set(list.map((w) => w.user_id))];
      const { data: profiles } = ids.length
        ? await db.from("profiles").select("*").in("id", ids)
        : { data: [] };
      const map = new Map<string, Profile>(
        ((profiles ?? []) as Profile[]).map((p) => [p.id, p]),
      );
      return list.map((w) => ({ ...w, profile: map.get(w.user_id) ?? null }));
    },
  });
}

export function useAdminActivity(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-activity"],
    enabled,
    queryFn: async (): Promise<AdminActivity[]> => {
      const { data, error } = await db
        .from("admin_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AdminActivity[];
    },
  });
}

export function useAvatarUrl(path?: string | null) {
  return useQuery({
    queryKey: ["avatar", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });
}
