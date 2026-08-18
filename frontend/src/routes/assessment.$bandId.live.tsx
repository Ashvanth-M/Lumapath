import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  CircleDot,
  Lightbulb,
  Megaphone,
  Mic,
  MicOff,
  ShieldCheck,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AIStatusPipeline } from "@/components/live/AIStatusPipeline";
import { ModelStackPanel } from "@/components/live/ModelStackPanel";
import { AnimatedCounter } from "@/components/live/AnimatedCounter";
import { LiveEventTimeline } from "@/components/live/LiveEventTimeline";
import { LiveMetricsPanel } from "@/components/live/LiveMetricsPanel";
import { LiveOverlay } from "@/components/live/LiveOverlay";
import { QualityPreflight } from "@/components/live/QualityPreflight";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ACTIVITIES_BY_BAND, AGE_BANDS } from "@/constants";
import { SCREENING_DISCLAIMER } from "@/constants/screening";
import { celebrate } from "@/lib/celebrate";
import { cancelVoice, isVoiceSupported, setVoiceEnabled, speak } from "@/lib/voice";
import { useActiveChild } from "@/hooks/useActiveChild";
import { buildResultFromLiveSession } from "@/services/ai/liveResult.service";
import { persistResult } from "@/services/resultPersistence.service";
import {
  activeAdapters,
  EMPTY_METRICS,
  EMPTY_QUALITY,
  LiveVisionEngine,
  type LiveDetection,
  type LiveEvent,
  type LiveMetrics,
  type LiveQuality,
} from "@/services/ai/liveVision.service";
import { useAppStore } from "@/store/useAppStore";
import type { AgeBandId } from "@/types";

