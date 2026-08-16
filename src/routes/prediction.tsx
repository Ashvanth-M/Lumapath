import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BrainCircuit, TrendingUp, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { DEMO_CHILD } from "@/services/mockData";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/prediction")({
  head: () => ({
    meta: [
      { title: "AI prediction — LumaPath AI" },
      {
        name: "description",
        content:
          "Forecast your child's communication trajectory over the next 6 months and see how practice frequency changes it.",
      },
      { property: "og:title", content: "AI prediction — LumaPath AI" },
      { property: "og:description", content: "Six-month communication trajectory forecasting." },
    ],
  }),
  component: PredictionPage,
});

function PredictionPage() {
  const child = useAppStore((s) => s.child) ?? DEMO_CHILD;
  const [sessions, setSessions] = useState(3);

  const base = 77;
  const projected = Math.min(97, Math.round(base + sessions * 3.1));
  const points = Array.from({ length: 7 }, (_, i) => Math.round(base + ((projected - base) * i) / 6));
  const risk = projected > 88 ? "low" : projected > 80 ? "moderate" : "watch";

  return (
    <AppShell
      title="AI prediction"
      subtitle={`Modelled six-month trajectory for ${child.name}, updated from every completed session.`}
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-lift">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
              <BrainCircuit className="h-4 w-4 text-primary" /> Projected communication index
            </h2>
            <Badge
              className={`rounded-full ${
                risk === "low"
                  ? "bg-success/15 text-success hover:bg-success/15"
                  : risk === "moderate"
                    ? "bg-accent/15 text-accent hover:bg-accent/15"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/10"
              }`}
            >
              {risk === "low" ? "On track" : risk === "moderate" ? "Monitor" : "Needs support"}
            </Badge>
          </div>

          <div className="mt-6 flex h-48 items-end gap-2">
            {points.map((p, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-xl bg-gradient-primary"
                initial={{ height: 0 }}
                animate={{ height: `${p}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            {["Now", "M1", "M2", "M3", "M4", "M5", "M6"].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>

          <div className="mt-7 rounded-2xl bg-gradient-surface p-5">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Guided sessions per week</span>
              <span className="tabular-nums text-primary">{sessions}</span>
            </div>
            <Slider
              value={[sessions]}
              min={1}
              max={6}
              step={1}
              onValueChange={(v) => setSessions(v[0])}
              className="mt-4"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              At {sessions} sessions per week the model projects an index of{" "}
              <strong className="text-foreground tabular-nums">{projected}</strong> in six months.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {[
            {
              icon: TrendingUp,
              title: "Strongest predicted gain",
              body: "Gesture-to-word transition improves fastest with pointing and naming repetition.",
            },
            {
              icon: TriangleAlert,
              title: "Watch signal",
              body: "Response latency above 1.4 s in noisy rooms — quieter sessions raise measurement quality.",
            },
          ].map((c) => (
            <Card key={c.title} className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
              <c.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold tracking-tight">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </Card>
          ))}

          <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
            <h3 className="text-sm font-semibold tracking-tight">Confidence</h3>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={71} className="h-2" />
              <span className="text-sm font-semibold tabular-nums">71%</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Confidence rises as more sessions are recorded. Screening support only — not a diagnosis.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}