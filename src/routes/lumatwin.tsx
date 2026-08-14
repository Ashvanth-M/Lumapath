import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Activity, Ear, Eye, Hand, MessageSquare, Sparkles } from "lucide-react";
import { useState } from "react";
import { LottiePulse } from "@/components/anim/LottiePulse";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEMO_CHILD } from "@/services/mockData";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/lumatwin")({
  head: () => ({
    meta: [
      { title: "LumaTwin digital twin — LumaPath AI" },
      {
        name: "description",
        content:
          "A living digital twin of your child's communication profile, updated after every screening session.",
      },
      { property: "og:title", content: "LumaTwin digital twin — LumaPath AI" },
      { property: "og:description", content: "A living model of your child's communication development." },
    ],
  }),
  component: LumaTwinPage,
});

const DOMAINS = [
  { key: "eyeContact", label: "Eye contact & joint attention", value: 82, icon: Eye },
  { key: "speech", label: "Speech & vocalisation", value: 68, icon: MessageSquare },
  { key: "gesture", label: "Gesture & pointing", value: 84, icon: Hand },
  { key: "auditory", label: "Auditory response", value: 74, icon: Ear },
  { key: "attention", label: "Sustained attention", value: 76, icon: Activity },
] as const;

function LumaTwinPage() {
  const child = useAppStore((s) => s.child) ?? DEMO_CHILD;
  const [focus, setFocus] = useState<string>("gesture");
  const active = DOMAINS.find((d) => d.key === focus) ?? DOMAINS[0];

  return (
    <AppShell
      title="LumaTwin"
      subtitle={`A living digital twin of ${child.name}'s communication profile — recalculated after every session.`}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card className="relative gap-0 overflow-hidden rounded-3xl border-border/70 p-7 shadow-lift">
          <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
            <LottiePulse className="absolute h-64 w-64" />
            <motion.div
              className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-gradient-aurora text-white shadow-glow"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-2xl font-semibold tabular-nums">77</span>
              <span className="text-[10px] uppercase tracking-wider text-white/80">Twin index</span>
            </motion.div>

            {DOMAINS.map((d, i) => {
              const angle = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2;
              const r = 104;
              return (
                <motion.button
                  key={d.key}
                  type="button"
                  onClick={() => setFocus(d.key)}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08 * i, duration: 0.4 }}
                  style={{ left: `calc(50% + ${Math.cos(angle) * r}px)`, top: `calc(50% + ${Math.sin(angle) * r}px)` }}
                  aria-label={d.label}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border p-2.5 transition-colors ${
                    focus === d.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <d.icon className="h-4 w-4" />
                </motion.button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-gradient-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Focus domain</p>
            <h2 className="mt-1 text-base font-semibold tracking-tight">{active.label}</h2>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={active.value} className="h-2" />
              <span className="text-sm font-semibold tabular-nums">{active.value}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-soft">
            <h2 className="text-sm font-semibold tracking-tight">Twin domain map</h2>
            <ul className="mt-4 space-y-4">
              {DOMAINS.map((d) => (
                <li key={d.key}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <d.icon className="h-3.5 w-3.5 text-primary" /> {d.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{d.value}</span>
                  </div>
                  <Progress value={d.value} className="h-1.5" />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="gap-0 rounded-3xl border-primary/25 bg-gradient-surface p-6 shadow-soft">
            <Badge className="w-fit rounded-full bg-primary/10 text-primary hover:bg-primary/10">
              <Sparkles className="mr-1 h-3 w-3" /> Twin insight
            </Badge>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {child.name}'s twin shows strong gesture and expressive intent with slower verbal turn-taking.
              Repeating the naming and pointing activities three times a week is the highest-leverage change in
              the current model.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}