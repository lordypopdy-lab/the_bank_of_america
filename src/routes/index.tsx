import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, ShieldCheck, Wallet } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vaultline — Modern Digital Banking Platform" },
      {
        name: "description",
        content:
          "Vaultline is a premium digital banking experience with real-time balances, secure withdrawal requests, time-locked savings and full administrative controls.",
      },
      { property: "og:title", content: "Vaultline — Modern Digital Banking Platform" },
      {
        property: "og:description",
        content:
          "Vaultline is a premium digital banking experience with real-time balances, secure withdrawal requests, time-locked savings and full administrative controls.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Wallet,
    title: "Clear balance intelligence",
    body: "Total, available, locked and pending balances always reconcile — no misleading numbers.",
  },
  {
    icon: Lock,
    title: "Time-locked funds",
    body: "Move part of your available balance into a locked pot until a date you choose.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-grade controls",
    body: "Every balance movement is written to an immutable ledger with a full audit trail.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Open account</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              A financial platform — where your funds are managed securely.
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Banking that shows you <span className="text-gradient">exactly</span> where your money
              stands.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Vaultline gives every account a transparent ledger, controlled withdrawal requests and
              time-locked savings — backed by a real database and real authentication.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6">
                <Link to="/signup">
                  Create your account <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="balance-gradient rounded-3xl border border-white/10 p-7 shadow-[var(--shadow-float)]">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-foreground/70">
                Total balance
              </p>
              <p className="numeric mt-2 text-4xl font-extrabold text-primary-foreground sm:text-5xl">
                $23,970.30
              </p>
              <div className="mt-7 grid grid-cols-3 gap-3">
                {[
                  ["Available", "$18,491.03"],
                  ["Locked", "$4,235.25"],
                  ["Pending", "$1,244.02"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-black/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">
                      {label}
                    </p>
                    <p className="numeric mt-1 text-sm font-bold text-primary-foreground">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-card mt-4 space-y-3 p-5">
              {[
                ["Salary credit", "+ $4,500.00"],
                ["Withdrawal request", "− $1,244.02"],
                ["Funds locked", "− $2,000.00"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="numeric font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="surface-card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-elevated">
                <f.icon className="h-5 w-5 text-primary-glow" />
              </span>
              <h2 className="mt-4 text-base font-bold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Vaultline is a modern investment platform designed to provide individuals with simple,
        secure, and accessible tools for managing and growing their investments. Our platform brings
        investment opportunities, portfolio management, and financial insights together in one
        seamless digital experience. Built with security, transparency, and reliability in mind,
        Vaultline is designed to help investors make informed decisions and manage their financial
        goals with confidence.
      </footer>
    </div>
  );
}
