import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, MoreVertical, Send, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { useSupportMessages } from "@/hooks/useSupport";
import { db, friendlyError } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Shared chat thread. `viewer` decides which side is "me" and which RPC sends. */
export function SupportThread({
  conversationId,
  viewer,
  otherName,
  onSent,
}: {
  conversationId: string | null;
  viewer: "user" | "admin";
  otherName?: string | undefined;
  onSent?: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useSupportMessages(conversationId);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const unreadIds = (data ?? []).filter((m) => m.sender_role !== viewer && !m.read_at).map((m) => m.id).join(",");
  useEffect(() => {
    if (!conversationId || !unreadIds) return;
    void db.rpc("mark_support_read", { _conversation: conversationId }).then(({ error }: { error: unknown }) => {
      if (error) return;
      void qc.invalidateQueries({ queryKey: ["support"] });
      if (viewer === "user") void qc.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [conversationId, unreadIds, viewer, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data?.length]);

  const send = useMutation({
    mutationFn: async (message: string) => {
      const { error } =
        viewer === "admin"
          ? await db.rpc("admin_reply_support", { _conversation: conversationId, _message: message })
          : await db.rpc("send_support_message", { _message: message });
      if (error) throw error;
    },
    onSuccess: async () => {
      setText("");
      await qc.invalidateQueries({ queryKey: ["support"] });
      onSent?.();
    },
    onError: (e) => toast.error(friendlyError(e, "Message could not be sent.")),
  });

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("delete_support_message", { _id: id });
      if (error) throw error;
    },
    onSuccess: async () => {
      setPendingDelete(null);
      toast.success("Message deleted");
      await qc.invalidateQueries({ queryKey: ["support"] });
    },
    onError: (e) => toast.error(friendlyError(e, "Message could not be deleted.")),
  });

  const submit = () => {
    const v = text.trim();
    if (!v) { toast.error("Type a message first"); return; }
    if (v.length > 2000) { toast.error("Message is too long (max 2000 characters)"); return; }
    send.mutate(v);
  };

  return (
    <div className="flex h-[65vh] min-h-[420px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {!conversationId ? (
          <EmptyState icon={MessageCircle} title="Start a conversation" description="Send us a message and our team will reply here." />
        ) : isLoading ? (
          <SkeletonRows rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={MessageCircle} title="No messages yet" description="Messages will appear here." />
        ) : (
          data!.map((m) => {
            const mine = m.sender_role === viewer;
            const sender = mine ? "You" : m.sender_role === "admin" ? "Support team" : otherName || "Customer";
            const canDelete = viewer === "admin" || mine;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    mine ? "bg-primary text-primary-foreground" : "border border-border bg-elevated text-foreground",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-[11px] font-semibold", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {sender}
                    </p>
                    {canDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label="Message options"
                          className={cn("-mr-1 rounded p-0.5 opacity-70 hover:opacity-100", mine ? "text-primary-foreground" : "text-muted-foreground")}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onSelect={() => setPendingDelete(m.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{m.message}</p>
                  <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatDateTime(m.created_at)}
                    {mine && m.read_at ? " · Read" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-border p-3 sm:p-4">
        <Textarea
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type your message…"
          disabled={viewer === "admin" && !conversationId}
          className="min-h-[48px] resize-none bg-background/60"
          rows={1}
        />
        <Button
          onClick={submit}
          disabled={send.isPending || !text.trim() || (viewer === "admin" && !conversationId)}
          className="h-12 w-12 shrink-0"
          size="icon"
          aria-label="Send message"
        >
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>The message will be removed from the conversation.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={() => pendingDelete && del.mutate(pendingDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
