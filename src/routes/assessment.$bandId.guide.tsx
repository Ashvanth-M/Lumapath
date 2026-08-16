import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Lightbulb, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ActivityIllustration } from "@/components/assessment/ActivityIllustration";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ACTIVITIES_BY_BAND, AGE_BANDS } from "@/constants";
import { useAppStore } from "@/store/useAppStore";
import type { AgeBandId } from "@/types";

export const Route = createFileRoute("/assessment/$bandId/guide")({
  head: () => ({
    meta: [
      { title: "Guided activities — LumaPath AI" },
      { name: "description", content: "Step-by-step guided activities to run with your child before recording." },
      { property: "og:title", content: "Guided activities — LumaPath AI" },
      { property: "og:description", content: "Step-by-step guided activities for your child's screening." },
    ],
  }),
  component: GuidedAssessment,
});

function GuidedAssessment() {
  const { bandId } = Route.useParams();
  const navigate = useNavigate();
  const band = AGE_BANDS.find((b) => b.id === bandId) ?? AGE_BANDS[2];
  const activities = ACTIVITIES_BY_BAND[bandId as AgeBandId] ?? ACTIVITIES_BY_BAND["1-2y"];
  const advanceDraft = useAppStore((s) => s.advanceDraft);

  const [index, setIndex] = useState(0);
  const activity = activities[index];
  const [seconds, setSeconds] = useState(activity.seconds);

  useEffect(() => {
    setSeconds(activity.seconds);
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [activity]);

  function next() {
    advanceDraft(activity.id);
    if (index + 1 < activities.length) {
      setIndex((i) => i + 1);
    } else {
      toast.success("All activities previewed — starting the live session");
      navigate({ to: "/assessment/$bandId/live", params: { bandId } });
    }
  }

  const progress = ((index + 1) / activities.length) * 100;

  return (
    <AppShell title={`${band.label} screening`} subtitle="Follow each activity exactly. Autosave keeps your place if you step away.">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              Activity {index + 1} of {activities.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="gap-0 overflow-hidden rounded-3xl border-border/70 p-0 shadow-lift">
              <ActivityIllustration icon={activity.icon} />
              <div className="p-6 sm:p-7">
                <h2 className="text-xl font-semibold tracking-tight">{activity.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{activity.instruction}</p>

                <button
                  type="button"
                  onClick={() => toast.info(activity.audioScript)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-gradient-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <Volume2 className="h-4 w-4 text-primary" /> Play audio instruction
                </button>

                <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-accent/8 p-4 text-sm text-muted-foreground">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {activity.tip}
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-2xl font-semibold tabular-nums">
                      {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                      {String(seconds % 60).padStart(2, "0")}
                    </span>
                    <span className="text-xs text-muted-foreground">suggested time</span>
                  </div>
                  <Button onClick={next} className="rounded-xl">
                    {index + 1 === activities.length ? "Go to live session" : "Continue"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}