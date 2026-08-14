import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Baby, RefreshCw, Send, Square, Stethoscope } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_CHILD } from "@/services/mockData";
import { useAppStore } from "@/store/useAppStore";
import { ageInMonths } from "@/utils/age";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI clinical copilot — LumaPath AI" },
      {
        name: "description",
        content:
          "A medical AI copilot that reasons over your child's screening metrics, behavioural reports and Communication Matrix level.",
      },
      { property: "og:title", content: "AI clinical copilot — LumaPath AI" },
      {
        property: "og:description",
        content: "Streaming clinical reasoning over your child's screening data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  "Explain my child's latest results in plain language",
  "Why was the eye-contact score measured that way?",
  "What Communication Matrix level is this and what comes next?",
  "Which activity should we repeat this week, and how often?",
  "Prepare a summary I can bring to the clinician",
];

function AssistantPage() {
  const child = useAppStore((s) => s.child) ?? DEMO_CHILD;
  const savedResults = useAppStore((s) => s.savedResults);

  // Clinical grounding: child profile + latest sessions, child-only metrics.
  const context = useMemo(() => {
    const recent = [...savedResults]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 4)
      .map((r) => ({
        completedAt: r.completedAt,
        source: r.source ?? "video",
        overallScore: r.overallScore,
        riskLevel: r.riskLevel,
        confidence: r.confidence,
        matrixLevel: `${r.matrixLevel} — ${r.matrixLevelName}`,
        responseLatencyMs: r.responseLatencyMs,
        childScores: r.scores,
        observations: r.observations,
        riskFactors: r.riskFactors,
        faceDetectionRate: r.analysis?.faceDetectionRate,
        timeline: r.analysis?.timeline?.slice(0, 12),
      }));
    return {
      primarySubject: "child",
      child: {
        name: child.name,
        ageMonths: ageInMonths(child.birthDate),
        ageBandId: child.ageBandId,
        gender: child.gender,
        medicalNotes: child.medicalNotes ?? null,
        developmentHistory: child.developmentHistory?.slice(0, 6),
        communicationHistory: child.communicationHistory?.slice(0, 6),
      },
      sessions: recent,
      sessionCount: savedResults.length,
    };
  }, [child, savedResults]);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { context } }),
    [context],
  );

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({ transport });

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    void sendMessage({ text: value });
  }

  return (
    <AppShell
      title="AI clinical copilot"
      subtitle="Reasons over your child's profile, behavioural metrics and Communication Matrix level."
    >
      <Card className="mx-auto flex h-[68vh] w-full max-w-3xl flex-col gap-0 overflow-hidden rounded-3xl border-border/70 p-0 shadow-lift">
        <div className="flex items-center gap-2 border-b border-border/70 px-5 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-aurora text-white">
            <Stethoscope className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">LumaPath copilot</p>
            <p className="truncate text-xs text-muted-foreground">
              Grounded in {context.sessionCount} session{context.sessionCount === 1 ? "" : "s"} for{" "}
              {child.name}
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Baby className="h-3 w-3" /> Child-only metrics
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {messages.length === 0 && (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-aurora text-white">
                <Stethoscope className="h-4 w-4" />
              </span>
              <p className="max-w-[85%] text-sm leading-relaxed text-foreground">
                Hi — I'm the LumaPath clinical copilot. I can explain how each behavioural metric
                for {child.name} was measured, what it means against the Communication Matrix, and
                what to practise next. LumaPath is an AI-assisted screening support tool, not a
                diagnosis.
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("")
                .trim();
              if (!text) return null;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={m.role === "user" ? "flex justify-end" : "flex items-start gap-3"}
                >
                  {m.role !== "user" && (
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-aurora text-white">
                      <Stethoscope className="h-4 w-4" />
                    </span>
                  )}
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground"
                        : "max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                    }
                  >
                    {text}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.16 }}
                />
              ))}
              Reasoning over {child.name}'s screening data…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">The copilot could not answer that.</p>
                <p className="mt-0.5 break-words opacity-90">{error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 rounded-full text-xs"
                  onClick={() => void regenerate()}
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" /> Retry
                </Button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border/70 p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                disabled={busy}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={2}
              placeholder="Ask about a metric, the matrix level, activities or clinician handover…"
              className="min-h-[52px] resize-none rounded-2xl"
            />
            {busy ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label="Stop generating"
                onClick={() => void stop()}
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            AI-assisted screening support. Not a diagnosis and not a replacement for clinical
            assessment.
          </p>
        </div>
      </Card>
    </AppShell>
  );
}