export const Route = createFileRoute("/assessment/$bandId/live")({
  head: () => ({
    meta: [
      { title: "Live AI analysis dashboard — LumaPath AI" },
      {
        name: "description",
        content:
          "Record the guided screening while the AI measures eye contact, gaze, gestures, speech and shared attention frame by frame.",
      },
      { property: "og:title", content: "Live AI analysis dashboard — LumaPath AI" },
      {
        property: "og:description",
        content: "Real-time behavioural analysis overlays and metrics while you record.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveSession,
});

type Phase = "ready" | "countdown" | "running" | "complete";

function LiveSession() {
  const { bandId } = Route.useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<LiveVisionEngine | null>(null);
  const band = AGE_BANDS.find((b) => b.id === bandId) ?? AGE_BANDS[2];
  const activities = useMemo(
    () => ACTIVITIES_BY_BAND[bandId as AgeBandId] ?? ACTIVITIES_BY_BAND["1-2y"],
    [bandId],
  );
  const advanceDraft = useAppStore((s) => s.advanceDraft);
  const saveResult = useAppStore((s) => s.saveResult);
  // Named `activeChild`, not `child` — `child` already means "the detected
  // child in the current frame" further down this file.
  const { child: activeChild } = useActiveChild();

  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(activities[0].seconds);
  const [metrics, setMetrics] = useState<LiveMetrics>(EMPTY_METRICS);
  const [quality, setQuality] = useState<LiveQuality>(EMPTY_QUALITY);
  const [detections, setDetections] = useState<LiveDetection[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [fps, setFps] = useState(0);
  const [stageTick, setStageTick] = useState(0);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);

  const activity = activities[index];
  const running = phase === "running";
  const adapters = useMemo(() => activeAdapters(), []);

  /* Camera + microphone + analysis engine */
  useEffect(() => {
    const engine = new LiveVisionEngine();
    engineRef.current = engine;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        setCameraReady(true);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          engine.attach(videoRef.current);
        }
        engine.attachAudio(s);
      })
      .catch(() => setCameraReady(false));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      engine.dispose();
      cancelVoice();
    };
  }, []);

  /* Analysis loop — runs before recording (quality checks) and during (metrics) */
  useEffect(() => {
    let id = 0;
    let stop = false;
    const loop = () => {
      if (stop) return;
      const engine = engineRef.current;
      const video = videoRef.current;
      if (engine && video) {
        const frame = engine.step(video, running);
        if (frame) {
          setDetections(frame.detections);
          setQuality(frame.quality);
          setFps(frame.fps);
          if (running) {
            setMetrics(frame.metrics);
            setEvents(engine.getEvents());
          }
        }
      }
      id = window.setTimeout(loop, running ? 140 : 400);
    };
    loop();
    return () => {
      stop = true;
      window.clearTimeout(id);
    };
  }, [running]);

  useEffect(() => setVoiceEnabled(voiceOn), [voiceOn]);

  /* Rotating AI status stages */
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStageTick((v) => v + 1), 1400);
    return () => clearInterval(t);
  }, [running]);

  /* Countdown into the session */
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      engineRef.current?.start();
      setPhase("running");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  /* Voice-guided instruction on every activity change */
  useEffect(() => {
    if (!running) return;
    speak(`${activity.title}. ${activity.audioScript}`);
    engineRef.current?.markPrompt(`${activity.title} prompt given`);
  }, [running, activity]);

  const finish = useCallback(() => {
    setPhase("complete");
    cancelVoice();
    speak("Session complete. Great work.");
    void celebrate();
  }, []);

  const markDone = useCallback(() => {
    advanceDraft(activity.id);
    setJustCompleted(activity.id);
    setTimeout(() => setJustCompleted(null), 900);
    if (index + 1 < activities.length) {
      setIndex(index + 1);
      setRemaining(activities[index + 1].seconds);
      toast.success("Activity marked done");
    } else {
      setRemaining(0);
      finish();
    }
  }, [activity, activities, advanceDraft, finish, index]);

  /* Per-activity countdown timer that auto-advances the card */
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        advanceDraft(activity.id);
        setJustCompleted(activity.id);
        setTimeout(() => setJustCompleted(null), 1100);
        if (index + 1 < activities.length) {
          setIndex((i) => i + 1);
          return activities[index + 1].seconds;
        }
        finish();
        return 0;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, index, activity, activities, advanceDraft, finish]);

  const overall = ((index + (activity.seconds - remaining) / activity.seconds) / activities.length) * 100;
  const activityProgress = ((activity.seconds - remaining) / activity.seconds) * 100;
  const child = detections.find((d) => d.role === "child");

  const labels = running
    ? [
        child ? `Face detected · ${Math.round(child.confidence * 100)}%` : "Searching for faces…",
        metrics.eyeContact > 55 ? "Eye contact detected" : "Tracking gaze…",
        (child?.smile ?? 0) > 0.6 ? "Smile detected" : null,
        metrics.pointing ? "Pointing gesture" : null,
        metrics.voiceActivity > 22 ? "Voice activity" : null,
      ].filter(Boolean).slice(0, 4) as string[]
    : [];

  return (
    <div className="min-h-screen bg-background px-3 pb-10 pt-4 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* ---------------- LEFT: camera stage + AI overlays ---------------- */}
        <div className="space-y-4">
          <Card className="gap-0 overflow-hidden rounded-3xl border-border/70 p-0 shadow-lift">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-foreground/90 sm:aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white/80">
                  <Video className="h-8 w-8" />
                  <p className="max-w-xs text-sm">
                    Camera preview unavailable — allow camera access to run live behaviour analysis.
                  </p>
                </div>
              )}

              <LiveOverlay detections={detections} recording={running} labels={labels} />

              {(running || phase === "complete") && (
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-white"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  {phase === "complete" ? "SAVED" : "LIVE"} · Activity {index + 1}/{activities.length}
                </div>
              )}

              <button
                type="button"
                onClick={() => setVoiceOn((v) => !v)}
                aria-label={voiceOn ? "Mute voice guidance" : "Unmute voice guidance"}
                className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
              >
                {voiceOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>

              {/* Live confidence HUD */}
              {running && (
                <div className="absolute bottom-3 right-3 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-right text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    AI confidence
                  </p>
                  <p className="text-xl font-semibold tabular-nums">
                    <AnimatedCounter value={metrics.confidence} suffix="%" />
                  </p>
                </div>
              )}

              <AnimatePresence>
                {phase === "countdown" && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-foreground/55"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.span
                      key={countdown}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-7xl font-semibold text-white"
                    >
                      {countdown === 0 ? "Go" : countdown}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {justCompleted && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.span
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: [0.4, 1.1, 1], opacity: 1 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/90 text-white shadow-glow"
                    >
                      <Check className="h-10 w-10" />
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>{band.label} · session progress</span>
                <span className="tabular-nums">{Math.round(overall)}%</span>
              </div>
              <Progress value={overall} className="h-2" />

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {phase === "ready" && (
                  <>
                    <Button size="lg" className="rounded-full px-7" onClick={() => setPhase("countdown")}>
                      <CircleDot className="h-4 w-4" /> Start live analysis
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => navigate({ to: "/assessment/$bandId/guide", params: { bandId } })}
                    >
                      Practice without recording
                    </Button>
                  </>
                )}
                {running && (
                  <>
                    <Button size="lg" className="rounded-full px-7" onClick={markDone}>
                      <Check className="h-4 w-4" />
                      {index + 1 < activities.length ? "Done — next activity" : "Done — finish"}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => engineRef.current?.markPrompt("Name called")}
                    >
                      <Megaphone className="h-4 w-4" /> Mark prompt
                    </Button>
                    <Button size="lg" variant="ghost" className="rounded-full" onClick={finish}>
                      Finish session
                    </Button>
                  </>
                )}
                {phase === "complete" && (
                  <>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setIndex(0);
                        setRemaining(activities[0].seconds);
                        setMetrics(EMPTY_METRICS);
                        setEvents([]);
                        setCountdown(3);
                        setPhase("ready");
                      }}
                    >
                      <X className="h-4 w-4" /> Retake
                    </Button>
                    <Button
                      size="lg"
                      className="rounded-full px-7"
                      disabled={!activeChild}
                      onClick={() => {
                        if (!activeChild) return;
                        const result = buildResultFromLiveSession({
                          metrics,
                          quality,
                          events,
                          ageBandId: bandId as AgeBandId,
                          childId: activeChild.id,
                          durationSec: activities.reduce((a, x) => a + x.seconds, 0),
                        });
                        saveResult(result);
                        void persistResult(result).then((outcome) => {
                          if (!outcome.persisted) {
                            toast.warning("Saved on this device only.", {
                              description: outcome.reason,
                            });
                          }
                        });
                        void celebrate();
                        navigate({ to: "/results/$resultId", params: { resultId: result.id } });
                      }}
                    >
                      <Sparkles className="h-4 w-4" /> Save session result
                    </Button>
                  </>
                )}
              </div>
              {!isVoiceSupported() && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Voice guidance is unavailable in this browser — on-screen instructions stay in sync.
                </p>
              )}
            </div>
          </Card>

          {/* Guided activity card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.99 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="gap-0 rounded-3xl border-primary/25 bg-gradient-surface p-6 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Activity {index + 1} of {activities.length}
                    </p>
                    <h2 className="mt-1.5 text-lg font-semibold tracking-tight">{activity.title}</h2>
                  </div>
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 40 40" className="absolute h-16 w-16 -rotate-90">
                      <circle cx="20" cy="20" r="17" className="fill-none stroke-secondary" strokeWidth="4" />
                      <circle
                        cx="20"
                        cy="20"
                        r="17"
                        className="fill-none stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 17}
                        strokeDashoffset={(2 * Math.PI * 17 * (100 - activityProgress)) / 100}
                      />
                    </svg>
                    <span className="font-mono text-sm font-semibold tabular-nums">{remaining}s</span>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{activity.instruction}</p>
                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-accent/10 p-3.5 text-xs text-muted-foreground">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  {activity.tip}
                </div>
                <button
                  type="button"
                  onClick={() => speak(activity.audioScript)}
                  className="mt-4 inline-flex items-center gap-2 self-start rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium transition-colors hover:bg-secondary"
                >
                  <Mic className="h-3.5 w-3.5 text-primary" /> Repeat voice instruction
                </button>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---------------- RIGHT: real-time AI dashboard ---------------- */}
        <div className="space-y-4">
          {phase === "ready" ? (
            <QualityPreflight quality={quality} />
          ) : (
            <LiveMetricsPanel m={metrics} fps={fps} />
          )}

          <AIStatusPipeline active={running} tick={stageTick} />
          <ModelStackPanel active={running} />
          <LiveEventTimeline events={events} />

          {phase === "complete" && (
            <Card className="gap-0 rounded-3xl border-border/70 p-4 shadow-soft">
              <h3 className="text-sm font-semibold tracking-tight">Raw AI observations</h3>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["Eye contacts", `${metrics.eyeContacts}`],
                  ["Head turns", `${metrics.headTurns}`],
                  ["Smiles", `${metrics.smiles}`],
                  ["Pointing", `${metrics.pointingCount}`],
                  ["Reaches", `${metrics.reaches}`],
                  ["Vocalisations", `${metrics.vocalisations}`],
                  ["Mutual gaze", `${metrics.mutualGazeSec.toFixed(1)} s`],
                  ["Average latency", `${(metrics.responseLatencyMs / 1000).toFixed(2)} s`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl border border-border/60 bg-gradient-surface p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {k}
                    </dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          <Card className="gap-0 rounded-3xl border-border/70 p-4 shadow-soft">
            <h3 className="text-sm font-semibold tracking-tight">Analysis engine</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Vision adapter <span className="font-medium text-foreground">{adapters.vision}</span> · audio
              adapter <span className="font-medium text-foreground">{adapters.audio}</span>. Metrics are
              measured from live frames and microphone samples; adapters can be swapped for MediaPipe,
              TensorFlow, OpenCV or a cloud vision endpoint without UI changes.
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              {SCREENING_DISCLAIMER}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}