import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Clock, Gamepad2, HeartHandshake, Lightbulb, MessageSquareText, Repeat, Target, Video } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ChildGate } from "@/components/common/ChildGate";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveChild } from "@/hooks/useActiveChild";
import {
  deriveWeeklyGoals,
  generateRecommendationsFromResult,
} from "@/services/ai/recommendationEngine.service";
import { getLatestAssessment } from "@/services/assessment.service";
import { formatDate } from "@/utils/age";
import type { Recommendation } from "@/types";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Parent recommendations — LumaPath AI" },
      { name: "description", content: "Daily activities, games and speech practice tailored to the latest results." },
      { property: "og:title", content: "Parent recommendations — LumaPath AI" },
      { property: "og:description", content: "Daily activities and speech practice tailored to your child." },
    ],
  }),
  component: RecommendationsPage,
});

const CATEGORY: Record<Recommendation["category"], { label: string; icon: typeof Clock; tone: string }> = {
  daily: { label: "Daily activity", icon: Repeat, tone: "bg-primary/10 text-primary" },
  game: { label: "Game", icon: Gamepad2, tone: "bg-accent/12 text-accent" },
  exercise: { label: "Exercise", icon: HeartHandshake, tone: "bg-success/12 text-success" },
  speech: { label: "Speech practice", icon: MessageSquareText, tone: "bg-primary/10 text-primary" },
  tip: { label: "Communication tip", icon: Lightbulb, tone: "bg-warning/18 text-warning-foreground" },
};

function RecommendationsPage() {
  const { child, loading } = useActiveChild();
  const { data: latest, isLoading } = useQuery({
    queryKey: ["latest-assessment", child?.id],
    queryFn: () => getLatestAssessment(child?.id ?? ""),
    enabled: !!child?.id,
  });

  if (!child) {
    return (
      <AppShell title="Your plan for this week">
        <ChildGate loading={loading} />
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title="Your plan for this week">
        <Skeleton className="h-40 rounded-2xl" />
      </AppShell>
    );
  }

  if (!latest) {
    return (
      <AppShell title="Your plan for this week">
        <EmptyState
          icon={Video}
          title="Complete a screening to get your plan"
          description="Recommendations are generated from your child's measured domain scores, so there's nothing to base them on yet."
          actionLabel="Start a screening"
          actionTo="/screening"
        />
      </AppShell>
    );
  }

  const recs = generateRecommendationsFromResult(latest);
  const goals = deriveWeeklyGoals(latest);

  return (
    <AppShell
      title="Your plan for this week"
      subtitle={`Generated from the ${formatDate(latest.completedAt)} screening. Small, repeatable moments matter more than long sessions.`}
    >
      <Card className="rounded-2xl border-border/70 bg-gradient-surface p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Focus areas</h2>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {goals?.map((g) => (
            <div key={g.id}>
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{g.title}</p>
                <span className="text-xs tabular-nums text-muted-foreground">{g.progress}/100</span>
              </div>
              <Progress value={g.progress} className="mt-2.5 h-1.5" />
              <p className="mt-2 text-xs text-muted-foreground">Target: {g.target}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recs?.map((rec, i) => {
          const cfg = CATEGORY[rec.category];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Card className="h-full gap-0 rounded-2xl border-border/70 p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="mt-4 w-fit rounded-full text-[11px]">
                  {cfg.label}
                </Badge>
                <h3 className="mt-3 text-base font-semibold tracking-tight">{rec.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{rec.description}</p>
                <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
                  {rec.durationMinutes > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {rec.durationMinutes} min
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Repeat className="h-3.5 w-3.5" /> {rec.frequency}
                  </span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}