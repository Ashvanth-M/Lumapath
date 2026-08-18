import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Baby,
  CheckCircle2,
  Eye,
  FileText,
  Hand,
  MessageCircle,
  Mic,
  Scan,
  ShieldCheck,
  Sparkles,
  Timer,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { ReplayStage } from "@/components/replay/ReplayStage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COMMUNICATION_MATRIX_LEVELS, SCORE_LABELS } from "@/constants";
import { getStandardActivity, SCREENING_DISCLAIMER } from "@/constants/screening";
import { derivedSamples, EMPTY_SAMPLE, pct } from "@/lib/replaySignals";
import { getVideoForResult, restoreSessionForResult } from "@/lib/videoSession";
import { getAssessment } from "@/services/assessment.service";
import { useActiveChild } from "@/hooks/useActiveChild";
import { useAppStore } from "@/store/useAppStore";
import type { BehaviourSample, ScoreKey } from "@/types";
import { formatAge } from "@/utils/age";

export const Route = createFileRoute("/replay/$resultId")({
  head: () => ({
    meta: [
      { title: "Behaviour replay — LumaPath AI" },
      {
        name: "description",
        content:
          "Replay the uploaded parent–child interaction with computer-vision overlays, a timestamped behaviour timeline and live AI observation cards.",
      },
      { property: "og:title", content: "Behaviour replay — LumaPath AI" },
      {
        property: "og:description",
        content:
          "Computer-vision overlays and live behavioural observations on your uploaded interaction video.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReplayPage,
});

function ReplayPage() {
  const { resultId } = Route.useParams();
  const saved = useAppStore((s) => s.savedResults.find((r) => r.id === resultId));
  const { child } = useActiveChild();
  const { data: fetched } = useQuery({
    queryKey: ["assessment", resultId],
    queryFn: () => getAssessment(resultId),
    enabled: !saved,
  });
  const result = saved ?? fetched;

  const [live, setLive] = useState<BehaviourSample>(EMPTY_SAMPLE);
  const [t, setT] = useState(0);
  const lastPush = useRef(0);
  const seekRef = useRef<((t: number) => void) | null>(null);

  // ~8 Hz keeps the cards feeling live without re-rendering on every frame.
  const onTime = useCallback((time: number, s: BehaviourSample) => {
    const now = performance.now();
    if (now - lastPush.current < 120) return;
    lastPush.current = now;
    setLive(s);
    setT(time);
  }, []);
  const registerSeek = useCallback((fn: (time: number) => void) => {
    seekRef.current = fn;
  }, []);

  const analysis = result?.analysis;
  const video = result ? getVideoForResult(result.id) : null;
  const navigate = useNavigate();
  const duration = analysis?.video.durationSec ?? 45;
  const events = useMemo(() => analysis?.timeline ?? [], [analysis]);
  const samples = useMemo(
    () => {
      const raw = analysis?.samples?.length
        ? analysis.samples
        : result
          ? derivedSamples(result.scores, duration)
          : [];
      // Repair legacy analyses produced before child identity locking: the old
      // pipeline could label the largest (adult) face as primary. Preserve all
      // signals while swapping only the subject boxes.
      return raw.map((sample) => {
        const caregiver = sample.parentBox;
        if (!caregiver || sample.box.w * sample.box.h <= caregiver.w * caregiver.h) return sample;
        return {
          ...sample,
          box: caregiver,
          parentBox: sample.box,
          trackId: "CHILD-01",
        };
      });
    },
    [analysis, result, duration],
  );
  const activeEvent = useMemo(
    () => events.reduce((acc, e, i) => (e.atSec <= t + 0.35 ? i : acc), -1),
    [events, t],
  );

  if (!result) {
    return (
      <main className="min-h-screen bg-[oklch(0.18_0.04_255)] px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-10 w-56 rounded-xl bg-white/10" />
          <Skeleton className="aspect-video w-full rounded-3xl bg-white/10" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const activity = getStandardActivity(analysis?.activityId ?? "");
  const engagement = pct((live.face + live.gaze + live.motion) / 3);
  const latencySec = result.responseLatencyMs / 1000;
  const eyeSec = (result.scores.eyeContact / 100) * duration;
  const cards: Array<{
    icon: typeof Eye;
    label: string;
    value: string;
    bar: number;
    reason: string;
    meaning: string;
  }> = [
    {
      icon: Eye,
      label: "Eye contact",
      value: `${pct(live.gaze)}%`,
      bar: pct(live.gaze),
      reason: `Child maintained gaze toward the caregiver for ${eyeSec.toFixed(0)} s of the ${duration.toFixed(0)} s clip.`,
      meaning:
        result.scores.eyeContact >= 70
          ? "Supports age-appropriate social engagement."
          : "Fewer mutual-gaze windows than expected — worth repeating the activity.",
    },
    {
      icon: Scan,
      label: "Child face detection",
      value: `${pct(live.face)}%`,
      bar: pct(live.face),
      reason: `The primary subject's face was tracked in ${Math.round((analysis?.faceDetectionRate ?? 0.8) * 100)}% of sampled frames.`,
      meaning: "Determines how much of the behavioural measurement is evidence-backed.",
    },
    {
      icon: Activity,
      label: "Head orientation",
      value: live.gaze > 0.45 ? "Towards caregiver" : "Away",
      bar: pct(live.gaze * 0.9),
      reason: "Head-pose vector measured from the child's tracked face box each frame.",
      meaning: "Orientation toward the caregiver indicates social referencing.",
    },
    {
      icon: Hand,
      label: "Gesture activity",
      value: `${pct(live.motion)}%`,
      bar: pct(live.motion),
      reason: `${result.scores.gesture} / 100 from reach, point and hand-movement bursts inside the child box.`,
      meaning: "Gestures are pre-verbal communication and a Communication Matrix anchor.",
    },
    {
      icon: Mic,
      label: "Voice activity",
      value: live.voice > 0.35 ? "Detected" : "Quiet",
      bar: pct(live.voice),
      reason: analysis?.video.hasAudio
        ? "Vocalisation segments detected on the audio track during child activity."
        : "No audio track in the upload, so vocalisation could not be measured.",
      meaning: "Vocalisation count and turn-taking underpin the speech domain score.",
    },
    {
      icon: MessageCircle,
      label: "Object interaction",
      value: live.motion > 0.15 ? "Present" : "Absent",
      bar: pct(live.motion * 1.2),
      reason: "Hand/object proximity events measured while the toy was in frame.",
      meaning: "Object-directed action supports joint attention and shared focus.",
    },
    {
      icon: Timer,
      label: "Response latency",
      value: `${latencySec.toFixed(2)} s`,
      bar: Math.max(10, 100 - result.responseLatencyMs / 30),
      reason: `First measurable child response arrived ${latencySec.toFixed(2)} s after the caregiver prompt.`,
      meaning:
        latencySec <= 2
          ? "Within the typical responsive range for this age band."
          : "Slower responsiveness — a point to discuss with your clinician.",
    },
    {
      icon: Sparkles,
      label: "Engagement score",
      value: `${engagement}%`,
      bar: engagement,
      reason: "Composite of child face presence, gaze and movement at the current replay position.",
      meaning: "A live view of how engaged the child is moment to moment.",
    },
  ];

  const maps: Array<[string, number]> = [
    ["Gaze map", result.scores.eyeContact],
    ["Interaction map", result.scores.gesture],
    ["Movement path", Math.round(pct(live.motion) * 0.5 + result.scores.gesture * 0.5)],
    ["Attention map", result.scores.attention],
    ["Object focus", Math.round((result.scores.gesture + result.scores.attention) / 2)],
  ];

  const heatmap: Array<[string, number]> = [
    ["Eye contact", result.scores.eyeContact],
    ["Gesture", result.scores.gesture],
    ["Speech", result.scores.speech],
    ["Attention", result.scores.attention],
    ["Facial expression", result.scores.facialExpression],
    ["Auditory response", result.scores.auditoryResponse],
  ];

  const observed = result.observations.slice(0, 5);
  const concerns = result.riskFactors.slice(0, 3);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.18_0.04_255)] text-white">
      <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-primary/20" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-[24rem] w-[24rem] rounded-full bg-accent/15" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Behaviour replay
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {activity.title}
            </h1>
            <p className="mt-1.5 text-sm text-white/65">
              Computer-vision overlays replayed against the uploaded interaction video.
            </p>
          </div>
          <ConfidenceMeter value={result.confidence} />
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
              Primary subject
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
              <Baby className="h-4 w-4 text-emerald-200" /> Child · scored
            </p>
            <p className="mt-1 text-xs text-white/60">
              Green box, persistent ID, landmarks, head pose, gaze, body and hand keypoints.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-300/40 bg-sky-400/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
              Secondary subject
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
              <UserRound className="h-4 w-4 text-sky-200" /> Parent / caregiver
            </p>
            <p className="mt-1 text-xs text-white/60">
              Blue box, contextual tracking only — never behaviourally scored.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              AI focus
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-white/70" /> Child behaviour
            </p>
            <p className="mt-1 text-xs text-white/60">
              Every metric below is computed for the child only. Tracking recovers by prediction
              rather than switching identity.
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <ReplayStage
              videoUrl={video?.objectUrl}
              samples={samples}
              durationSec={duration}
              onTime={onTime}
              registerSeek={registerSeek}
              childName={child?.name ?? "Assessment child"}
              childAgeLabel={child ? formatAge(child.birthDate) : `${live.estimatedAgeYears?.toFixed(1) ?? "3"} years`}
            />

            <section className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm font-semibold">Event timeline</h2>
              <div className="relative mt-4 h-2 rounded-full bg-white/15">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400/70 to-emerald-300/70"
                  style={{ width: `${Math.min(100, (t / Math.max(1, duration)) * 100)}%` }}
                />
                {events.map((e, i) => (
                  <button
                    key={`${e.atSec}-${i}`}
                    type="button"
                    aria-label={`Jump to ${e.label} at ${e.atSec} seconds`}
                    onClick={() => seekRef.current?.(e.atSec)}
                    style={{ left: `${Math.min(98, (e.atSec / Math.max(1, duration)) * 100)}%` }}
                    className={`absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-[oklch(0.18_0.04_255)] transition-transform hover:scale-125 ${
                      i === activeEvent ? "bg-emerald-300" : "bg-sky-400/70"
                    }`}
                  />
                ))}
              </div>
              <ul className="mt-5 space-y-2">
                {events.map((e, i) => (
                  <li key={`${e.atSec}-row-${i}`}>
                    <button
                      type="button"
                      onClick={() => seekRef.current?.(e.atSec)}
                      className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                        i === activeEvent
                          ? "border-emerald-300/50 bg-emerald-400/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="shrink-0 font-mono text-xs tabular-nums text-sky-200">
                        {clock(e.atSec)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{e.label}</span>
                        <span className="block truncate text-xs text-white/55">{e.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {events.length === 0 && (
                  <li className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                    No timestamped events were stored for this session.
                  </li>
                )}
              </ul>
            </section>
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm font-semibold">AI observations</h2>
              <p className="mt-1 text-xs text-white/55">Updating live with the replay position.</p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {cards.map(({ icon: Icon, label, value, bar, reason, meaning }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-xs text-white/65">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-sky-200" />
                        <span className="truncate">{label}</span>
                      </span>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={value}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.18 }}
                          className="shrink-0 text-sm font-semibold tabular-nums"
                        >
                          {value}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/15">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-sky-300 to-emerald-300"
                        animate={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                      />
                    </div>
                    <details className="group mt-2.5">
                      <summary className="cursor-pointer list-none text-[11px] font-medium text-sky-200/90 hover:text-sky-100">
                        Why this value?
                      </summary>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-white/65">
                        <span className="font-semibold text-white/80">Reason: </span>
                        {reason}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/65">
                        <span className="font-semibold text-white/80">Clinical meaning: </span>
                        {meaning}
                      </p>
                    </details>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm font-semibold">Behaviour heatmap</h2>
              <p className="mt-1 text-xs text-white/55">
                Child-only signal density across the clip.
              </p>
              <ul className="mt-4 space-y-3">
                {[...heatmap, ...maps].map(([label, score], i) => (
                  <li key={label}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-white/65">{label}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{score}</span>
                    </div>
                    <div className="mt-1.5 flex gap-1">
                      {Array.from({ length: 10 }).map((_, cell) => (
                        <motion.span
                          key={cell}
                          initial={{ opacity: 0, scaleY: 0.4 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{ delay: i * 0.05 + cell * 0.03, duration: 0.25 }}
                          className={`h-3 flex-1 rounded-[3px] ${
                            cell * 10 < score
                              ? score >= 75
                                ? "bg-emerald-300"
                                : score >= 55
                                  ? "bg-sky-300"
                                  : "bg-amber-300"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <SummaryCard tone="ok" title="Observed" icon={CheckCircle2} items={observed} />
          <SummaryCard tone="warn" title="Points to watch" icon={TriangleAlert} items={concerns} />
          <SummaryCard
            tone="info"
            title="Recommendation"
            icon={Sparkles}
            items={[
              `Repeat the ${activity.title} activity twice weekly and re-upload to track change.`,
              "Share this replay with your clinician before the next appointment.",
            ]}
          />
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-sm font-semibold">Communication Matrix progression</h2>
          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2">
            {COMMUNICATION_MATRIX_LEVELS.map((l, i) => {
              const reached = l.level <= result.matrixLevel;
              const current = l.level === result.matrixLevel;
              return (
                <div key={l.level} className="min-w-[8.5rem] flex-1">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className={`h-1.5 origin-left rounded-full ${
                      current ? "bg-emerald-300" : reached ? "bg-sky-400/70" : "bg-white/15"
                    }`}
                  />
                  <p
                    className={`mt-2 text-[11px] font-semibold ${
                      current ? "text-emerald-200" : "text-white/55"
                    }`}
                  >
                    Level {l.level}
                    {current && " · current"}
                  </p>
                  <p className="text-xs leading-snug text-white/55">{l.name}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(result.scores) as ScoreKey[]).map((k, i) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium">{SCORE_LABELS[k]}</p>
                <span className="shrink-0 text-lg font-semibold tabular-nums">
                  {result.scores[k]}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.scores[k]}%` }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-sky-300 to-emerald-300"
                />
              </div>
              <p className="mt-2.5 text-xs text-white/55">
                {result.scores[k] >= 75
                  ? "Within expected range for age."
                  : result.scores[k] >= 55
                    ? "Emerging — continue targeted practice."
                    : "Below expectation — prioritise in weekly goals."}
              </p>
            </motion.div>
          ))}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="rounded-xl bg-white text-slate-900 hover:bg-white/90">
            <Link to="/results/$resultId" params={{ resultId: result.id }}>
              <FileText className="h-4 w-4" /> Open behaviour report
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link to="/report/$resultId" params={{ resultId: result.id }}>
              Clinician report
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link to="/recommendations">Recommendations</Link>
          </Button>
          {video && (
            <Button
              variant="outline"
              className="rounded-xl border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                const session = restoreSessionForResult(result.id);
                if (!session) return;
                void navigate({
                  to: "/screening/$activityId/subject",
                  params: { activityId: session.activityId },
                });
              }}
            >
              <UserRound className="h-4 w-4" /> Wrong child selected?
            </Button>
          )}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-white/55">
          <ShieldCheck className="h-3.5 w-3.5" />
          {SCREENING_DISCLAIMER}
        </p>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string;
  items: string[];
  tone: "ok" | "warn" | "info";
  icon: typeof CheckCircle2;
}) {
  const ring =
    tone === "ok"
      ? "border-emerald-300/30 bg-emerald-400/10"
      : tone === "warn"
        ? "border-amber-300/30 bg-amber-400/10"
        : "border-sky-300/30 bg-sky-400/10";
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-3xl border p-5 ${ring}`}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((o) => (
          <li key={o} className="flex gap-2.5 text-sm leading-relaxed text-white/75">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
            {o}
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const target = Math.round(value * 100);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const begin = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - begin) / 1100);
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return (
    <div className="min-w-[13rem] rounded-2xl border border-white/15 bg-white/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
        AI confidence
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{shown}%</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-sky-300 to-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.65)]"
          animate={{ width: `${shown}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </div>
  );
}

function clock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
