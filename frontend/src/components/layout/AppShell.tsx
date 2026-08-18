import { Link, useRouterState } from "@tanstack/react-router";
import {
  Baby,
  Bell,
  BrainCircuit,
  Home,
  LineChart,
  ListChecks,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Orbit,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/brand/Logo";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getNotifications } from "@/services/assessment.service";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/screening", label: "Screening", icon: Video },
  { to: "/lumatwin", label: "LumaTwin", icon: Orbit },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/assistant", label: "Assistant", icon: MessageCircle },
] as const;

const MORE_NAV = [
  { to: "/assessments", label: "Other assessments", icon: ListChecks },
  { to: "/prediction", label: "AI Prediction", icon: BrainCircuit },
  { to: "/community", label: "Community", icon: Users },
  { to: "/clinician", label: "Clinician", icon: Stethoscope },
  { to: "/child", label: "Child profile", icon: Baby },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  // Same query key as the dashboard, so React Query serves both from one fetch.
  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getNotifications(user?.id ?? ""),
    enabled: !!user?.id,
  });
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_NAV.some((i) => i.to === pathname);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-panel border-b border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/dashboard" aria-label="LumaPath AI home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[...NAV, ...MORE_NAV].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.to
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" asChild>
              <Link to="/dashboard" hash="notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              asChild
              onClick={() => void signOut()}
            >
              <Link to="/login">
                <LogOut className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-16">
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
            AI-assisted Screening Tool. Not intended to replace clinical diagnosis.
          </p>
        </div>
        {title && (
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        <ErrorBoundary area={title ?? "This page"}>{children}</ErrorBoundary>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 glass-panel border-b-0 border-x-0 pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto flex max-w-md items-stretch justify-between px-1 py-2">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                      active && "bg-secondary",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                    moreActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                      moreActive && "bg-secondary",
                    )}
                  >
                    <MoreHorizontal className="h-[18px] w-[18px]" />
                  </span>
                  More
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <SheetHeader className="text-left">
                  <SheetTitle>All sections</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-2 px-4">
                  {[...NAV, ...MORE_NAV].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border border-border/70 p-3.5 text-sm font-medium transition-colors",
                          pathname === item.to ? "bg-secondary text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 truncate">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>
    </div>
  );
}