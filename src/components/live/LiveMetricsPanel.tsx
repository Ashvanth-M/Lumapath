import { motion } from "motion/react";
import {
  Activity,
  AudioLines,
  Compass,
  Eye,
  Gauge,
  Hand,
  Hourglass,
  MessageCircle,
  Users,
  Smile,
  Sparkles,
  Timer,
} from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { Card } from "@/components/ui/card";
import type { LiveMetrics } from "@/services/ai/liveVision.service";

function Tile({
  icon: Icon,
  label,
  children,
  bar,
}: {
  icon: typeof Eye;
  label: string;
  children: React.ReactNode;
  bar?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{children}</p>
      {bar !== undefined && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      )}
    </div>
  );
}

/** Futuristic real-time metric wall shown beside the camera. */
export function LiveMetricsPanel({ m, fps }: { m: LiveMetrics; fps: number }) {
  return (
    <Card className="gap-0 rounded-3xl border-border/70 p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Real-time AI metrics</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
          {fps} fps
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        <Tile icon={Eye} label="Eye contact" bar={m.eyeContactPct}>
          <AnimatedCounter value={m.eyeContactPct} suffix="%" />
        </Tile>
        <Tile icon={Timer} label="Response latency">
          <AnimatedCounter value={m.responseLatencyMs / 1000} decimals={2} suffix="s" />
        </Tile>
        <Tile icon={Compass} label="Head orientation">
          <AnimatedCounter value={m.headOrientation} suffix="°" />
        </Tile>
        <Tile icon={AudioLines} label="Speech activity" bar={m.speechActivity}>
          <AnimatedCounter value={m.speechActivity} suffix="%" />
        </Tile>
        <Tile icon={MessageCircle} label="Voice activity" bar={m.voiceActivity}>
          <AnimatedCounter value={m.voiceActivity} suffix="%" />
        </Tile>
        <Tile icon={Activity} label="Vocalisations">
          <AnimatedCounter value={m.vocalisations} />
        </Tile>
        <Tile icon={Hand} label="Gestures">
          <AnimatedCounter value={m.gestureCount} />
        </Tile>
        <Tile icon={Hand} label="Pointing">
          {m.pointing ? "Detected" : `${m.pointingCount}×`}
        </Tile>
        <Tile icon={Users} label="Shared attention" bar={m.sharedAttention}>
          <AnimatedCounter value={m.sharedAttention} suffix="%" />
        </Tile>
        <Tile icon={Hourglass} label="Mutual gaze">
          <AnimatedCounter value={m.mutualGazeSec} decimals={1} suffix="s" />
        </Tile>
        <Tile icon={Smile} label="Smile duration">
          <AnimatedCounter value={m.smileSec} decimals={1} suffix="s" />
        </Tile>
        <Tile icon={Gauge} label="Attention score" bar={m.attentionScore}>
          <AnimatedCounter value={m.attentionScore} suffix="%" />
        </Tile>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-primary/25 bg-primary/8 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> AI confidence
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-primary">
            <AnimatedCounter value={m.confidence} suffix="%" />
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-gradient-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Behaviour score
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            <AnimatedCounter value={m.behaviourScore} />
          </p>
        </div>
      </div>
    </Card>
  );
}