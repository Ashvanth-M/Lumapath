import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Info, RotateCcw, Square, TriangleAlert, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getStandardActivity } from "@/constants/screening";
import { setVideoSession } from "@/lib/videoSession";
import { isRecordingSupported, startRecording, type RecorderHandle } from "@/lib/recorder";
import { probeVideo } from "@/services/ai/behaviourAnalysis.service";

export const Route = createFileRoute("/screening/$activityId/record")({
  head: () => ({
    meta: [
      { title: "Record the activity — LumaPath AI" },
      {
        name: "description",
        content:
          "Record the standardised parent–child interaction directly in your browser, then send it straight to analysis.",
      },
      { property: "og:title", content: "Record the activity — LumaPath AI" },
      { property: "og:description", content: "Record a standardised interaction activity." },
    ],
  }),
  component: RecordPage,
});

type Phase = "idle" | "countdown" | "recording" | "processing";

function RecordPage() {
  const { activityId } = Route.useParams();
  const activity = getStandardActivity(activityId);
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<RecorderHandle | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const target = activity.recommendedSeconds;
  const supported = isRecordingSupported();

  // Release the camera if the parent navigates away mid-recording.
  useEffect(() => () => handleRef.current?.cancel(), []);

  const finish = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) return;
    setPhase("processing");
    try {
      const file = await handle.stop();
      handleRef.current = null;
      const probe = await probeVideo(file);
      const objectUrl = URL.createObjectURL(file);
      setVideoSession({ file, objectUrl, probe, activityId });
      navigate({ to: "/screening/$activityId/subject", params: { activityId } });
    } catch (e) {
      setPhase("idle");
      setElapsed(0);
      setError(e instanceof Error ? e.message : "The recording could not be saved.");
    }
  }, [activityId, navigate]);

  // Countdown before capture starts.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      void begin();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  // Elapsed timer; auto-stops once the activity's recommended length is reached.
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= target) {
          void finish();
          return target;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, target, finish]);

  async function begin() {
    try {
      const handle = await startRecording();
      handleRef.current = handle;
      if (videoRef.current) {
        videoRef.current.srcObject = handle.stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setElapsed(0);
      setPhase("recording");
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : "The camera could not be started.");
      toast.error("Could not start recording.");
    }
  }

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <AppShell
      title={`Record: ${activity.title}`}
      subtitle={`About ${target} seconds. Keep your child's face in frame and the room quiet.`}
    >
      <div className="mx-auto max-w-2xl">
        {!supported && (
          <Card className="mb-6 flex-row items-start gap-3 rounded-2xl border-warning/30 bg-warning/5 p-5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              This browser cannot record video. Record with your phone&apos;s camera app instead,
              then upload the file — the analysis is identical.
            </p>
          </Card>
        )}

        <Card className="gap-0 overflow-hidden rounded-3xl border-border/70 p-0 shadow-lift">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-foreground/90 sm:aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white/85">
                <Video className="h-8 w-8" />
                <p className="max-w-sm text-sm leading-relaxed">{activity.setup[0]}</p>
              </div>
            )}

            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/35" />

            {phase === "recording" && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
                <motion.span
                  className="h-2 w-2 rounded-full bg-white"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                REC {mmss}
              </div>
            )}

            {phase === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/50">
                <motion.span
                  key={countdown}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-7xl font-semibold text-white"
                >
                  {countdown === 0 ? "Go" : countdown}
                </motion.span>
              </div>
            )}
          </div>

          <div className="p-6">
            {phase === "recording" && (
              <Progress value={(elapsed / target) * 100} className="mb-5 h-2" />
            )}

            {error && (
              <p className="mb-4 flex items-start gap-2 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {phase === "idle" && (
                <>
                  <Button
                    size="lg"
                    className="rounded-xl"
                    disabled={!supported}
                    onClick={() => {
                      setError(null);
                      setCountdown(3);
                      setPhase("countdown");
                    }}
                  >
                    <Circle className="h-4 w-4 fill-current" /> Start recording
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() =>
                      navigate({ to: "/screening/$activityId/upload", params: { activityId } })
                    }
                  >
                    <Upload className="h-4 w-4" /> Upload a file instead
                  </Button>
                </>
              )}

              {phase === "recording" && (
                <>
                  <Button size="lg" className="rounded-xl" onClick={() => void finish()}>
                    <Square className="h-4 w-4 fill-current" /> Stop and analyse
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="rounded-xl"
                    onClick={() => {
                      handleRef.current?.cancel();
                      handleRef.current = null;
                      setPhase("idle");
                      setElapsed(0);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" /> Discard
                  </Button>
                </>
              )}

              {phase === "processing" && (
                <p className="text-sm text-muted-foreground">Saving the recording…</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="mt-6 flex-row items-start gap-3 rounded-2xl border-primary/20 bg-primary/5 p-5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">{activity.purpose}</p>
            <ul className="mt-2 space-y-1">
              {activity.setup.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
