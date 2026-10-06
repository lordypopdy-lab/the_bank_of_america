import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { db, friendlyError } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminRoleCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const role = useQuery({
    queryKey: ["admin-user-role", userId],
    queryFn: async () => {
      const { data } = await db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
      return (data ?? []).length > 0;
    },
  });
  const isAdmin = Boolean(role.data);
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("admin_set_role", { _target: userId, _make_admin: !isAdmin, _reason: reason.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isAdmin ? "Administrator access removed" : "User promoted to administrator");
      setReason("");
      void qc.invalidateQueries({ queryKey: ["admin-user-role", userId] });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <section className="surface-card p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary-glow" />
        <h2 className="font-semibold">Administrator access</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {isAdmin ? "This user is an administrator." : "This user is a regular customer."} At least one active administrator must always remain.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (recorded in audit log)" className="h-11 bg-background/60" />
        <Button variant={isAdmin ? "destructive" : "default"} disabled={m.isPending || role.isLoading} onClick={() => m.mutate()} className="h-11 shrink-0">
          {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isAdmin ? "Remove admin" : "Make admin"}
        </Button>
      </div>
    </section>
  );
}
