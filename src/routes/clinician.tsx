import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Baby,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Layers,
  Search,
  Stethoscope,
  Timer,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getStandardActivity } from "@/constants/screening";
import { useAppStore } from "@/store/useAppStore";
import type { RiskLevel } from "@/types";

export const Route = createFileRoute("/clinician")({
  head: () => ({
    meta: [
      { title: "Clinician workstation — LumaPath AI" },
      {
        name: "description",
        content:
          "Hospital-style review workstation: AI priority queue, population comparison and reassessment workflow for shared child behaviour screenings.",
      },
      { property: "og:title", content: "Clinician workstation — LumaPath AI" },
      {
        property: "og:description",
        content: "AI priority queue, population comparison and reassessment workflow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClinicianPage,
});

interface QueueCase {
  id: string;
  mrn: string;
  name: string;
  age: string;
  activityId: string;
  score: number;
  risk: RiskLevel;
  confidence: number;
  latencyMs: number;
  shared: string;
  reviewed: boolean;
  /** Population percentile for the child's age band. */
  percentile: number;
  previousScore?: number;
  flags: string[];
}

const BASE_CASES: QueueCase[] = [
  {
    id: "r_003",
    mrn: "LP-48192",
    name: "Zuri O.",
    age: "1y 8m",
    activityId: "response-to-name",
    score: 62,
    risk: "monitor",
    confidence: 0.86,
    latencyMs: 1620,
    shared: "2 days ago",
    reviewed: false,
    percentile: 34,
    previousScore: 58,
    flags: ["Delayed name response", "Low pointing frequency"],
  },
  {
    id: "r_002",
    mrn: "LP-40771",
    name: "Malik A.",
    age: "3y 2m",
    activityId: "social-play",
    score: 88,
    risk: "low",
    confidence: 0.92,
    latencyMs: 940,
    shared: "5 days ago",
    reviewed: true,
    percentile: 78,
    previousScore: 84,
    flags: ["Stable across sessions"],
  },
  {
    id: "r_001",
    mrn: "LP-39004",
    name: "Ife B.",
    age: "0y 9m",
    activityId: "toy-presentation",
    score: 48,
    risk: "elevated",
    confidence: 0.79,
    latencyMs: 2280,
    shared: "1 week ago",
    reviewed: false,
    percentile: 12,
    previousScore: 55,
    flags: ["Reduced joint attention", "Score declined vs prior", "Low video quality"],
  },
];

const RISK_STYLE: Record<RiskLevel, string> = {
  low: "bg-success/15 text-success hover:bg-success/15",
  monitor: "bg-accent/15 text-accent hover:bg-accent/15",
  elevated: "bg-destructive/10 text-destructive hover:bg-destructive/10",
};

const RISK_ORDER: Record<RiskLevel, number> = { elevated: 0, monitor: 1, low: 2 };

/** Composite triage score used to order the queue, Epic-style worklist logic. */
function priorityScore(c: QueueCase) {
  const riskWeight = { elevated: 60, monitor: 35, low: 10 }[c.risk];
  const trend = c.previousScore != null ? Math.max(0, c.previousScore - c.score) : 0;
  return Math.min(
    99,
    Math.round(riskWeight + (100 - c.score) * 0.25 + trend * 0.8 + (1 - c.confidence) * 20),
  );
}

function ClinicianPage() {
  const savedResults = useAppStore((s) => s.savedResults);
  const child = useAppStore((s) => s.child);
  const [filter, setFilter] = useState<"all" | RiskLevel>("all");
  const [query, setQuery] = useState("");
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [scheduled, setScheduled] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cases = useMemo<QueueCase[]>(() => {
    const mine = savedResults.slice(0, 6).map<QueueCase>((r, i) => ({
      id: r.id,
      mrn: `LP-${String(90000 + i)}`,
      name: child?.name ?? "Your child",
      age: r.ageBandId,
      activityId: r.analysis?.activityId ?? "free-play",
      score: r.overallScore,
      risk: r.riskLevel,
      confidence: r.confidence,
      latencyMs: r.responseLatencyMs,
      shared: "just now",
      reviewed: false,
      percentile: Math.max(3, Math.min(97, Math.round(r.overallScore * 0.9))),
      previousScore: savedResults[i + 1]?.overallScore,
      flags: r.riskFactors.slice(0, 3),
    }));
    return [...mine, ...BASE_CASES].sort(
      (a, b) =>
        priorityScore(b) - priorityScore(a) ||
        RISK_ORDER[a.risk] - RISK_ORDER[b.risk] ||
        a.score - b.score,
    );
  }, [savedResults, child?.name]);

  const isReviewed = (c: QueueCase) => reviewed[c.id] ?? c.reviewed;
  const q = query.trim().toLowerCase();
  const shown = cases.filter(
    (c) =>
      (filter === "all" || c.risk === filter) &&
      (!q || c.name.toLowerCase().includes(q) || c.mrn.toLowerCase().includes(q)),
  );
  const selected = shown.find((c) => c.id === selectedId) ?? shown[0];

  const pending = cases.filter((c) => !isReviewed(c)).length;
  const avgConfidence = Math.round(
    (cases.reduce((a, c) => a + c.confidence, 0) / Math.max(1, cases.length)) * 100,
  );
  const avgLatency = Math.round(
    cases.reduce((a, c) => a + c.latencyMs, 0) / Math.max(1, cases.length),
  );
  const dist = (["elevated", "monitor", "low"] as RiskLevel[]).map((r) => ({
    risk: r,
    n: cases.filter((c) => c.risk === r).length,
  }));

  return (
    <AppShell
      title="Clinician workstation"
      subtitle="AI-prioritised worklist of shared child screenings, with population comparison and reassessment planning."
    >
      {/* Hospital-system status bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border/70 bg-secondary/50 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Stethoscope className="h-3.5 w-3.5 text-primary" /> LUMAPATH · SCREENING WORKLIST
        </span>
        <span>CASELOAD {cases.length}</span>
        <span>UNREVIEWED {pending}</span>
        <span>SUBJECT: CHILD ONLY</span>
        <span className="ml-auto">SYNC OK</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Layers} label="Shared screenings" value={`${cases.length}`} />
        <Stat icon={AlertTriangle} label="Awaiting review" value={`${pending}`} />
        <Stat icon={Brain} label="Average AI confidence" value={`${avgConfidence}%`} />
        <Stat
          icon={Timer}
          label="Average response latency"
          value={`${(avgLatency / 1000).toFixed(2)} s`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <h2 className="min-w-0 text-base font-semibold tracking-tight">AI priority queue</h2>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "elevated", "monitor", "low"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  className="rounded-full text-xs capitalize"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" && <Filter className="h-3 w-3" />}
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by child name or MRN…"
              aria-label="Search worklist"
              className="rounded-full pl-9"
            />
          </div>

          <ul className="mt-5 space-y-3">
            {shown.map((c, i) => {
              const p = priorityScore(c);
              const done = isReviewed(c);
              const active = selected?.id === c.id;
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedId(c.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                    active
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/70 hover:bg-secondary/50"
                  }`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                        <Baby className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{c.name}</span>
                        <span className="font-normal text-muted-foreground">· {c.age}</span>
                        <span className="font-mono text-[11px] font-normal text-muted-foreground">
                          {c.mrn}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {getStandardActivity(c.activityId).title} · shared {c.shared}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge className={`rounded-full capitalize ${RISK_STYLE[c.risk]}`}>
                        {c.risk}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        PRIORITY {p}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <Metric label="Score" value={`${c.score}/100`} />
                    <Metric label="Percentile" value={`${c.percentile}th`} />
                    <Metric label="Confidence" value={`${Math.round(c.confidence * 100)}%`} />
                    <Metric label="Latency" value={`${(c.latencyMs / 1000).toFixed(2)} s`} />
                  </div>

                  {c.flags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.flags.map((f) => (
                        <span
                          key={f}
                          className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" className="rounded-full">
                      <Link to="/results/$resultId" params={{ resultId: c.id }}>
                        Open analysis
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link to="/replay/$resultId" params={{ resultId: c.id }}>
                        Replay
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link to="/report/$resultId" params={{ resultId: c.id }}>
                        <FileText className="h-3.5 w-3.5" /> Report
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant={done ? "secondary" : "outline"}
                      className="rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewed((r) => ({ ...r, [c.id]: !done }));
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {done ? "Reviewed" : "Mark reviewed"}
                    </Button>
                  </div>
                </motion.li>
              );
            })}
            {shown.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No screenings match this filter or search.
              </li>
            )}
          </ul>
        </Card>

        <div className="space-y-6">
          {selected && (
            <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold tracking-tight">Population comparison</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.name} · {selected.age} age band cohort
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">Cohort percentile</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {selected.percentile}th
                    </span>
                  </div>
                  <Progress value={selected.percentile} className="mt-1.5 h-1.5" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-muted-foreground">This session</span>
                    <span className="text-sm font-semibold tabular-nums">{selected.score}/100</span>
                  </div>
                  <Progress value={selected.score} className="mt-1.5 h-1.5" />
                </div>
                {selected.previousScore != null && (
                  <div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Previous session</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {selected.previousScore}/100 (
                        {selected.score >= selected.previousScore ? "+" : ""}
                        {selected.score - selected.previousScore})
                      </span>
                    </div>
                    <Progress value={selected.previousScore} className="mt-1.5 h-1.5" />
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-border/70 pt-5">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Reassessment</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {scheduled[selected.id]
                    ? `Reassessment requested in ${scheduled[selected.id]}.`
                    : selected.risk === "elevated"
                      ? "AI suggestion: reassess in 2 weeks and prioritise a clinical visit."
                      : selected.risk === "monitor"
                        ? "AI suggestion: reassess in 4 weeks with the same activity."
                        : "AI suggestion: routine reassessment in 8 weeks."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["2 weeks", "4 weeks", "8 weeks"].map((w) => (
                    <Button
                      key={w}
                      size="sm"
                      variant={scheduled[selected.id] === w ? "default" : "outline"}
                      className="rounded-full text-xs"
                      onClick={() => setScheduled((s) => ({ ...s, [selected.id]: w }))}
                    >
                      {w}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
            <h2 className="text-base font-semibold tracking-tight">Risk distribution</h2>
            <ul className="mt-4 space-y-4">
              {dist.map((d) => (
                <li key={d.risk}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                    <span className="truncate text-xs capitalize text-muted-foreground">
                      {d.risk}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{d.n}</span>
                  </div>
                  <Progress
                    value={(d.n / Math.max(1, cases.length)) * 100}
                    className="mt-1.5 h-1.5"
                  />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold tracking-tight">Review protocol</h2>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              {[
                "Confirm the AI tracked the child, not the caregiver, in the replay overlay.",
                "Watch the flagged timeline segments before reading the scores.",
                "Check AI confidence and video quality before weighting any metric.",
                "Compare against the previous session as well as the cohort percentile.",
                "Record your own clinical impression — the AI output is an observation aid.",
              ].map((t, i) => (
                <li key={t} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 leading-relaxed">{t}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 flex gap-2 rounded-2xl bg-secondary/70 p-4 text-xs leading-relaxed text-muted-foreground">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              AI-assisted Screening Tool. Not intended to replace clinical diagnosis.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Brain; label: string; value: string }) {
  return (
    <Card className="gap-0 rounded-2xl border-border/70 p-5 shadow-soft">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2">
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
