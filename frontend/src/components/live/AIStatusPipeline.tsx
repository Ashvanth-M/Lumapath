import { motion } from "motion/react";
import { Card } from "@/components/ui/card";

export const LIVE_AI_STAGES = [
  "Recording",
  "Analyzing face",
  "Analyzing eyes",
  "Analyzing audio",
  "Tracking head pose",
  "Detecting gestures",
  "Calculating Communication Matrix",
  "Generating behaviour metrics",
] as const;

/** Pulsing AI processing states, cycling while the session records. */
export function AIStatusPipeline({ active, tick }: { active: boolean; tick: number }) {
  const current = active ? tick % LIVE_AI_STAGES.length : -1;
  return (
    <Card className="gap-0 rounded-3xl border-border/70 p-4 shadow-soft">
      <h3 className="text-sm font-semibold tracking-tight">Live AI status</h3>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {LIVE_AI_STAGES.map((s, i) => {
          const on = i === current;
          const done = active && i < current;
          return (
            <li
              key={s}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition-colors ${
                on
                  ? "border-primary/40 bg-primary/10 font-medium text-primary"
                  : done
                    ? "border-border/60 bg-secondary/60 text-muted-foreground"
                    : "border-border/50 text-muted-foreground"
              }`}
            >
              <motion.span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? "bg-primary" : done ? "bg-success" : "bg-muted-foreground/40"}`}
                animate={on ? { scale: [1, 1.8, 1], opacity: [1, 0.4, 1] } : { scale: 1 }}
                transition={{ duration: 1.1, repeat: on ? Infinity : 0 }}
              />
              <span className="truncate">
                {s}
                {on ? "…" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}