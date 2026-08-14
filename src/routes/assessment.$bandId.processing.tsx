import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AI_PROCESSING_STEPS } from "@/constants";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/assessment/$bandId/processing")({
  head: () => ({
    meta: [
      { title: "AI analysis in progress — LumaPath AI" },
      { name: "description", content: "Multimodal AI analysis of speech, gaze, gesture and response latency." },
      { property: "og:title", content: "AI analysis in progress — LumaPath AI" },
      { property: "og:description", content: "Multimodal AI analysis of speech, gaze, gesture and latency." },
    ],
  }),
  component: ProcessingScreen,
});

function ProcessingScreen() {
  const navigate = useNavigate();
  const resetDraft = useAppStore((s) => s.resetDraft);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= AI_PROCESSING_STEPS.length) {
      resetDraft();
      const t = setTimeout(() => navigate({ to: "/results/$resultId", params: { resultId: "r_003" } }), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 420);
    return () => clearTimeout(t);
  }, [step, navigate, resetDraft]);

  const progress = (Math.min(step, AI_PROCESSING_STEPS.length) / AI_PROCESSING_STEPS.length) * 100;

  return (
    <AppShell title="Analyzing the session" subtitle="This usually takes under two minutes. You can leave this screen open.">
      <div className="mx-auto max-w-lg">
        <Card className="gap-0 rounded-3xl border-border/70 p-8 shadow-lift">
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute rounded-full border border-primary/30"
                style={{ width: 128 - i * 26, height: 128 - i * 26 }}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 8 + i * 3, repeat: Infinity, ease: "linear" }}
              />
            ))}
            <motion.div
              className="h-16 w-16 rounded-full bg-gradient-aurora shadow-glow"
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Multimodal pipeline</span>
              <span className="tabular-nums">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <ul className="mt-7 space-y-3">
            {AI_PROCESSING_STEPS.map((label, i) => {
              const complete = i < step;
              const active = i === step;
              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 text-sm transition-opacity ${
                    complete || active ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      complete ? "bg-success/15 text-success" : active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {complete ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className={complete ? "text-muted-foreground" : "font-medium"}>{label}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}