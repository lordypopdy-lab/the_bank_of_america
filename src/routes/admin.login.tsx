import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { db, friendlyError } from "@/lib/db";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin sign in — Vaultline Console" },
      { name: "description", content: "Restricted administrator sign in for the Vaultline banking operations console." },
      { property: "og:title", content: "Admin sign in — Vaultline Console" },
      { property: "og:description", content: "Restricted administrator access to Vaultline operations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setFormError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error || !data.user) {
      setLoading(false);
      setFormError(friendlyError(error, "We couldn't sign you in."));
      return;
    }

    const { data: isAdmin } = await db.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    setLoading(false);

    if (!isAdmin) {
      await supabase.auth.signOut();
      setFormError("This account does not have administrator access.");
      return;
    }

    toast.success("Welcome to the admin console");
    navigate({ to: "/admin", replace: true });
  };

  return (
    <AuthLayout
      title="Admin console"
      subtitle="Restricted access for Vaultline operations staff."
      footer={
        <Link to="/login" className="font-semibold text-primary-glow hover:underline">
          Customer sign in
        </Link>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-elevated px-4 py-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary-glow" />
        <p className="text-xs text-muted-foreground">
          All actions in this console are recorded in an immutable audit log.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="admin-email">Admin email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-background/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 bg-background/60"
          />
        </div>
        {formError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}
        <Button type="submit" disabled={loading} className="h-12 w-full text-sm font-semibold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in to console"}
        </Button>
      </form>
    </AuthLayout>
  );
}
