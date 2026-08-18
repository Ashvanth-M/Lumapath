import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MODEL_STACK, loadModelStack, runtimeInfo, statusOf } from "@/services/ml";

/** Displays the on-device model stack and its load status. */
export function ModelStackPanel({ active = false }: { active?: boolean }) {
  const [ready, setReady] = useState(false);
  const info = runtimeInfo();

  useEffect(() => {
    let alive = true;
    void loadModelStack().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card className="gap-0 rounded-3xl border-border/70 p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Cpu className="h-4 w-4 text-primary" /> AI model stack
        </h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {info.backend}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {MODEL_STACK.map((m, i) => {
          const status = ready ? (active ? "running" : "ready") : statusOf(m.id);
          return (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-border/60 bg-gradient-surface p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold tracking-tight">{m.name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    status === "running"
                      ? "bg-primary/15 text-primary"
                      : status === "ready"
                        ? "bg-accent/15 text-accent"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{m.task}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                {m.vendor} · {m.inputShape} → {m.outputShape} · {m.sizeMB} MB · {m.targetFps} fps
              </p>
            </motion.li>
          );
        })}
      </ul>

      <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
        Models run on-device for demonstration. AI-assisted screening tool — not intended to replace
        clinical diagnosis.
      </p>
    </Card>
  );
}