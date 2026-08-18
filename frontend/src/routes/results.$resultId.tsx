import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Brain, FileText, PlayCircle, Sparkles, Timer } from "lucide-react";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/common/RiskBadge";
import { ScoreRing } from "@/components/common/ScoreRing";
import { BehaviourMetrics } from "@/components/report/BehaviourMetrics";
import { VideoTimeline } from "@/components/report/VideoTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { COMMUNICATION_MATRIX_LEVELS, SCORE_LABELS } from "@/constants";
import { getStandardActivity } from "@/constants/screening";
import { getVideoForResult } from "@/lib/videoSession";
import { getAssessment } from "@/services/assessment.service";
import { formatDate, formatLatency } from "@/utils/age";
import { useAppStore } from "@/store/useAppStore";
import type { ScoreKey } from "@/types";

const DomainRadarChart = lazy(() =>
  import("@/components/charts/DomainRadarChart").then((m) => ({ default: m.DomainRadarChart })),
);

export const Route = createFileRoute("/results/$resultId")({
  head: () => ({
    meta: [
      { title: "Behaviour analysis report — LumaPath AI" },
      {
        name: "description",
        content:
          "Objective behavioural measurements, timestamped timeline, Communication Matrix level and AI confidence from your uploaded interaction video.",
      },
      { property: "og:title", content: "Behaviour analysis report — LumaPath AI" },
      { property: "og:description", content: "Objective behavioural measurements from an interaction video." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { resultId } = Route.useParams();
  const saved = useAppStore((s) => s.savedResults.find((r) => r.id === resultId));
  const { data: fetched } = useQuery({
    queryKey: ["assessment", resultId],
    queryFn: () => getAssessment(resultId),
    enabled: !saved,
  });
  const result = saved ?? fetched;

  if (!result) {
    return (
      <AppShell title="Behaviour analysis report">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  const radarData = (Object.keys(result.scores) as ScoreKey[]).map((k) => ({
    domain: SCORE_LABELS[k].split(" ")[0],
    score: result.scores[k],
  }));
  const analysis = result.analysis;
  const video = getVideoForResult(result.id);

  return (
    <AppShell
      title="Behaviour analysis report"
      subtitle={
        (analysis ? `${getStandardActivity(analysis.activityId).title} · ` : "") +
        `${formatDate(result.completedAt)} · AI confidence ${Math.round(result.confidence * 100)}%`
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2"
        >
          <Card className="gap-0 rounded-3xl border-border/70 bg-gradient-surface p-7 shadow-lift">
            <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
              <ScoreRing value={result.overallScore} label="Overall" />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge variant="secondary" className="rounded-full">
                    Matrix Level {result.matrixLevel} · {result.matrixLevelName}
                  </Badge>
                  <RiskBadge level={result.riskLevel} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Overall communication score reflects a weighted blend of gaze, gesture, vocal output,
                  shared attention and auditory responsiveness across all recorded activities.
                </p>
                <div className="mt-5 flex flex-wrap gap-5 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Timer className="h-4 w-4 text-primary" />
                    <strong className="font-semibold">{formatLatency(result.responseLatencyMs)}</strong>
                    <span className="text-muted-foreground">mean latency</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Brain className="h-4 w-4 text-accent" />
                    <strong className="font-semibold">{Math.round(result.confidence * 100)}%</strong>
                    <span className="text-muted-foreground">confidence</span>
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
          <h2 className="text-base font-semibold">Domain profile</h2>
          <div className="mt-2 h-56">
            <ClientOnly fallback={<Skeleton className="h-full w-full rounded-2xl" />}>
              <Suspense fallback={<Skeleton className="h-full w-full rounded-2xl" />}>
                <DomainRadarChart data={radarData} />
              </Suspense>
            </ClientOnly>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(result.scores) as ScoreKey[]).map((key, i) => {
          const value = result.scores[key];
          const tone = value >= 80 ? "success" : value >= 65 ? "primary" : "warning";
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Card className="gap-0 rounded-2xl border-border/70 p-5 shadow-soft">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">{SCORE_LABELS[key]}</p>
                  <span className="text-lg font-semibold tabular-nums">{value}</span>
                </div>
                <Progress value={value} className="mt-3 h-1.5" />
                <p className="mt-2.5 text-xs text-muted-foreground">
                  {tone === "success"
                    ? "Within expected range for age."
                    : tone === "primary"
                      ? "Emerging — continue targeted practice."
                      : "Below expectation — prioritise in weekly goals."}
                </p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {analysis && (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">Extracted behavioural features</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Measured from {analysis.framesAnalysed.toLocaleString()} estimated video frames ·{" "}
              {analysis.video.width}×{analysis.video.height} · face tracked in{" "}
              {Math.round(analysis.faceDetectionRate * 100)}% of samples.
            </p>
            <div className="mt-4">
              <BehaviourMetrics groups={analysis.groups} />
            </div>
          </section>

          <div className="mt-6">
            <VideoTimeline
              videoUrl={video?.objectUrl}
              durationSec={analysis.video.durationSec}
              events={analysis.timeline}
            />
          </div>
        </>
      )}

      <Card className="mt-6 gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
        <h2 className="text-base font-semibold">Communication Matrix position</h2>
        <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2">
          {COMMUNICATION_MATRIX_LEVELS.map((l) => {
            const reached = l.level <= result.matrixLevel;
            const current = l.level === result.matrixLevel;
            return (
              <div key={l.level} className="min-w-[8.5rem] flex-1">
                <div
                  className={`h-1.5 rounded-full ${current ? "bg-primary" : reached ? "bg-primary/45" : "bg-secondary"}`}
                />
                <p
                  className={`mt-2 text-[11px] font-semibold ${current ? "text-primary" : "text-muted-foreground"}`}
                >
                  Level {l.level}
                </p>
                <p className="text-xs leading-snug text-muted-foreground">{l.name}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/70 p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold">AI behavioural interpretation</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.aiExplanation}</p>
          <h3 className="mt-6 text-sm font-semibold">Key observations</h3>
          <ul className="mt-3 space-y-2">
            {result.observations.map((o) => (
              <li key={o} className="flex gap-2.5 text-sm text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {o}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="gap-0 rounded-2xl border-border/70 p-6 shadow-soft">
          <h2 className="text-base font-semibold">Communication Matrix</h2>
          <ol className="mt-4 space-y-2">
            {COMMUNICATION_MATRIX_LEVELS.map((l) => {
              const active = l.level === result.matrixLevel;
              return (
                <li
                  key={l.level}
                  className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                    active ? "border-primary/40 bg-primary/8" : "border-transparent bg-secondary/60"
                  }`}
                >
                  <p className={`font-medium ${active ? "text-primary" : ""}`}>
                    Level {l.level} · {l.name}
                  </p>
                  {active && <p className="mt-1 text-muted-foreground">{l.detail}</p>}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="rounded-xl">
          <Link to="/replay/$resultId" params={{ resultId: result.id }}>
            <PlayCircle className="h-4 w-4" /> Open behaviour replay
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/recommendations">
            <Sparkles className="h-4 w-4" /> View recommendations
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/report/$resultId" params={{ resultId: result.id }}>
            <FileText className="h-4 w-4" /> Clinician report
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}