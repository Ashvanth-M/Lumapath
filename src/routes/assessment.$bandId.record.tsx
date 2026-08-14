import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Circle, Pause, Play, RotateCcw, Square, Upload, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/assessment/$bandId/record")({
  head: () => ({
    meta: [
      { title: "Record the session — LumaPath AI" },
      { name: "description", content: "Record your child's guided session for AI communication analysis." },
      { property: "og:title", content: "Record the session — LumaPath AI" },
      { property: "og:description", content: "Record your child's guided session for AI analysis." },
    ],
  }),
  component: RecordScreen,
});

const TARGET_SECONDS = 45;

function RecordScreen() {
  const { bandId } = Route.useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "paused" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
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
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraReady(false));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= TARGET_SECONDS) {
          setState("done");
          return TARGET_SECONDS;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setState("recording");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 450);
    return () => clearTimeout(t);
  }, [countdown]);

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <AppShell title="Record the session" subtitle="Keep your child's face in frame and the room quiet.">
      <div className="mx-auto max-w-2xl">
        <Card className="gap-0 overflow-hidden rounded-3xl border-border/70 p-0 shadow-lift">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-foreground/90 sm:aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white/80">
                <Video className="h-8 w-8" />
                <p className="max-w-xs px-6 text-sm">
                  Camera preview unavailable. You can still walk through the flow — recording is simulated.
                </p>
              </div>
            )}

            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/35" />

            {state === "recording" && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
                <motion.span
                  className="h-2 w-2 rounded-full bg-white"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                REC {mmss}
              </div>
            )}

            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 ">
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
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Recording progress</span>
              <span>
                {mmss} / 00:45
              </span>
            </div>
            <Progress value={(elapsed / TARGET_SECONDS) * 100} className="h-2" />

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {state === "idle" && (
                <>
                  <Button size="lg" className="rounded-full px-7" onClick={() => setCountdown(3)}>
                    <Circle className="h-4 w-4 fill-current" /> Start recording
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => navigate({ to: "/assessment/$bandId/upload", params: { bandId } })}
                  >
                    <Upload className="h-4 w-4" /> Skip &amp; upload existing
                  </Button>
                </>
              )}
              {state === "recording" && (
                <>
                  <Button size="lg" variant="outline" className="rounded-full" onClick={() => setState("paused")}>
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                  <Button size="lg" className="rounded-full" onClick={() => setState("done")}>
                    <Square className="h-4 w-4 fill-current" /> Stop
                  </Button>
                </>
              )}
              {state === "paused" && (
                <>
                  <Button size="lg" className="rounded-full" onClick={() => setState("recording")}>
                    <Play className="h-4 w-4" /> Resume
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full" onClick={() => setState("done")}>
                    <Square className="h-4 w-4" /> Finish
                  </Button>
                </>
              )}
              {state === "done" && (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setElapsed(0);
                      setState("idle");
                      toast.info("Recording discarded — ready to retake");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" /> Retake
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-full px-7"
                    onClick={() => navigate({ to: "/assessment/$bandId/upload", params: { bandId } })}
                  >
                    <Upload className="h-4 w-4" /> Upload for analysis
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Video is encrypted in transit and at rest. You control who it is shared with.
        </p>
      </div>
    </AppShell>
  );
}