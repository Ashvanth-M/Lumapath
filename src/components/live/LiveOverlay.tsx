import { motion } from "motion/react";
import type { LiveDetection } from "@/services/ai/liveVision.service";

/**
 * Vector overlay drawn on top of the live camera preview: bounding boxes,
 * tracking IDs, eye dots, head-pose vector and a hand skeleton.
 */
export function LiveOverlay({
  detections,
  recording,
  labels,
}: {
  detections: LiveDetection[];
  recording: boolean;
  labels: string[];
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {detections.map((d) => {
          const child = d.role === "child";
          const stroke = child ? "oklch(0.78 0.19 150)" : "oklch(0.72 0.14 250)";
          const x = d.box.x * 100;
          const y = d.box.y * 100;
          const w = d.box.w * 100;
          const h = d.box.h * 100;
          return (
            <g key={d.trackId}>
              <motion.rect
                animate={{ x, y, width: w, height: h }}
                transition={{ duration: 0.18, ease: "linear" }}
                rx={1.6}
                fill="none"
                stroke={stroke}
                strokeWidth={child ? 0.7 : 0.5}
                strokeDasharray={child ? undefined : "2 1.4"}
                vectorEffect="non-scaling-stroke"
              />
              {d.face && (
                <motion.rect
                  animate={{
                    x: d.face.x * 100,
                    y: d.face.y * 100,
                    width: d.face.w * 100,
                    height: d.face.h * 100,
                  }}
                  transition={{ duration: 0.18, ease: "linear" }}
                  rx={1}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={0.5}
                  strokeWidth={0.35}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {/* eye tracking dots */}
              {d.eyes.map((e, i) => (
                <motion.circle
                  key={i}
                  animate={{ cx: e.x * 100, cy: e.y * 100 }}
                  transition={{ duration: 0.18, ease: "linear" }}
                  r={0.8}
                  fill={stroke}
                />
              ))}
              {/* head pose vector */}
              {d.face && (
                <motion.line
                  animate={{
                    x1: (d.face.x + d.face.w / 2) * 100,
                    y1: (d.face.y + d.face.h * 0.5) * 100,
                    x2: (d.face.x + d.face.w / 2) * 100 + d.yaw * 0.22,
                    y2: (d.face.y + d.face.h * 0.5) * 100 + 6,
                  }}
                  transition={{ duration: 0.2 }}
                  stroke={stroke}
                  strokeWidth={0.45}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {/* hand skeleton */}
              {d.handEnergy > 0.18 &&
                d.hands.map((p, i) => (
                  <g key={`h${i}`}>
                    <motion.circle
                      animate={{ cx: p.x * 100, cy: p.y * 100 }}
                      transition={{ duration: 0.2 }}
                      r={1.1}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={0.35}
                      vectorEffect="non-scaling-stroke"
                    />
                    <motion.line
                      animate={{
                        x1: p.x * 100,
                        y1: p.y * 100,
                        x2: (d.box.x + d.box.w / 2) * 100,
                        y2: (d.box.y + d.box.h * 0.55) * 100,
                      }}
                      transition={{ duration: 0.2 }}
                      stroke={stroke}
                      strokeOpacity={0.55}
                      strokeWidth={0.3}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ))}
            </g>
          );
        })}
      </svg>

      {/* Tracking ID chips anchored to each detection */}
      {detections.map((d) => (
        <motion.span
          key={`${d.trackId}-chip`}
          animate={{ left: `${d.box.x * 100}%`, top: `${Math.max(0, d.box.y * 100 - 6)}%` }}
          transition={{ duration: 0.2, ease: "linear" }}
          className={`absolute rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-tight text-white ${
            d.role === "child" ? "bg-[oklch(0.62_0.16_150)]" : "bg-[oklch(0.55_0.13_255)]"
          }`}
        >
          {d.trackId} · {Math.round(d.confidence * 100)}%
        </motion.span>
      ))}

      {/* Scanning sweep */}
      {recording && (
        <motion.div
          className="absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-primary/25 to-transparent"
          animate={{ y: ["-8%", "108%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Live detection labels */}
      <div className="absolute left-3 top-12 flex max-w-[70%] flex-col items-start gap-1.5">
        {labels.map((l) => (
          <motion.span
            key={l}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-md border border-[oklch(0.78_0.19_150)]/40 bg-black/45 px-2 py-1 text-[11px] font-medium text-[oklch(0.88_0.16_150)]"
          >
            {l}
          </motion.span>
        ))}
      </div>
    </div>
  );
}