import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/common/StatCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMilestones, getProgressSeries } from "@/services/assessment.service";

const OverallTrendChart = lazy(() =>
  import("@/components/charts/ProgressCharts").then((m) => ({ default: m.OverallTrendChart })),
);
const DomainBreakdownChart = lazy(() =>
  import("@/components/charts/ProgressCharts").then((m) => ({ default: m.DomainBreakdownChart })),
);

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress dashboard — LumaPath AI" },
      { name: "description", content: "Track communication growth month over month across every domain." },
      { property: "og:title", content: "Progress dashboard — LumaPath AI" },
      { property: "og:description", content: "Track communication growth month over month." },
    ],
  }),
  component: ProgressPage,
});

function ChartFallback() {
  return <Skeleton className="h-full w-full rounded-2xl" />;
}

function ProgressPage() {
  const { data: series } = useQuery({ queryKey: ["progress"], queryFn: getProgressSeries });
  const { data: milestones } = useQuery({ queryKey: ["milestones"], queryFn: getMilestones });

  const first = series?.[0];
  const last = series?.[series.length - 1];

  return (
    <AppShell title="Progress" subtitle="Six months of screening data, normalised to age expectations.">
      {!series ? (
        <Skeleton className="h-80 rounded-3xl" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Overall score" value={`${last!.overall}`} hint={`+${last!.overall - first!.overall} since Feb`} icon={TrendingUp} />
            <StatCard label="Speech" value={`${last!.speech}`} hint={`+${last!.speech - first!.speech}`} icon={TrendingUp} />
            <StatCard label="Gesture" value={`${last!.gesture}`} hint={`+${last!.gesture - first!.gesture}`} icon={TrendingUp} />
          </div>

          <div>
            <Card className="mt-6 gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
              <h2 className="text-base font-semibold">Overall communication trend</h2>
              <div className="mt-4 h-72">
                <ClientOnly fallback={<ChartFallback />}>
                  <Suspense fallback={<ChartFallback />}>
                    <OverallTrendChart data={series} />
                  </Suspense>
                </ClientOnly>
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft lg:col-span-2">
              <h2 className="text-base font-semibold">Domain breakdown</h2>
              <div className="mt-4 h-72">
                <ClientOnly fallback={<ChartFallback />}>
                  <Suspense fallback={<ChartFallback />}>
                    <DomainBreakdownChart data={series} />
                  </Suspense>
                </ClientOnly>
              </div>
            </Card>

            <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
              <h2 className="text-base font-semibold">Milestone timeline</h2>
              <ol className="mt-5 space-y-5">
                {milestones?.map((m) => (
                  <li key={m.id} className="flex gap-3">
                    {m.achieved ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.date}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}