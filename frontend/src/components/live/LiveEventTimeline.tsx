import { AnimatePresence, motion } from "motion/react";
import { AudioLines, Eye, Hand, Megaphone, MoveHorizontal, Smile, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { LiveEvent } from "@/services/ai/liveVision.service";

const ICONS = {
  prompt: Megaphone,
  gaze: Eye,
  head: MoveHorizontal,
  smile: Smile,
  gesture: Hand,
  voice: AudioLines,
  attention: Users,
} as const;

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Behavioural events generated live during recording. */
export function LiveEventTimeline({
  events,
  onSelect,
}: {
  events: LiveEvent[];
  onSelect?: (e: LiveEvent) => void;
}) {
  const shown = [...events].reverse().slice(0, 12);
  return (
    <Card className="gap-0 rounded-3xl border-border/70 p-4 shadow-soft">
      <h3 className="text-sm font-semibold tracking-tight">Live behaviour timeline</h3>
      {shown.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Events appear here as the AI detects behaviours.
        </p>
      )}
      <ol className="mt-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {shown.map((e) => {
            const Icon = ICONS[e.kind];
            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                layout
              >
                <button
                  type="button"
                  onClick={() => onSelect?.(e)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border/50 bg-card px-2.5 py-2 text-left text-xs transition-colors hover:bg-secondary"
                >
                  <span className="font-mono tabular-nums text-muted-foreground">{mmss(e.atSec)}</span>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate font-medium">{e.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Math.round(e.confidence * 100)}%
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </Card>
  );
}