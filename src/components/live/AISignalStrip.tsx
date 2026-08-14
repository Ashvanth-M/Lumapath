import { motion } from "motion/react";
import { Ear, Eye, Hand, ScanFace, Timer } from "lucide-react";
import type { LiveSignals } from "@/lib/liveSignals";

const ITEMS = [
  { key: "faceDetection", label: "Face Detection", icon: ScanFace },
  { key: "eyeContact", label: "Eye Contact", icon: Eye },
  { key: "speech", label: "Speech Listening", icon: Ear },
  { key: "gesture", label: "Gesture Detection", icon: Hand },
] as const;

export function AISignalStrip({ signals, active }: { signals: LiveSignals; active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2">
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const value = signals[key];
        const on = active && value > 45;
        return (
          <motion.span
            key={key}
            layout
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm"
          >
            <motion.span
              className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-400" : "bg-white/40"}`}
              animate={on ? { opacity: [1, 0.3, 1] } : { opacity: 0.5 }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="tabular-nums text-white/70">{active ? `${Math.round(value)}%` : "—"}</span>
          </motion.span>
        );
      })}
      <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
        <Timer className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Response latency</span>
        <span className="tabular-nums text-white/70">{active ? `${signals.latencyMs} ms` : "—"}</span>
      </span>
    </div>
  );
}