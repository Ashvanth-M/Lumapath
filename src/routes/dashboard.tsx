import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarCheck,
  FileText,
  Gauge,
  Sparkles,
  Timer,
  TrendingUp,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/common/RiskBadge";
import { ScoreRing } from "@/components/common/ScoreRing";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AGE_BANDS } from "@/constants";
import { getNotifications, listAssessments } from "@/services/assessment.service";
import { DEMO_CHILD } from "@/services/mockData";
import { useAppStore } from "@/store/useAppStore";
import { formatAge, formatDate, formatLatency } from "@/utils/age";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Parent dashboard — LumaPath AI" },
      { name: "description", content: "Track today's screening, progress and AI insights for your child." },
      { property: "og:title", content: "Parent dashboard — LumaPath AI" },
      { property: "og:description", content: "Track screenings, progress and AI insights for your child." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const parent = useAppStore((s) => s.parent);
  const child = useAppStore((s) => s.child) ?? DEMO_CHILD;
  const { data: history, isLoading } = useQuery({ queryKey: ["assessments"], queryFn: listAssessments });
  const { data: notifications } = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const latest = history?.[0];
  const band = AGE_BANDS.find((b) => b.id === child.ageBandId)!;
  const firstName = parent?.fullName?.split(" ")[0] ?? "there";

  return (
    <AppShell>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-aurora p-7 text-white shadow-lift sm:p-9"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/15 opacity-70" />
        <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/80">Good morning, {firstName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {child.name} is {formatAge(child.birthDate)} old
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85">
              Today's recommended screening is the {band.label} communication set — about{" "}
              {band.durationMinutes} minutes across {band.activityCount} guided activities.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="rounded-xl">
                <Link to="/screening">
                  <Video className="h-4 w-4" /> New behaviour screening
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="rounded-xl text-white hover:bg-white/15 hover:text-white"
              >
                <Link to="/progress">View progress</Link>
              </Button>
            </div>
          </div>
          {latest && (
            <div className="flex items-center gap-5 rounded-2xl bg-white/12 p-5 ">
              <ScoreRing value={latest.overallScore} size={104} label="Overall" className="text-white [&_.stroke-secondary]:stroke-white/25" />
              <div className="text-sm">
                <p className="font-medium">Level {latest.matrixLevel}</p>
                <p className="text-white/75">{latest.matrixLevelName}</p>
                <p className="mt-2 text-white/75">Last: {formatDate(latest.completedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !latest ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={Gauge} label="Communication score" value={`${latest.overallScore}/100`} hint="+7 vs last month" />
            <StatCard icon={Timer} label="Response latency" value={formatLatency(latest.responseLatencyMs)} hint="Target under 1.20 s" tone="warning" />
            <StatCard icon={Activity} label="Matrix level" value={`Level ${latest.matrixLevel}`} hint={latest.matrixLevelName} tone="accent" />
            <StatCard icon={TrendingUp} label="Sessions completed" value={`${history?.length ?? 0}`} hint="Since May 2026" tone="success" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/70 p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Assessment history</h2>
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link to="/progress">See all</Link>
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-3 h-14 rounded-xl" />)
              : history?.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {AGE_BANDS.find((b) => b.id === r.ageBandId)?.label} screening
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.completedAt)} · Level {r.matrixLevel} · {formatLatency(r.responseLatencyMs)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <RiskBadge level={r.riskLevel} />
                      <Button asChild size="sm" variant="outline" className="rounded-lg">
                        <Link to="/results/$resultId" params={{ resultId: r.id }}>
                          Open
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/70 p-6 shadow-soft">
            <h2 className="text-base font-semibold">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              <QuickAction to="/screening" icon={Video} label="New behaviour screening" />
              <QuickAction to="/assessments" icon={CalendarCheck} label="Other assessment modes" />
              <QuickAction to="/recommendations" icon={Sparkles} label="Today's activities" />
              <QuickAction to="/report/r_003" icon={FileText} label="Clinician report" />
            </div>
          </Card>

          <Card id="notifications" className="scroll-mt-24 rounded-2xl border-border/70 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Notifications</h2>
            </div>
            <ul className="mt-4 space-y-4">
              {notifications?.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-border" : "bg-primary"}`} />
                  <div>
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                    <Badge variant="secondary" className="mt-2 rounded-full text-[10px] font-medium">
                      {n.time}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Bell;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border/70 bg-gradient-surface px-4 py-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      {label}
      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
    </Link>
  );
}