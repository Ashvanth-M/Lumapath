import { motion } from "motion/react";
import { Eye, Hand, MessageCircle, Scan, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BehaviourGroup } from "@/types";

const ICONS: Record<BehaviourGroup["key"], typeof Eye> = {
  faceHead: Scan,
  social: Eye,
  object: Hand,
  vocal: MessageCircle,
  timing: Timer,
};

export function BehaviourMetrics({ groups }: { groups: BehaviourGroup[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g, i) => {
        const Icon = ICONS[g.key];
        return (
          <motion.div
            key={g.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="h-full gap-0 rounded-2xl border-border/70 p-5 shadow-soft">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="min-w-0 truncate text-sm font-semibold">{g.title}</h3>
              </div>
              <dl className="mt-4 space-y-3.5">
                {g.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
                      <dt className="min-w-0 truncate text-xs text-muted-foreground">{m.label}</dt>
                      <dd className="shrink-0 text-sm font-semibold tabular-nums">{m.value}</dd>
                    </div>
                    <Progress value={m.pct} className="mt-1.5 h-1" />
                  </div>
                ))}
              </dl>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
