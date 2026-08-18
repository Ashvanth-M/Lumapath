/**
 * Turns a completed live session into a stored assessment result.
 *
 * Every input here was measured from real camera frames and real microphone
 * samples by `LiveVisionEngine` — nothing is synthesised. The Communication
 * Matrix level comes from the auditable rule engine rather than a score
 * division, so the level can be explained by which rules fired.
 */
import { SCORE_LABELS } from "@/constants";
import { evaluateCommunicationMatrix } from "@/services/ml/communicationMatrix.engine";
import type { LiveEvent, LiveMetrics, LiveQuality } from "@/services/ai/liveVision.service";
import type {
  AgeBandId,
  AssessmentResult,
  RiskLevel,
  ScoreKey,
  TimelineEvent,
} from "@/types";

const clamp = (v: number, lo = 5, hi = 99) => Math.max(lo, Math.min(hi, Math.round(v)));

/** Scales a raw count against the number expected in a good session. */
const rate = (count: number, expected: number) => Math.min(1, count / expected) * 100;

export function buildResultFromLiveSession(params: {
  metrics: LiveMetrics;
  quality: LiveQuality;
  events: LiveEvent[];
  ageBandId: AgeBandId;
  childId: string;
  durationSec: number;
}): AssessmentResult {
  const { metrics: m, quality, events, ageBandId, childId, durationSec } = params;

  const scores: Record<ScoreKey, number> = {
    eyeContact: clamp(m.eyeContactPct * 0.7 + m.faceDetection * 0.3),
    speech: clamp(rate(m.vocalisations, 12) * 0.6 + m.speechActivity * 0.4),
    gesture: clamp(rate(m.gestureCount, 8) * 0.6 + rate(m.pointingCount, 3) * 0.4),
    attention: clamp(m.attentionScore * 0.7 + m.sharedAttention * 0.3),
    facialExpression: clamp(rate(m.smiles, 6) * 0.6 + m.faceDetection * 0.4),
    auditoryResponse: clamp(
      rate(m.headTurns, 5) * 0.5 +
        (m.responseLatencyMs > 0 ? Math.max(0, 100 - m.responseLatencyMs / 25) : 50) * 0.5,
    ),
  };

  const overallScore = clamp(
    (Object.keys(scores) as ScoreKey[]).reduce((a, k) => a + scores[k], 0) / 6,
  );

  const matrix = evaluateCommunicationMatrix({
    eyeContactPct: m.eyeContactPct,
    vocalisations: m.vocalisations,
    gestureCount: m.gestureCount,
    pointingCount: m.pointingCount,
    sharedAttention: m.sharedAttention,
    responseLatencyMs: m.responseLatencyMs || 2000,
  });

  const riskLevel: RiskLevel =
    overallScore >= 75 ? "low" : overallScore >= 55 ? "monitor" : "elevated";

  const timeline: TimelineEvent[] = events.slice(0, 40).map((e) => ({
    atSec: e.atSec,
    label: e.label,
    kind:
      e.kind === "voice"
        ? "vocal"
        : e.kind === "head" || e.kind === "smile"
          ? "social"
          : e.kind === "prompt"
            ? "attention"
            : e.kind,
    detail: `Detected with ${Math.round(e.confidence * 100)}% confidence.`,
  }));

  const keys = Object.keys(scores) as ScoreKey[];
  const strongest = [...keys].sort((a, b) => scores[b] - scores[a])[0];
  const weakest = [...keys].sort((a, b) => scores[a] - scores[b]).slice(0, 2);

  const riskFactors: string[] = [];
  if (scores.speech < 60) riskFactors.push("Few vocalisations recorded during the session.");
  if (scores.eyeContact < 60) riskFactors.push("Limited sustained mutual gaze.");
  if (scores.gesture < 60) riskFactors.push("Low frequency of pointing or reaching.");
  if (quality.lighting < 50)
    riskFactors.push("Lighting was poor, which reduces face-tracking accuracy.");
  if (quality.audioQuality < 50)
    riskFactors.push("Audio quality was low, so vocal measures are less reliable.");
  if (durationSec < 60)
    riskFactors.push("Short session — fewer samples than a full activity set provides.");
  if (riskFactors.length === 0) riskFactors.push("No behavioural flags raised in this session.");

  return {
    id: `l_${Date.now().toString(36)}`,
    childId,
    ageBandId,
    completedAt: new Date().toISOString(),
    overallScore,
    matrixLevel: matrix.level,
    matrixLevelName: matrix.name,
    responseLatencyMs: m.responseLatencyMs,
    riskLevel,
    // Engine reports 0–100; AssessmentResult stores 0–1.
    confidence: Math.min(0.96, m.confidence / 100),
    scores,
    aiExplanation:
      `Measured live across ${Math.round(durationSec)} seconds of camera and microphone input. ` +
      `Communication scored ${overallScore}/100, mapping to Matrix Level ${matrix.level} (${matrix.name}). ` +
      `${SCORE_LABELS[strongest]} is the clearest strength; ${weakest
        .map((k) => SCORE_LABELS[k].toLowerCase())
        .join(" and ")} are the priority areas. ` +
      (matrix.firedRules.length
        ? `Level assigned because: ${matrix.firedRules[matrix.firedRules.length - 1].rationale}`
        : "No matrix rule fired conclusively — treat the level as provisional."),
    observations: [
      `Face tracked in ${m.faceDetection}% of sampled frames.`,
      `${m.eyeContacts} distinct eye-contact episodes, ${m.mutualGazeSec.toFixed(1)}s of mutual gaze in total.`,
      `${m.vocalisations} vocalisations and ${m.gestureCount} gestures recorded.`,
      `${m.pointingCount} pointing events, ${m.smiles} smiles.`,
    ],
    riskFactors,
    source: "live",
  };
}
