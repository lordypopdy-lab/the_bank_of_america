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
      {
        name: "description",
        content: "One-time setup to create the first Vaultline administrator.",
      },
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
    // Detect a return from the email verification link (before the auth client strips the URL).
    const href = window.location.href;
    const fromVerify = /access_token=|[?&]code=|type=signup|type=email/.test(href);
    const errDesc =
      new URLSearchParams(window.location.hash.slice(1)).get("error_description") ??
      new URLSearchParams(window.location.search).get("error_description");

    const run = async () => {
      if (errDesc)
        setMsg(`Verification link problem: ${errDesc}. Sign in below to resend or finish setup.`);
      if (fromVerify) {
        // Wait for the auth client to exchange the link for a session.
        let session = (await supabase.auth.getSession()).data.session;
        for (let i = 0; !session && i < 20; i++) {
          await new Promise((r) => setTimeout(r, 250));
          session = (await supabase.auth.getSession()).data.session;
        }
        const { data: u } = await supabase.auth.getUser();
        if (u.user?.email_confirmed_at) {
          const { data: isAdmin } = await db.rpc("has_role", {
            _user_id: u.user.id,
            _role: "admin",
          });
          if (isAdmin) {
            toast.success("Administrator account verified successfully.");
            window.location.replace("/admin");
            return;
          }
          const { error } = await db.rpc("claim_first_admin");
          if (!error) {
            toast.success("Administrator account verified successfully.");
            window.location.replace("/admin");
            return;
          }
          setMsg(friendlyError(error));
        }
      }
      const { data } = await db.rpc("admin_setup_available");
      setAvailable(Boolean(data));
      if (fromVerify && data) {
        setMode("signin");
        setMsg(
          (m) =>
            m || "Email verified. Sign in below to finish creating your administrator account.",
        );
      }
    };
    void run();
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
        options: {
          data: { full_name: parsed.data.name },
          emailRedirectTo: `${window.location.origin}/admin/setup`,
        },
      });
      if (error) {
        setLoading(false);
        return setMsg(friendlyError(error));
      }
      hasSession = Boolean(data.session);
      if (!hasSession) {
        setLoading(false);
        setMode("signin");
        return setMsg(
          `Check your email. We sent a verification link to ${parsed.data.email}. Opening it will finish creating your administrator account.`,
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
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
      <AuthLayout
        title="Setup complete"
        subtitle="An administrator already exists. Initial setup is disabled."
      >
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
        <button
          type="button"
          onClick={() => setMode(mode === "create" ? "signin" : "create")}
          className="font-semibold text-primary-glow hover:underline"
        >
          {mode === "create" ? "I already have an account" : "Create a new account"}
        </button>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary-glow" />
        <p className="text-xs text-muted-foreground">
          The account you use here becomes the first administrator.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {mode === "create" ? (
          <div className="space-y-2">
            <Label htmlFor="s-name">Full name</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-background/60"
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="s-email">Email</Label>
          <Input
            id="s-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-background/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-pass">Password</Label>
          <Input
            id="s-pass"
            type="password"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 bg-background/60"
          />
        </div>
        {msg ? (
          <div className="rounded-xl border border-border bg-elevated px-4 py-3 text-sm">{msg}</div>
        ) : null}
        <Button type="submit" disabled={loading} className="h-12 w-full text-sm font-semibold">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "create" ? (
            "Create administrator"
          ) : (
            "Sign in and finish setup"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
