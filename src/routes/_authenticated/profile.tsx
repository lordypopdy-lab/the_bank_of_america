import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { KycBadge, KycSection } from "@/components/KycSection";
import { useMyKyc } from "@/hooks/useKyc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useBanking";
import { supabase } from "@/integrations/supabase/client";
import { db, friendlyError } from "@/lib/db";
import { formatDate, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vaultline Banking" },
      { name: "description", content: "Manage your Vaultline profile photo, contact details and review your account information." },
      { property: "og:title", content: "Profile — Vaultline Banking" },
      { property: "og:description", content: "Manage your Vaultline profile and account details." },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().max(24, "Phone number is too long").optional().or(z.literal("")),
});

function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const account = useAccount(profile?.id);
  const { data: kyc } = useMyKyc(profile?.id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  }, [profile?.full_name, profile?.phone]);

  const save = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const { error } = await db
        .from("profiles")
        .update({ full_name: values.full_name, phone: values.phone || null })
        .eq("id", profile?.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      await refreshProfile();
    },
    onError: (error) => toast.error(friendlyError(error, "We couldn't save your changes.")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  const upload = async (file: File) => {
    if (!profile?.id) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPG, PNG or WEBP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      toast.error(friendlyError(uploadError, "Upload failed. Please try again."));
      return;
    }
    const { error } = await db.from("profiles").update({ avatar_url: path }).eq("id", profile.id);
    setUploading(false);
    if (error) {
      toast.error(friendlyError(error, "We couldn't update your photo."));
      return;
    }
    await refreshProfile();
    void queryClient.invalidateQueries({ queryKey: ["avatar"] });
    toast.success("Profile photo updated");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <AppShell title="Profile" subtitle="Your personal and account details.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="surface-card p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <ProfileAvatar path={profile?.avatar_url} name={profile?.full_name} size="xl" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-border bg-elevated text-foreground transition-colors hover:bg-surface"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold">{profile?.full_name}</h2>
              <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={profile?.status ?? "active"} />
                <KycBadge status={kyc?.status ?? "not_verified"} />
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="h-12 bg-background/60"
              />
              {errors["full_name"] ? (
                <p className="text-xs text-destructive">{errors["full_name"]}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="h-12 bg-background/60"
              />
              {errors["phone"] ? <p className="text-xs text-destructive">{errors["phone"]}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-readonly">Email address</Label>
              <Input
                id="email-readonly"
                value={user?.email ?? ""}
                readOnly
                disabled
                className="h-12 bg-background/40"
              />
            </div>
            <Button type="submit" disabled={save.isPending} className="h-12 w-full text-sm font-semibold">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="text-base font-bold">Account details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Account number", profile?.account_number ?? "—"],
                ["Currency", account.data?.account?.currency ?? "USD"],
                ["Total balance", money(account.data?.total ?? 0)],
                ["Available balance", money(account.data?.available ?? 0)],
                ["Locked balance", money(account.data?.locked ?? 0)],
                ["Member since", formatDate(profile?.created_at)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="numeric truncate font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {profile?.status_message ? (
            <section className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
              <p className="text-sm font-semibold text-warning">Notice from your bank</p>
              <p className="mt-1 text-sm text-muted-foreground">{profile.status_message}</p>
            </section>
          ) : null}

          <KycSection />

          <section className="surface-card p-6">
            <h2 className="text-base font-bold">Session</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign out on this device. You'll need your password to sign back in.
            </p>
            <Button variant="outline" onClick={handleSignOut} className="mt-4 h-11">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
