import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AGE_BANDS } from "@/constants";
import { ANSWER_OPTIONS, MANUAL_QUESTIONS_BY_BAND, type AnswerValue } from "@/constants/manualQuestions";
import { celebrate } from "@/lib/celebrate";
import { scoreManualAssessment } from "@/services/manualScoring.service";
import { useAppStore } from "@/store/useAppStore";
import type { AgeBandId } from "@/types";

export const Route = createFileRoute("/assessment/$bandId/manual")({
  head: () => ({
    meta: [
      { title: "Manual questionnaire — LumaPath AI" },
      {
        name: "description",
        content:
          "Answer simple yes / sometimes / not yet questions about your child's communication and get an instant AI-scored report — no camera needed.",
      },
      { property: "og:title", content: "Manual questionnaire — LumaPath AI" },
      { property: "og:description", content: "Parent-reported screening with instant AI scoring — no recording required." },
    ],
  }),
  component: ManualAssessment,
});

function ManualAssessment() {
  const { bandId } = Route.useParams();
  const navigate = useNavigate();
  const band = AGE_BANDS.find((b) => b.id === bandId) ?? AGE_BANDS[2];
  const questions = useMemo(
    () => MANUAL_QUESTIONS_BY_BAND[bandId as AgeBandId] ?? MANUAL_QUESTIONS_BY_BAND["1-2y"],
    [bandId],
  );
  const child = useAppStore((s) => s.child);
  const saveResult = useAppStore((s) => s.saveResult);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);

  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;
  const isLast = index === questions.length - 1;

  const select = (value: AnswerValue) => {
    setAnswers((a) => ({ ...a, [question.id]: value }));
    if (!isLast) setTimeout(() => setIndex((i) => Math.min(questions.length - 1, i + 1)), 220);
  };

  const submit = async () => {
    if (answeredCount < questions.length) {
      toast.error("Please answer every question before submitting.");
      return;
    }
    setSubmitting(true);
    const result = scoreManualAssessment(bandId as AgeBandId, answers, child?.id ?? "c_1");
    saveResult(result);
    void celebrate();
    toast.success("Questionnaire analysed — opening your report");
    await new Promise((r) => setTimeout(r, 500));
    navigate({ to: "/results/$resultId", params: { resultId: result.id } });
  };

  return (
    <AppShell
      title="Manual questionnaire"
      subtitle={`${band.label} · parent-reported screening — no camera or recording needed.`}
    >
      <div className="mx-auto max-w-2xl">
        <Card className="gap-0 rounded-3xl border-border/70 p-6 shadow-lift sm:p-8">
          <div className="mb-5 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5 text-primary" /> Question {index + 1} of {questions.length}
            </span>
            <span className="tabular-nums">{Math.round(progress)}% answered</span>
          </div>
          <Progress value={progress} className="h-2" />

          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7"
            >
              <h2 className="text-lg font-semibold leading-snug tracking-tight">{question.text}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{question.helper}</p>

              <div className="mt-6 grid gap-3">
                {ANSWER_OPTIONS.map((o) => {
                  const active = answers[question.id] === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => select(o.value)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all hover:-translate-y-0.5 ${
                        active
                          ? "border-primary bg-primary/8 text-primary shadow-soft"
                          : "border-border bg-card hover:bg-secondary"
                      }`}
                    >
                      {o.label}
                      {active && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {isLast ? (
              <Button className="rounded-xl" onClick={submit} disabled={submitting}>
                <Sparkles className="h-4 w-4" /> {submitting ? "Analysing…" : "Analyse & generate report"}
              </Button>
            ) : (
              <Button
                className="rounded-xl"
                onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              className="ml-auto rounded-xl text-xs"
              onClick={() => navigate({ to: "/assessment/$bandId/live", params: { bandId } })}
            >
              Switch to live recording
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
