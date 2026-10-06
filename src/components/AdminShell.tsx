import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeftRight,
  CandlestickChart,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  TrendingUp,
  Users,
  MessageCircle,
} from "lucide-react";
import { useAdminConversations, useSupportRealtime } from "@/hooks/useSupport";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { LoadingBlock } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowLeftRight },
  { to: "/admin/investments", label: "Investments", icon: TrendingUp },
  { to: "/admin/assets", label: "Assets & simulation", icon: CandlestickChart },
  { to: "/admin/kyc", label: "KYC review", icon: ShieldCheck },
  { to: "/admin/support", label: "Customer Support", icon: MessageCircle },
  { to: "/admin/activity", label: "Audit log", icon: Activity },
] as const;


function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  const { data: convs } = useAdminConversations(isAdmin);
  useSupportRealtime(isAdmin);
  const support = (convs ?? []).reduce((a, c) => a + c.unread, 0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_var(--color-border)]"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <item.icon className={cn("h-[18px] w-[18px]", active && "text-primary-glow")} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.to === "/admin/support" && support > 0 ? (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {support > 9 ? "9+" : support}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { profile, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (loading) return <LoadingBlock label="Checking your access" className="min-h-screen" />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="surface-card max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-border bg-elevated">
            <ShieldCheck className="h-6 w-6 text-destructive" />
          </span>
          <h1 className="mt-4 text-xl font-bold">Administrator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted. Sign in with an administrator account to continue.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild>
              <Link to="/admin/login">Admin sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to banking</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="px-1.5">
          <Logo admin />
        </div>
        <div className="mt-8 flex-1">
          <p className="px-3.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Administration
          </p>
          <NavLinks />
        </div>
        <Link
          to="/dashboard"
          className="mb-3 rounded-xl border border-border bg-elevated px-3.5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          My banking
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6">
            <div className="lg:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-5">
                  <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                  <Logo admin />
                  <div className="mt-8">
                    <NavLinks onNavigate={() => setOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {actions}
              <ProfileAvatar path={profile?.avatar_url} name={profile?.full_name} size="sm" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
