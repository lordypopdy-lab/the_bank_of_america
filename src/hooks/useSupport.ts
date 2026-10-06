import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  message: string;
  created_at: string;
  read_at: string | null;
}

export interface SupportConversationRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  last_message_at: string;
  last_message: string | null;
  last_sender: string | null;
  unread: number;
}

const POLL = 15000;

/** Realtime subscription that refreshes all support queries; polling is the fallback. */
export function useSupportRealtime(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`support-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        void qc.invalidateQueries({ queryKey: ["support"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}

export function useMyConversation(userId?: string) {
  return useQuery({
    queryKey: ["support", "mine", userId],
    enabled: !!userId,
    refetchInterval: POLL,
    queryFn: async () => {
      const { data, error } = await db
        .from("support_conversations")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data?.id as string | undefined) ?? null;
    },
  });
}

export function useSupportMessages(conversationId?: string | null) {
  return useQuery({
    queryKey: ["support", "messages", conversationId],
    enabled: !!conversationId,
    refetchInterval: POLL,
    queryFn: async () => {
      const { data, error } = await db
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SupportMessage[];
    },
  });
}

/** Count of admin replies the user hasn't read yet. */
export function useUserSupportUnread(userId?: string) {
  const { data: cid } = useMyConversation(userId);
  return useQuery({
    queryKey: ["support", "user-unread", cid],
    enabled: !!cid,
    refetchInterval: POLL,
    queryFn: async () => {
      const { count, error } = await db
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", cid)
        .eq("sender_role", "admin")
        .is("read_at", null)
        .is("deleted_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useAdminConversations(enabled: boolean) {
  return useQuery({
    queryKey: ["support", "admin-list"],
    enabled,
    refetchInterval: POLL,
    queryFn: async () => {
      const { data, error } = await db.rpc("admin_support_conversations");
      if (error) throw error;
      return ((data ?? []) as SupportConversationRow[]).map((r) => ({ ...r, unread: Number(r.unread) }));
    },
  });
}
