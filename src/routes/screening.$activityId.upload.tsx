import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import {
  AudioLines,
  CheckCircle2,
  Clock,
  FileVideo,
  Monitor,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getStandardActivity } from "@/constants/screening";
import { probeVideo } from "@/services/ai/behaviourAnalysis.service";
import { setVideoSession } from "@/lib/videoSession";
import type { VideoProbe } from "@/types";

export const Route = createFileRoute("/screening/$activityId/upload")({
  head: () => ({
    meta: [
      { title: "Upload interaction video — LumaPath AI" },
      {
        name: "description",
        content: "Upload your recorded parent–child interaction video. We check duration, resolution and audio before analysis.",
      },
      { property: "og:title", content: "Upload interaction video — LumaPath AI" },
      { property: "og:description", content: "Upload a parent–child interaction video for AI behavioural analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

const QUALITY_TONE: Record<VideoProbe["quality"], string> = {
  excellent: "bg-success/10 text-success",
  good: "bg-success/10 text-success",
  acceptable: "bg-warning/10 text-warning",
  poor: "bg-destructive/10 text-destructive",
};

function UploadPage() {
  const { activityId } = Route.useParams();
  const activity = getStandardActivity(activityId);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<"idle" | "reading" | "ready">("idle");
  const [probe, setProbe] = useState<VideoProbe | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function accept(f: File) {
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|avi|webm|m4v)$/i.test(f.name)) {
      toast.error("Please choose an MP4, MOV, AVI or WebM video.");
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      toast.error("That file is over 500 MB. Please trim the recording first.");
      return;
    }
    setState("reading");
    setProgress(8);
    const tick = setInterval(() => setProgress((p) => Math.min(92, p + 6)), 70);
    try {
      const p = await probeVideo(f);
      clearInterval(tick);
      setProgress(100);
      setProbe(p);
      setFile(f);
      setState("ready");
      const objectUrl = URL.createObjectURL(f);
      setVideoSession({ file: f, objectUrl, probe: p, activityId });
      toast.success("Video read successfully.");
    } catch (e) {
      clearInterval(tick);
      setState("idle");
      setProgress(0);
      toast.error(e instanceof Error ? e.message : "That video could not be read.");
    }
  }

  return (
    <AppShell title={`Upload · ${activity.title}`} subtitle={activity.purpose}>
      <div className="mx-auto grid max-w-4xl gap-6">
        <Card
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void accept(f);
          }}
          className={`relative items-center gap-0 overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border/80"
          }`}
        >
          <motion.span
            animate={{ y: state === "reading" ? [-4, 4, -4] : 0 }}
            transition={{ repeat: state === "reading" ? Infinity : 0, duration: 1.4 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          >
            <UploadCloud className="h-7 w-7" />
          </motion.span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight">
            {state === "ready" ? "Video ready for analysis" : "Drop your interaction video here"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            MP4, MOV, AVI or WebM · up to 500 MB · ideally {activity.recommendedSeconds}s or longer.
            The file is read in your browser and never leaves this device until you share a report.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void accept(f);
            }}
          />
          <Button className="mt-6 rounded-xl" onClick={() => inputRef.current?.click()}>
            <FileVideo className="h-4 w-4" /> Choose video file
          </Button>

          <AnimatePresence>
            {state !== "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 w-full max-w-md"
              >
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {state === "reading" ? "Reading video metadata…" : `${file?.name} · verified`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {probe && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h3 className="min-w-0 truncate text-base font-semibold">Video quality check</h3>
                <Badge className={`shrink-0 rounded-full capitalize ${QUALITY_TONE[probe.quality]}`}>
                  {probe.quality}
                </Badge>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Meta icon={Clock} label="Duration" value={`${probe.durationSec.toFixed(1)} s`} />
                <Meta icon={Monitor} label="Resolution" value={`${probe.width}×${probe.height}`} />
                <Meta
                  icon={AudioLines}
                  label="Audio track"
                  value={probe.hasAudio ? "Detected" : "Not detected"}
                />
                <Meta
                  icon={FileVideo}
                  label="File size"
                  value={`${(probe.sizeBytes / 1024 / 1024).toFixed(1)} MB`}
                />
              </dl>

              <ul className="mt-5 space-y-2">
                {probe.qualityNotes.map((n) => {
                  const warn = /low|short|no audio|long/i.test(n);
                  const Icon = warn ? TriangleAlert : CheckCircle2;
                  return (
                    <li key={n} className="flex gap-2.5 text-sm text-muted-foreground">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${warn ? "text-warning" : "text-success"}`} />
                      <span className="min-w-0">{n}</span>
                    </li>
                  );
                })}
              </ul>

              <Button
                size="lg"
                className="mt-6 w-full rounded-xl"
                onClick={() => navigate({ to: "/screening/$activityId/subject", params: { activityId } })}
              >
                Continue — select the child
              </Button>
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                AI-assisted screening tool. Not intended to replace clinical diagnosis.
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-surface p-4">
      <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </dt>
      <dd className="mt-1.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
