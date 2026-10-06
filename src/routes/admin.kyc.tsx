import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/States";
import { KycBadge } from "@/components/KycSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { KYC_ID_TYPES, useAdminKyc, useKycFileUrl, type AdminKycRow } from "@/hooks/useKyc";
import { db, friendlyError } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/kyc")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "KYC review — Vaultline Console" },
      { name: "description", content: "Review, approve or decline customer identity verification submissions." },
      { property: "og:title", content: "KYC review — Vaultline Console" },
      { property: "og:description", content: "Vaultline identity verification queue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminKycPage,
});

function FilePreview({ path, label }: { path: string; label: string }) {
  const { data: url } = useKycFileUrl(path);
  const isPdf = path.toLowerCase().endsWith(".pdf");
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      {!url ? (
        <div className="h-40 rounded-xl border border-border bg-surface/60" />
      ) : isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-40 items-center justify-center rounded-xl border border-border bg-surface/60 text-sm text-primary-glow"
        >
          Open PDF document
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="h-40 w-full rounded-xl border border-border object-cover" />
        </a>
      )}
    </div>
  );
}

function Submission({ row }: { row: AdminKycRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
    void queryClient.invalidateQueries({ queryKey: ["kyc"] });
  };

  const review = useMutation({
    mutationFn: async (status: "verified" | "declined") => {
      const { error } = await db.rpc("admin_review_kyc", {
        _id: row.id,
        _status: status,
        _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("KYC updated");
      setReason("");
      await invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't update this submission.")),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("admin_delete_kyc", { _id: row.id, _reason: reason || null });
      if (error) throw error;
      await Promise.all([
        db.storage.from("kyc").remove([row.document_path, row.selfie_path]),
      ]);
    },
    onSuccess: async () => {
      toast.success("Submission deleted");
      await invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "We couldn't delete this submission.")),
  });

  return (
    <article className="rounded-2xl border border-border bg-surface/70 p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{row.full_name || row.email || "Customer"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.country} · {KYC_ID_TYPES.find((t) => t.value === row.id_type)?.label ?? row.id_type} ·{" "}
            {formatDateTime(row.submitted_at)}
          </p>
        </div>
        <KycBadge status={row.status} />
      </button>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FilePreview path={row.document_path} label="ID document" />
            <FilePreview path={row.selfie_path} label="Face capture" />
          </div>
          <div className="text-xs text-muted-foreground">
            {row.email ? <p>Email: {row.email}</p> : null}
            {row.account_number ? <p>Account: {row.account_number}</p> : null}
            {row.reviewed_at ? (
              <p>
                Reviewed {formatDateTime(row.reviewed_at)} by {row.reviewer_email ?? "administrator"}
              </p>
            ) : null}
            {row.rejection_reason ? <p>Reason: {row.rejection_reason}</p> : null}
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required to decline)"
            className="bg-background/60"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => review.mutate("verified")}
              disabled={review.isPending || row.status === "verified"}
              className="h-10"
            >
              {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => review.mutate("declined")}
              disabled={review.isPending}
              className="h-10"
            >
              Decline
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm("Delete this KYC submission and its files? This cannot be undone.")) {
                  remove.mutate();
                }
              }}
              disabled={remove.isPending}
              className="h-10"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function AdminKycPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminKyc(isAdmin);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((r) =>
      [r.full_name, r.email, r.account_number, r.country, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data, q]);

  return (
    <AdminShell title="KYC review" subtitle="Identity verification submissions.">
      <div className="surface-card p-5 sm:p-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, account or status"
          className="mb-4 h-11 bg-background/60"
        />
        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No submissions" description="KYC applications will appear here." />
        ) : (
          <div className="space-y-2.5">
            {rows.map((row) => (
              <Submission key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
