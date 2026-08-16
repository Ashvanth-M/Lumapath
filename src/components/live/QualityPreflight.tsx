import { motion } from "motion/react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { QUALITY_CHECKS, type LiveQuality } from "@/services/ai/liveVision.service";

/** Automatic pre-recording capture-quality checks with actionable advice. */
export function QualityPreflight({ quality }: { quality: LiveQuality }) {
  const values = QUALITY_CHECKS.map((c) => ({ ...c, value: quality[c.key] }));
  const overall = Math.round(values.reduce((a, v) => a + v.value, 0) / values.length);
  const issues = values.filter((v) => v.value < 60);

  return (
    <Card className="gap-0 rounded-3xl border-border/70 p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Video quality analysis</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
            overall >= 70 ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"
          }`}
        >
          {overall}% ready
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {values.map((v) => (
          <li key={v.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {v.value >= 60 ? (
                  <CircleCheck className="h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
                )}
                <span className="truncate">{v.label}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className={`h-full rounded-full ${v.value >= 60 ? "bg-success" : "bg-warning"}`}
                  animate={{ width: `${v.value}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{v.value}%</span>
          </li>
        ))}
      </ul>

      {issues.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-2xl bg-warning/12 p-3">
          {issues.slice(0, 3).map((i) => (
            <p key={i.key} className="text-xs text-warning-foreground">
              {i.advice}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}