import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BrainCircuit, Info, TrendingDown, TrendingUp, Video } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildGate } from "@/components/common/ChildGate";
import { EmptyState } from "@/components/common/EmptyState";
import { useActiveChild } from "@/hooks/useActiveChild";
import { listAssessments } from "@/services/assessment.service";
import { formatDate } from "@/utils/age";
import { SCORE_LABELS } from "@/constants";
import type { ScoreKey } from "@/types";

export const Route = createFileRoute("/prediction")({
  head: () => ({
    meta: [
      { title: "Score trend — LumaPath AI" },
      {
        name: "description",
        content:
          "How your child's measured communication scores have changed across completed screenings.",
      },
      { property: "og:title", content: "Score trend — LumaPath AI" },
      { property: "og:description", content: "Measured change across completed screenings." },
    ],
  }),
  component: TrendPage,
});

const SCORE_KEYS: ScoreKey[] = [
  "eyeContact",
  "speech",
  "gesture",
  "attention",
  "facialExpression",
  "auditoryResponse",
];

function TrendPage() {
  const { child, loading } = useActiveChild();
  const { data: history, isLoading } = useQuery({
    queryKey: ["assessments", child?.id],
    queryFn: () => listAssessments(child?.id ?? ""),
    enabled: !!child?.id,
  });

  if (!child) {
    return (
      <AppShell title="Score trend">
        <ChildGate loading={loading} />
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell title="Score trend">
        <Skeleton className="h-80 rounded-3xl" />
      </AppShell>
    );
  }

  const sessions = [...(history ?? [])].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );

  if (sessions.length === 0) {
    return (
      <AppShell title="Score trend">
        <EmptyState
          icon={Video}
          title="No sessions to compare yet"
          description={`Trends are measured from ${child.name}'s completed screenings. Complete the first one to establish a baseline.`}
          actionLabel="Start a screening"
          actionTo="/screening"
        />
      </AppShell>
    );
  }

  const first = sessions[0];
  const latest = sessions[sessions.length - 1];
  const overallChange = latest.overallScore - first.overallScore;
  const max = Math.max(...sessions.map((s) => s.overallScore), 100);

  return (
    <AppShell
      title="Score trend"
      subtitle={`${sessions.length} completed ${
        sessions.length === 1 ? "screening" : "screenings"
      } for ${child.name}, from ${formatDate(first.completedAt)} to ${formatDate(latest.completedAt)}.`}
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-lift">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
              <BrainCircuit className="h-4 w-4 text-primary" /> Overall communication score
            </h2>
            {sessions.length > 1 && (
              <Badge
                className={`rounded-full ${
                  overallChange > 0
                    ? "bg-success/15 text-success hover:bg-success/15"
                    : overallChange < 0
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/10"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary"
                }`}
              >
                {overallChange > 0 ? "+" : ""}
                {overallChange} since first session
              </Badge>
            )}
          </div>

          <div className="mt-6 flex h-48 items-end gap-2">
            {sessions.map((s, i) => (
              <motion.div
                key={s.id}
                className="flex-1 rounded-t-xl bg-gradient-primary"
                style={{ minWidth: 12 }}
                initial={{ height: 0 }}
                animate={{ height: `${(s.overallScore / max) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                title={`${s.overallScore}/100 · ${formatDate(s.completedAt)}`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>{formatDate(first.completedAt)}</span>
            {sessions.length > 1 && <span>{formatDate(latest.completedAt)}</span>}
          </div>

          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              These are measured scores, not a forecast. LumaPath does not project future
              development — doing so responsibly needs a model validated against clinical outcomes,
              which this tool does not have. Repeat screenings under similar conditions to see real
              change.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
            <h3 className="text-sm font-semibold tracking-tight">Change by domain</h3>
            {sessions.length < 2 ? (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                One session recorded so far — this is {child.name}&apos;s baseline. Complete a second
                screening to see which domains are moving.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {SCORE_KEYS.map((key) => {
                  const change = latest.scores[key] - first.scores[key];
                  const Icon = change < 0 ? TrendingDown : TrendingUp;
                  return (
                    <li key={key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{SCORE_LABELS[key]}</span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 tabular-nums ${
                          change > 0
                            ? "text-success"
                            : change < 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        {change !== 0 && <Icon className="h-3.5 w-3.5" />}
                        {change > 0 ? "+" : ""}
                        {change}
                        <span className="text-muted-foreground">({latest.scores[key]})</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
            <h3 className="text-sm font-semibold tracking-tight">Measurement confidence</h3>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {Math.round(latest.confidence * 100)}%
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Reported by the analysis engine for the {formatDate(latest.completedAt)} session. It
              reflects recording quality and how much of the clip was measurable — not diagnostic
              certainty.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
