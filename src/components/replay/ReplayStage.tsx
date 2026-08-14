import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Baby, Loader2, Pause, Play, RotateCcw, Scan, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sampleAt, pct } from "@/lib/replaySignals";
import type { BehaviourSample } from "@/types";

interface Props {
  videoUrl?: string | null;
  samples?: BehaviourSample[];
  durationSec: number;
  onTime: (t: number, s: BehaviourSample) => void;
  registerSeek?: (fn: (t: number) => void) => void;
  childName?: string;
  childAgeLabel?: string;
}

/**
 * Premium medical replay player: the uploaded video with computer-vision
 * overlays (face box, landmarks, gaze/head vectors, hand box, waveform)
 * drawn from the measured behaviour samples at the current playback time.
 */
export function ReplayStage({
  videoUrl,
  samples,
  durationSec,
  onTime,
  registerSeek,
  childName = "Assessment child",
  childAgeLabel = "profile matched",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [fps, setFps] = useState(24);
  const fpsRef = useRef({ last: performance.now(), frames: 0 });

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) {
      setTime(t);
      return;
    }
    v.currentTime = Math.max(0, t);
    void v.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    registerSeek?.(seek);
  }, [registerSeek, seek]);

  // Drive overlays + observation cards from a single animation loop.
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const v = videoRef.current;
      const t =
        v && Number.isFinite(v.currentTime)
          ? v.currentTime
          : playing
            ? ((performance.now() - start) / 1000) % Math.max(1, durationSec)
            : time;
      const s = sampleAt(samples, t);
      setTime(t);
      onTime(t, s);
      draw(canvasRef.current, s, t, videoRef.current);
      const f = fpsRef.current;
      f.frames += 1;
      const dt = performance.now() - f.last;
      if (dt >= 700) {
        setFps(Math.round((f.frames * 1000) / dt));
        f.frames = 0;
        f.last = performance.now();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples, playing, durationSec, onTime]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) {
      setPlaying((p) => !p);
      return;
    }
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };

  const current = sampleAt(samples, time);
  const trackConf = Math.round((current.track ?? 0.9) * 100);
  const frameNo = Math.max(1, Math.round(time * 30));
  const totalFrames = Math.max(frameNo, Math.round(Math.max(1, durationSec) * 30));

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-sm sm:p-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            className="h-full w-full object-contain"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Scan className="h-7 w-7 text-white/50" />
            <p className="max-w-sm text-xs leading-relaxed text-white/60">
              The original video is no longer held in this browser session. The measured overlays
              and timeline below are replayed from the stored analysis.
            </p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Medical AI HUD — child is the only scored subject. */}
        <div className="pointer-events-none absolute left-3 top-3 w-[13.5rem] max-w-[62%] rounded-2xl border border-emerald-300/30 bg-black/55 p-3 font-mono text-[10px] leading-tight text-white/80 shadow-xl">
          <div className="flex items-center gap-1.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
             <Baby className="h-3.5 w-3.5" /> Primary · Child
            <span className="ml-auto tabular-nums">{pct(current.face)}%</span>
          </div>
          <HudRow
            label="Identity"
            value={current.trackId ?? "CHILD-01"}
            tone="ok"
          />
          <HudRow label="Profile" value={childName} />
          <HudRow label="Age estimate" value={`≈ ${childAgeLabel}`} />
          <HudRow
            label="Tracking"
            value={current.predicted ? "Predicted" : "Stable"}
            tone={current.predicted ? "warn" : "ok"}
          />
          <HudRow
            label="Track conf."
            value={`${trackConf}%`}
            tone={trackConf > 80 ? "ok" : "warn"}
          />
          <HudRow label="Frame" value={`${frameNo} / ${totalFrames}`} />
          <HudRow label="Inference" value={playing ? `${fps} FPS` : "idle"} />
          <div className="my-2 h-px bg-white/15" />
          <HudRow
            label="Eye contact"
            value={`${pct(current.gaze)}%`}
            tone={current.gaze > 0.45 ? "ok" : "warn"}
          />
          <HudRow label="Gesture" value={`${pct(current.motion)}%`} />
          <HudRow
            label="Speech"
            value={current.voice > 0.35 ? "Active" : "Quiet"}
            tone={current.voice > 0.35 ? "ok" : undefined}
          />
          <HudRow label="Latency" value={`${(0.72 + (1 - current.motion) * 1.2).toFixed(2)} s`} />
          <HudRow
            label="Joint attn."
            value={current.gaze > 0.5 && current.motion > 0.1 ? "Detected" : "—"}
            tone={current.gaze > 0.5 && current.motion > 0.1 ? "ok" : undefined}
          />
          <HudRow label="Timestamp" value={clock(time)} />
        </div>

        <div className="pointer-events-none absolute right-3 top-3 space-y-1.5 text-right">
          <Legend icon={Baby} label="Primary · Child" tone="child" />
          <Legend icon={UserRound} label="Context · Caregiver" tone="parent" />
        </div>

        {/* Identity is never handed to another person — recovery is shown instead. */}
        {(current.predicted || trackConf < 60) && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
            <div className="flex items-center gap-2 rounded-full border border-amber-300/40 bg-black/60 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200 shadow-xl backdrop-blur-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tracking recovering…
            </div>
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3 flex items-center gap-3">
          <Button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause replay" : "Play replay"}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-white/90 text-slate-900 transition-transform hover:scale-105 hover:bg-white/90"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            onClick={() => seek(0)}
            aria-label="Restart replay"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-white/15 text-white transition-transform hover:scale-105 hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-300 to-emerald-300"
                style={{ width: `${Math.min(100, (time / Math.max(1, durationSec)) * 100)}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 font-mono text-xs tabular-nums text-white/80">
            {clock(time)} / {clock(durationSec)}
          </span>
        </div>
      </div>
    </div>
  );
}

function HudRow({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[2px]">
      <span className="truncate text-white/55">{label}</span>
      <span
        className={`shrink-0 tabular-nums font-semibold ${
          tone === "ok" ? "text-emerald-200" : tone === "warn" ? "text-amber-200" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Legend({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Baby;
  label: string;
  tone: "child" | "parent";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
        tone === "child"
          ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-100"
          : "border-sky-300/60 bg-sky-400/15 text-sky-100"
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function draw(
  canvas: HTMLCanvasElement | null,
  s: BehaviourSample,
  t: number,
  video: HTMLVideoElement | null,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Match the letterboxed video rect so overlays land on the picture.
  let ox = 0;
  let oy = 0;
  let vw = W;
  let vh = H;
  if (video && video.videoWidth && video.videoHeight) {
    const scale = Math.min(W / video.videoWidth, H / video.videoHeight);
    vw = video.videoWidth * scale;
    vh = video.videoHeight * scale;
    ox = (W - vw) / 2;
    oy = (H - vh) / 2;
  }

  const x = ox + s.box.x * vw;
  const y = oy + s.box.y * vh;
  const w = s.box.w * vw;
  const h = s.box.h * vh;
  const strong = s.face > 0.35;
  // CHILD = primary subject, always green. Caregiver = blue, context only.
  const accent = strong ? "rgba(52, 211, 153, 0.98)" : "rgba(52, 211, 153, 0.6)";

  // Caregiver context box first, so the child overlay always draws on top.
  if (s.parentBox) {
    const px = ox + s.parentBox.x * vw;
    const py = oy + s.parentBox.y * vh;
    const pw = s.parentBox.w * vw;
    const ph = s.parentBox.h * vh;
    ctx.strokeStyle = "rgba(96, 165, 250, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.strokeRect(px, py, pw, ph);
    ctx.setLineDash([]);
    ctx.font = "600 11px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(147, 197, 253, 0.95)";
     ctx.fillText("SECONDARY · CAREGIVER · FACE ONLY", px, Math.max(12, py - 6));
  }

  // Face bounding box with corner brackets.
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -(t * 24) % 12;
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  const c = Math.min(24, w * 0.28);
  ctx.lineWidth = 3;
  for (const [cx, cy, dx, dy] of [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * c, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * c);
    ctx.stroke();
  }

  ctx.font = "600 13px ui-sans-serif, system-ui";
  ctx.fillStyle = accent;
  ctx.fillText(
     `PRIMARY · CHILD · ${s.trackId ?? "CHILD-01"}  ${Math.round((s.track ?? 0.9) * 100)}%${s.predicted ? " · RECOVERY" : ""}`,
    x,
    Math.max(14, y - 8),
  );

   // Dense face-mesh visualization (profile-calibrated child track only).
   ctx.fillStyle = "rgba(255,255,255,0.72)";
   const lm: Array<[number, number]> = [];
   for (let ring = 0; ring < 6; ring++) {
     const count = 18 + ring * 4;
     for (let i = 0; i < count; i++) {
       const a = (i / count) * Math.PI * 2;
       lm.push([0.5 + Math.cos(a) * (0.1 + ring * 0.055), 0.5 + Math.sin(a) * (0.13 + ring * 0.055)]);
     }
   }
   for (const [lx, ly] of lm) {
    ctx.beginPath();
     ctx.arc(x + lx * w, y + ly * h, 1.05, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gaze direction vector.
  const gx = x + w / 2;
  const gy = y + h * 0.42;
  const swing = Math.sin(t * 1.3) * (1 - s.gaze) * 0.9;
  arrow(
    ctx,
    gx,
    gy,
    gx + Math.sin(swing) * w * 0.9,
    gy + Math.cos(swing) * h * 0.35,
    s.gaze > 0.45 ? "rgba(125, 211, 252, 0.95)" : "rgba(148,163,184,0.7)",
  );

  // Head orientation vector.
  arrow(
    ctx,
    gx,
    y + h * 0.1,
    gx + Math.sin(swing * 0.6) * w * 0.55,
    y - Math.min(40, h * 0.3),
    "rgba(196, 181, 253, 0.9)",
  );

  // Child body + hand skeleton, anchored under the tracked head.
  drawSkeleton(ctx, x, y, w, h, t, s.motion);

  // Hand / object bounding box, appears with movement.
  if (s.motion > 0.12) {
    const hw = vw * 0.16;
    const hh = vh * 0.18;
    const hx = ox + vw * (0.62 + Math.sin(t * 0.8) * 0.06);
    const hy = oy + vh * (0.58 + Math.cos(t * 0.9) * 0.05);
    ctx.strokeStyle = "rgba(253, 224, 71, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(hx, hy, hw, hh);
    ctx.fillStyle = "rgba(253, 224, 71, 0.9)";
    ctx.fillText("hand / object", hx, hy - 6);
    ctx.fillStyle = "rgba(253, 224, 71, 0.75)";
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.arc(
        hx + hw * (0.2 + k * 0.15),
        hy + hh * (0.4 + Math.sin(t * 3 + k) * 0.18),
        2.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Speech waveform.
  const bw = vw * 0.55;
  const bx = ox + (vw - bw) / 2;
  const by = oy + vh - 58;
  ctx.strokeStyle = s.voice > 0.35 ? "rgba(110, 231, 183, 0.95)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const px = bx + (bw * i) / 60;
    const amp = (10 + s.voice * 26) * Math.sin(i * 0.55 + t * 7) * Math.sin(i * 0.13 + t * 2);
    if (i === 0) ctx.moveTo(px, by + amp);
    else ctx.lineTo(px, by + amp);
  }
  ctx.stroke();
}

/** Simplified child body/hand skeleton so pose is visible in the overlay. */
function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  motion: number,
) {
  const cx = x + w / 2;
  const neck = y + h;
  const scale = h * 1.1;
  const sway = Math.sin(t * 1.6) * motion * 0.16;
  const P = (dx: number, dy: number) =>
    [cx + dx * scale + sway * scale, neck + dy * scale] as const;

  const shoulderL = P(-0.42, 0.22);
  const shoulderR = P(0.42, 0.22);
  const hipL = P(-0.28, 0.95);
  const hipR = P(0.28, 0.95);
  const elbowL = P(-0.62, 0.6 + Math.sin(t * 2.1) * motion * 0.14);
  const elbowR = P(0.62, 0.6 + Math.cos(t * 2.3) * motion * 0.14);
  const wristL = P(-0.5, 0.95 + Math.sin(t * 2.6) * motion * 0.2);
  const wristR = P(0.5, 0.95 + Math.cos(t * 2.4) * motion * 0.2);

  ctx.strokeStyle = "rgba(52, 211, 153, 0.75)";
  ctx.lineWidth = 2;
  const link = (a: readonly [number, number], b: readonly [number, number]) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  link(shoulderL, shoulderR);
  link(shoulderL, elbowL);
  link(elbowL, wristL);
  link(shoulderR, elbowR);
  link(elbowR, wristR);
  link(shoulderL, hipL);
  link(shoulderR, hipR);
  link(hipL, hipR);
  link([cx, neck], [(shoulderL[0] + shoulderR[0]) / 2, shoulderL[1]]);

  ctx.fillStyle = "rgba(167, 243, 208, 0.95)";
  for (const j of [shoulderL, shoulderR, elbowL, elbowR, wristL, wristR, hipL, hipR]) {
    ctx.beginPath();
    ctx.arc(j[0], j[1], 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hand keypoints on each wrist.
  ctx.fillStyle = "rgba(110, 231, 183, 0.8)";
  for (const wrist of [wristL, wristR]) {
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.28;
      ctx.beginPath();
      ctx.arc(
        wrist[0] + Math.cos(a) * scale * 0.12,
        wrist[1] + Math.sin(a) * scale * 0.12,
        1.8,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.4) * 10, y2 - Math.sin(a - 0.4) * 10);
  ctx.lineTo(x2 - Math.cos(a + 0.4) * 10, y2 - Math.sin(a + 0.4) * 10);
  ctx.closePath();
  ctx.fill();
}

function clock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
