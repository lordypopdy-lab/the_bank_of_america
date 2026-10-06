import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Receipt,
  UserRound,
  Wallet,
  PieChart,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import { useUserSupportUnread } from "@/hooks/useSupport";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useBanking";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/investments", label: "Investments", icon: TrendingUp },
  { to: "/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/withdraw", label: "Withdraw", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/fund-lock", label: "Fund Lock", icon: Lock },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/support", label: "Customer Support", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

const mobileNav = ["/dashboard", "/investments", "/portfolio", "/transactions", "/profile"] as string[];


function NavLinks({ onNavigate, unread, support = 0 }: { onNavigate?: () => void; unread: number; support?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors duration-200",
              active
                ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_var(--color-border)]"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <item.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary-glow")} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.to === "/notifications" && unread > 0 ? (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
            {item.to === "/support" && support > 0 ? (
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

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { profile, signOut, isAdmin } = useAuth();
  const { data: notifications } = useNotifications(profile?.id);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = (notifications ?? []).filter((n) => !n.read).length;
  const { data: support = 0 } = useUserSupportUnread(profile?.id);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="px-1.5">
          <Logo />
        </div>
        <div className="mt-8 flex-1">
          <p className="px-3.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Banking
          </p>
          <NavLinks unread={unread} support={support} />
        </div>
        {isAdmin ? (
          <Link
            to="/admin"
            className="mb-3 rounded-xl border border-border bg-elevated px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex items-center gap-3">
              <CreditCard className="h-[18px] w-[18px]" /> Admin console
            </span>
          </Link>
        ) : null}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-5">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <Logo />
                  <div className="mt-8">
                    <NavLinks unread={unread} support={support} onNavigate={() => setOpen(false)} />
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="mt-6 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-[18px] w-[18px]" /> Sign out
                  </button>
                </SheetContent>
              </Sheet>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/notifications"
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface transition-colors hover:bg-elevated"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {unread > 0 ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-glow" />
                ) : null}
              </Link>
              <Link to="/profile" aria-label="Profile">
                <ProfileAvatar path={profile?.avatar_url} name={profile?.full_name} size="sm" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {nav
            .filter((n) => mobileNav.includes(n.to))
            .map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                    active ? "text-primary-glow" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
        </div>
      </nav>
    </div>
  );
}
