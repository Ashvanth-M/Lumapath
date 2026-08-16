import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer, ShieldCheck, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/common/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_LABELS } from "@/constants";
import { getAssessment } from "@/services/assessment.service";
import { generateClinicianReport } from "@/services/ai/reportGenerator.service";
import { formatDate, formatLatency } from "@/utils/age";
import { useAppStore } from "@/store/useAppStore";
import type { ScoreKey } from "@/types";

export const Route = createFileRoute("/report/$resultId")({
  head: () => ({
    meta: [
      { title: "Clinician report — LumaPath AI" },
      { name: "description", content: "Structured clinical summary of the AI screening for your care team." },
      { property: "og:title", content: "Clinician report — LumaPath AI" },
      { property: "og:description", content: "Structured clinical summary for your care team." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { resultId } = Route.useParams();
  const child = useAppStore((s) => s.child);
  const saved = useAppStore((s) => s.savedResults.find((r) => r.id === resultId));
  const { data: fetched } = useQuery({
    queryKey: ["assessment", resultId],
    queryFn: () => getAssessment(resultId),
    enabled: !saved,
  });
  const result = saved ?? fetched;

  if (!result) {
    return (
      <AppShell title="Clinician report">
        <Skeleton className="h-96 rounded-3xl" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Clinician report" subtitle="Share this summary with your paediatrician or speech-language pathologist.">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap gap-3">
          <Button
            className="rounded-xl"
            onClick={async () => {
              toast.loading("Generating PDF…", { id: "pdf" });
              try {
                const { filename } = await generateClinicianReport(result, child?.name ?? "Demo Child");
                toast.success(`Downloaded ${filename}`, { id: "pdf" });
              } catch {
                toast.error("Could not generate the PDF. Use Print instead.", { id: "pdf" });
              }
            }}
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        <Card className="gap-0 rounded-3xl border-border/70 p-8 shadow-lift">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">LumaPath AI</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Behavioural Analysis Report</h2>
              <p className="mt-1 text-sm text-muted-foreground">Report ID {result.id.toUpperCase()}</p>
            </div>
            <Stethoscope className="h-7 w-7 text-muted-foreground" />
          </div>

          <Separator className="my-6" />

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Field label="Child" value={child?.name ?? "Demo Child"} />
            <Field label="Session date" value={formatDate(result.completedAt)} />
            <Field label="Age band" value={result.ageBandId} />
            {result.analysis && (
              <>
                <Field
                  label="Recorded activity"
                  value={result.analysis.activityId.replace(/-/g, " ")}
                />
                <Field
                  label="Video"
                  value={`${result.analysis.video.durationSec.toFixed(1)} s · ${result.analysis.video.width}×${result.analysis.video.height} · ${result.analysis.video.quality}`}
                />
                <Field
                  label="Face tracking rate"
                  value={`${Math.round(result.analysis.faceDetectionRate * 100)}%`}
                />
              </>
            )}
            <Field label="Mean response latency" value={formatLatency(result.responseLatencyMs)} />
            <Field label="Communication Matrix" value={`Level ${result.matrixLevel} — ${result.matrixLevelName}`} />
            <Field label="Model confidence" value={`${Math.round(result.confidence * 100)}%`} />
          </dl>

          <Separator className="my-6" />

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Screening outcome</span>
            <RiskBadge level={result.riskLevel} />
            <span className="ml-auto text-sm">
              Overall <strong className="text-lg font-semibold">{result.overallScore}</strong>/100
            </span>
          </div>

          <h3 className="mt-7 text-sm font-semibold">Domain scores</h3>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {(Object.keys(result.scores) as ScoreKey[]).map((k) => (
                <tr key={k} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 text-muted-foreground">{SCORE_LABELS[k]}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">{result.scores[k]}/100</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="mt-7 text-sm font-semibold">Clinical impression</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.aiExplanation}</p>

          {result.analysis && (
            <>
              <h3 className="mt-7 text-sm font-semibold">Extracted behavioural features</h3>
              {result.analysis.groups.map((g) => (
                <div key={g.key} className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{g.title}</p>
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {g.metrics.map((m) => (
                        <tr key={m.label} className="border-b border-border/60 last:border-0">
                          <td className="py-2 text-muted-foreground">{m.label}</td>
                          <td className="py-2 text-right font-medium tabular-nums">{m.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <h3 className="mt-7 text-sm font-semibold">Behaviour timeline</h3>
              <ul className="mt-2 space-y-1.5">
                {result.analysis.timeline.map((e, i) => (
                  <li
                    key={`${e.atSec}-${e.label}-${i}`}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 text-sm text-muted-foreground"
                  >
                    <span className="font-mono text-xs tabular-nums text-primary">
                      {Math.floor(e.atSec / 60)}:{String(Math.round(e.atSec % 60)).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <strong className="font-medium text-foreground">{e.label}</strong> — {e.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="mt-6 text-sm font-semibold">Observed behaviours</h3>
          <ul className="mt-2 space-y-1.5">
            {result.observations.map((o) => (
              <li key={o} className="flex gap-2.5 text-sm text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {o}
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold">Risk factors flagged</h3>
          <ul className="mt-2 space-y-1.5">
            {result.riskFactors.map((r) => (
              <li key={r} className="flex gap-2.5 text-sm text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {r}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex gap-3 rounded-2xl bg-secondary/70 p-5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              AI-assisted Screening Tool. Not intended to replace clinical diagnosis. Results should be
              interpreted by a qualified clinician alongside direct observation and developmental history.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}