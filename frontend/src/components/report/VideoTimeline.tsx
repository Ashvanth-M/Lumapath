import { useRef, useState } from "react";
import { Eye, Hand, MessageCircle, Scan, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/types";

const KIND_ICON = {
  gaze: Eye,
  vocal: MessageCircle,
  gesture: Hand,
  social: Scan,
  attention: Sparkles,
} as const;

export function VideoTimeline({
  videoUrl,
  durationSec,
  events,
}: {
  videoUrl?: string | null;
  durationSec: number;
  events: TimelineEvent[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const jump = (i: number, at: number) => {
    setActive(i);
    const v = videoRef.current;
    if (v) {
      v.currentTime = Math.max(0, at);
      void v.play().catch(() => undefined);
    }
  };

  return (
    <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
      <h2 className="text-base font-semibold">Behaviour timeline</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every detected behaviour, timestamped against your recording. Tap a marker to jump there.
      </p>

      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
          className="mt-5 w-full rounded-2xl bg-black/90"
        />
      ) : (
        <p className="mt-5 rounded-2xl border border-border/70 bg-secondary/50 p-4 text-xs text-muted-foreground">
          The original video is no longer held in this browser session, so playback is unavailable.
          The timestamped observations below are preserved.
        </p>
      )}

      <div className="relative mt-6 h-2 rounded-full bg-secondary">
        {events.map((e, i) => (
          <button
            key={`${e.atSec}-${e.label}-${i}`}
            type="button"
            aria-label={`Jump to ${e.label} at ${e.atSec} seconds`}
            onClick={() => jump(i, e.atSec)}
            style={{ left: `${Math.min(98, (e.atSec / Math.max(1, durationSec)) * 100)}%` }}
            className={cn(
              "absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-background transition-transform hover:scale-125",
              active === i ? "bg-primary" : "bg-primary/50",
            )}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>0:00</span>
        <span>{formatClock(durationSec)}</span>
      </div>

      <ul className="mt-5 space-y-2">
        {events.map((e, i) => {
          const Icon = KIND_ICON[e.kind];
          return (
            <li key={`${e.atSec}-${e.label}-row-${i}`}>
              <button
                type="button"
                onClick={() => jump(i, e.atSec)}
                className={cn(
                  "grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                  active === i ? "border-primary/40 bg-primary/5" : "border-border/70 hover:bg-secondary/60",
                )}
              >
                <span className="shrink-0 font-mono text-xs tabular-nums text-primary">
                  {formatClock(e.atSec)}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{e.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function formatClock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
