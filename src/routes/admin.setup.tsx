import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { db, friendlyError } from "@/lib/db";
import { AuthLayout } from "@/components/AuthLayout";
import { LoadingBlock } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/setup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "First administrator setup — Vaultline Console" },
      { name: "description", content: "One-time setup to create the first Vaultline administrator." },
      { property: "og:title", content: "First administrator setup — Vaultline Console" },
      { property: "og:description", content: "One-time Vaultline administrator onboarding." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSetupPage,
});

const schema = z.object({
  name: z.string().trim().max(100),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function AdminSetupPage() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    db.rpc("admin_setup_available").then(({ data }: { data: boolean | null }) => setAvailable(Boolean(data)));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) return setMsg(parsed.error.issues[0]?.message ?? "Check your details");
    setMsg("");
    setLoading(true);
    let hasSession = false;
    if (mode === "create") {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { data: { full_name: parsed.data.name }, emailRedirectTo: `${window.location.origin}/admin/setup` },
      });
      if (error) {
        setLoading(false);
        return setMsg(friendlyError(error));
      }
      hasSession = Boolean(data.session);
      if (!hasSession) {
        setLoading(false);
        setMode("signin");
        return setMsg("Check your email to confirm the account, then sign in here to finish setup.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (error) {
        setLoading(false);
        return setMsg(friendlyError(error, "We couldn't sign you in."));
      }
    }
    const { error } = await db.rpc("claim_first_admin");
    setLoading(false);
    if (error) {
      setAvailable(false);
      return setMsg(friendlyError(error));
    }
    toast.success("Administrator account created");
    window.location.assign("/admin");
    void navigate;
  };

  if (available === null) return <LoadingBlock label="Checking setup" className="min-h-screen" />;

  if (!available) {
    return (
      <AuthLayout title="Setup complete" subtitle="An administrator already exists. Initial setup is disabled.">
        <Button asChild className="h-12 w-full">
          <Link to="/admin/login">Go to admin sign in</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create the first administrator"
      subtitle="One-time setup. It closes automatically once an administrator exists."
      footer={
        <button type="button" onClick={() => setMode(mode === "create" ? "signin" : "create")} className="font-semibold text-primary-glow hover:underline">
          {mode === "create" ? "I already have an account" : "Create a new account"}
        </button>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary-glow" />
        <p className="text-xs text-muted-foreground">The account you use here becomes the first administrator.</p>
      </div>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {mode === "create" ? (
          <div className="space-y-2">
            <Label htmlFor="s-name">Full name</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 bg-background/60" />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="s-email">Email</Label>
          <Input id="s-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-background/60" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-pass">Password</Label>
          <Input id="s-pass" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-background/60" />
        </div>
        {msg ? <div className="rounded-xl border border-border bg-elevated px-4 py-3 text-sm">{msg}</div> : null}
        <Button type="submit" disabled={loading} className="h-12 w-full text-sm font-semibold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? "Create administrator" : "Sign in and finish setup"}
        </Button>
      </form>
    </AuthLayout>
  );
}
