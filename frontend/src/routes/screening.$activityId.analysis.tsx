import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ANALYSIS_STAGES, AI_MODEL_STACK, getStandardActivity } from "@/constants/screening";
import { celebrate } from "@/lib/celebrate";
import { attachVideoToResult, getVideoSession } from "@/lib/videoSession";
import {
  analyzeBehaviour,
  buildResultFromAnalysis,
  sampleFrames,
} from "@/services/ai/behaviourAnalysis.service";
import { analyseAudioTrack } from "@/services/ai/audioAnalysis.service";
import { assessQuality, type QualityVerdict } from "@/services/ai/qualityGate.service";
import { useAppStore } from "@/store/useAppStore";
import { useActiveChild } from "@/hooks/useActiveChild";
import { useAuth } from "@/hooks/useAuth";
import { persistResult } from "@/services/resultPersistence.service";
import { ageInMonths } from "@/utils/age";

export const Route = createFileRoute("/screening/$activityId/analysis")({
  head: () => ({
    meta: [
      { title: "AI behaviour analysis — LumaPath AI" },
      {
        name: "description",
        content: "Vision and speech models extract behavioural features from the uploaded parent–child interaction video.",
      },
      { property: "og:title", content: "AI behaviour analysis — LumaPath AI" },
      { property: "og:description", content: "Behavioural feature extraction from an interaction video." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalysisPage,
});

const TOTAL_WEIGHT = ANALYSIS_STAGES.reduce((a, s) => a + s.weight, 0);

function AnalysisPage() {
  const { activityId } = Route.useParams();
  const activity = getStandardActivity(activityId);
  const navigate = useNavigate();
  const { child } = useActiveChild();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const saveResult = useAppStore((s) => s.saveResult);
  // Most recent stored result, used to describe change in the notification.
  const previousResult = useAppStore((s) => s.savedResults[0]);
  const [ratio, setRatio] = useState(0);
  const [frames, setFrames] = useState(0);
  const [fps, setFps] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [rejection, setRejection] = useState<QualityVerdict | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const session = getVideoSession();
    if (!session) {
      navigate({ to: "/screening/$activityId/upload", params: { activityId } });
      return;
    }
    if (!session.subject) {
      // Analysis only runs against a parent-selected child.
      navigate({ to: "/screening/$activityId/subject", params: { activityId } });
      return;
    }
    // Scoring needs the child's age band, so wait for the profile to load
    // rather than analysing against a placeholder.
    if (!child) return;
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    const t0 = performance.now();
    (async () => {
      try {
        // Stages before frame extraction.
        await step(setRatio, 0, 0.08, 220);
        // Never let a stubborn decoder stall the pipeline: fall back to whatever
        // frames were read once the sampling budget is exceeded.
        const collected: Awaited<ReturnType<typeof sampleFrames>> = [];
        const frames = await Promise.race([
          sampleFrames(session.file, {
            frames: 14,
            targetAgeYears: ageInMonths(child.birthDate) / 12,
            lockedSubject: session.subject,
            onProgress: (r) => {
              if (cancelled) return;
              setRatio(0.08 + r * 0.72);
              const done = Math.round(r * 14);
              setFrames(done);
              const secs = (performance.now() - t0) / 1000;
              setFps(secs > 0 ? Number((done / secs).toFixed(1)) : 0);
            },
          }),
          new Promise<typeof collected>((resolve) =>
            setTimeout(() => resolve(collected), 12000),
          ),
        ]);
        if (cancelled) return;
        if (frames.length === 0) {
          throw new Error(
            "This video could not be decoded in your browser. Try an MP4 (H.264) or WebM re-export.",
          );
        }
        // Refuse to score a recording that cannot support a conclusion. A bad
        // number with low confidence is worse than an honest "record again".
        const verdict = assessQuality(session.probe, frames);
        if (!verdict.scorable) {
          setRejection(verdict);
          return;
        }

        // Decode and analyse the audio track. Never fatal — a video without
        // usable audio still produces visual scores, just with vocal measures
        // marked unavailable rather than invented.
        const audio = await analyseAudioTrack(session.file);
        if (cancelled) return;

        const analysis = analyzeBehaviour(activityId, session.probe, frames, audio);
        await step(setRatio, 0.8, 0.94, 260);
        const result = buildResultFromAnalysis(analysis, child.ageBandId, child.id);
        saveResult(result);
        attachVideoToResult(result.id);

        // Saved locally first so a network failure cannot lose the session.
        const outcome = await persistResult(result, activityId, {
          profileId: userId,
          childName: child.name,
          birthDate: child.birthDate,
          previous: previousResult,
        });
        if (!outcome.persisted) {
          toast.warning(
            "Saved on this device only — it will not appear on your other devices.",
            { description: outcome.reason },
          );
        }

        await step(setRatio, 0.94, 1, 180);
        if (cancelled) return;
        celebrate();
        navigate({ to: "/replay/$resultId", params: { resultId: result.id } });
      } catch (e) {
        if (!cancelled) setFailed(e instanceof Error ? e.message : "Analysis could not be completed.");
        toast.error("Analysis failed. Please try uploading the video again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, child, navigate, saveResult]);

  const doneWeight = ratio * TOTAL_WEIGHT;
  let cursor = 0;
  const stageStates = ANALYSIS_STAGES.map((s) => {
    const start = cursor;
    cursor += s.weight;
    return {
      ...s,
      status: doneWeight >= cursor ? "done" : doneWeight > start ? "active" : "pending",
    } as const;
  });
  const activeStage = stageStates.find((s) => s.status === "active") ?? stageStates[stageStates.length - 1];
  const remaining = Math.max(1, Math.round((1 - ratio) * 9));
  const confidence = Math.round(38 + ratio * 55);
  const LOCK_CAPTIONS = [
    "Locking onto child…",
    "Generating behavioural analysis…",
    "Computing Communication Matrix…",
    "Calculating response latency…",
  ];
  const caption = LOCK_CAPTIONS[Math.min(LOCK_CAPTIONS.length - 1, Math.floor(ratio * LOCK_CAPTIONS.length))];

  if (rejection) {
    return (
      <div className="relative min-h-screen bg-[oklch(0.19_0.04_255)] text-white">
        <div className="relative mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <Logo className="[&_span]:text-white" />
          <div className="mt-10 rounded-3xl bg-white/10 p-8">
            <ShieldCheck className="h-8 w-8 text-white/80" />
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              This recording can&apos;t be scored
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Scoring it anyway would produce a number that says more about the recording than
              about your child. Here&apos;s what got in the way:
            </p>

            <ul className="mt-5 space-y-2 text-sm text-white/85">
              {rejection.reasons.map((r) => (
                <li key={r} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/70">
              How to fix it
            </p>
            <ul className="mt-2.5 space-y-2 text-sm text-white/85">
              {rejection.fixes.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() =>
                  navigate({ to: "/screening/$activityId/record", params: { activityId } })
                }
              >
                Record again
              </Button>
              <Button
                variant="ghost"
                className="rounded-xl text-white hover:bg-white/15 hover:text-white"
                onClick={() =>
                  navigate({ to: "/screening/$activityId/upload", params: { activityId } })
                }
              >
                Upload a different video
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.19_0.04_255)] text-white">
      <div className="pointer-events-none absolute -left-32 top-0 h-[26rem] w-[26rem] rounded-full bg-primary/25" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-accent/20" />

      <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex items-center justify-between gap-4">
          <Logo className="[&_span]:text-white" />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            {activity.title}
          </span>
        </div>

        <div className="mt-10 text-center">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10"
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            Analysing behavioural features
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/70">
            {failed
              ? failed
              : `${activeStage.label} · ${activeStage.model} — about ${remaining}s remaining`}
          </p>
          {!failed && (
            <AnimatePresence mode="wait">
              <motion.p
                key={caption}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 text-sm font-semibold tracking-tight text-white"
              >
                {caption}
              </motion.p>
            </AnimatePresence>
          )}
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.78_0.19_150)]/15 px-3 py-1 text-[11px] font-medium text-[oklch(0.88_0.16_150)]">
            Track locked · CHILD-01 (parent-selected)
          </p>

          <div className="mx-auto mt-7 h-2 max-w-md overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="h-full rounded-full bg-white"
              animate={{ width: `${Math.round(ratio * 100)}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
          </div>
          <p className="mt-2 text-xs tabular-nums text-white/60">{Math.round(ratio * 100)}%</p>

          <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2">
            {[
              { k: "Frames", v: `${frames}` },
              { k: "Speed", v: `${fps || 0}/s` },
              { k: "Confidence", v: `${confidence}%` },
            ].map((m) => (
              <div key={m.k} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{m.k}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{m.v}</p>
              </div>
            ))}
          </div>

          {failed && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                className="rounded-xl bg-white text-primary hover:bg-white/90"
                onClick={() => navigate({ to: "/screening/$activityId/upload", params: { activityId } })}
              >
                Upload the video again
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={() => navigate({ to: "/screening/$activityId/subject", params: { activityId } })}
              >
                Wrong child selected?
              </Button>
            </div>
          )}
        </div>

        <ul className="mt-10 grid gap-2 sm:grid-cols-2">
          {stageStates.map((s) => (
            <li
              key={s.key}
              className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                s.status === "done"
                  ? "border-white/15 bg-white/10"
                  : s.status === "active"
                    ? "border-white/40 bg-white/15"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                <AnimatePresence mode="wait" initial={false}>
                  {s.status === "done" ? (
                    <motion.span key="d" initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                      <Check className="h-3.5 w-3.5" />
                    </motion.span>
                  ) : s.status === "active" ? (
                    <Loader2 key="a" className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span key="p" className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  )}
                </AnimatePresence>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{s.label}</span>
                <span className="block truncate text-[11px] text-white/55">{s.model}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AI_MODEL_STACK.map((g) => (
            <div key={g.group} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{g.group}</p>
              <ul className="mt-2 space-y-1">
                {g.items.map((i) => (
                  <li key={i} className="truncate text-sm text-white/85">{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-white/60">
          <ShieldCheck className="h-3.5 w-3.5" />
          AI-assisted screening tool. Not intended to replace clinical diagnosis.
        </p>
      </div>
    </div>
  );
}

function step(
  set: (v: number) => void,
  from: number,
  to: number,
  ms: number,
) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms);
      set(from + (to - from) * p);
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}
