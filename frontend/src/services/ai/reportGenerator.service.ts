import { SCORE_LABELS } from "@/constants";
import type { AssessmentResult, ScoreKey } from "@/types";

/**
 * Builds a real, downloadable clinician PDF in the browser from the result data.
 */
export async function generateClinicianReport(
  result: AssessmentResult,
  childName = "Child",
): Promise<{ url: string; filename: string }> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 48;
  const W = doc.internal.pageSize.getWidth();
  let y = M;

  const line = (text: string, size = 10, style: "normal" | "bold" = "normal", gap = 15) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    for (const l of doc.splitTextToSize(text, W - M * 2)) {
      if (y > doc.internal.pageSize.getHeight() - M) {
        doc.addPage();
        y = M;
      }
      doc.text(l, M, y);
      y += gap;
    }
  };

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 76, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("LumaPath AI", M, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Developmental Communication Screening Report", M, 54);
  doc.setTextColor(17, 24, 39);
  y = 110;

  line(`Report ID: ${result.id.toUpperCase()}`);
  line(`Child: ${childName}`);
  line(`Session date: ${new Date(result.completedAt).toLocaleString()}`);
  line(`Age band: ${result.ageBandId}`);
  line(`Overall score: ${result.overallScore}/100   ·   Risk level: ${result.riskLevel}`);
  line(`Communication Matrix: Level ${result.matrixLevel} — ${result.matrixLevelName}`);
  line(`Mean response latency: ${result.responseLatencyMs} ms`);
  line(`Model confidence: ${Math.round(result.confidence * 100)}%`);

  y += 10;
  line("Domain scores", 12, "bold", 18);
  for (const k of Object.keys(result.scores) as ScoreKey[]) {
    line(`${SCORE_LABELS[k]}: ${result.scores[k]}/100`);
  }

  y += 10;
  line("Clinical impression", 12, "bold", 18);
  line(result.aiExplanation, 10, "normal", 14);

  if (result.analysis) {
    const a = result.analysis;
    y += 10;
    line("Recording & video quality", 12, "bold", 18);
    line(`File: ${a.video.fileName}`);
    line(`Duration: ${a.video.durationSec.toFixed(1)} s   ·   Resolution: ${a.video.width}x${a.video.height}`);
    line(`Audio track: ${a.video.hasAudio ? "present" : "absent"}   ·   Quality: ${a.video.quality}`);
    line(`Face tracked in ${Math.round(a.faceDetectionRate * 100)}% of sampled frames`);

    y += 10;
    line("Extracted behavioural features", 12, "bold", 18);
    for (const g of a.groups) {
      line(g.title, 10, "bold", 14);
      for (const m of g.metrics) line(`   ${m.label}: ${m.value}`, 10, "normal", 13);
    }

    y += 10;
    line("Behaviour timeline", 12, "bold", 18);
    for (const e of a.timeline) {
      const mm = Math.floor(e.atSec / 60);
      const ss = String(Math.round(e.atSec % 60)).padStart(2, "0");
      line(`${mm}:${ss}  ${e.label} — ${e.detail}`, 10, "normal", 13);
    }
  }

  y += 10;
  line("Observed behaviours", 12, "bold", 18);
  for (const o of result.observations) line(`• ${o}`, 10, "normal", 14);

  y += 10;
  line("Risk factors flagged", 12, "bold", 18);
  for (const r of result.riskFactors) line(`• ${r}`, 10, "normal", 14);

  y += 14;
  line(
    "AI-assisted Screening Tool. Not intended to replace clinical diagnosis. Results should be interpreted by a qualified clinician alongside direct observation and developmental history.",
    8,
    "normal",
    11,
  );

  const filename = `LumaPath-Report-${result.id}.pdf`;
  doc.save(filename);
  return { url: filename, filename };
}
