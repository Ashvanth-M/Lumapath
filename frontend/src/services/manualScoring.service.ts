import { ANSWER_OPTIONS, MANUAL_QUESTIONS_BY_BAND, type AnswerValue } from "@/constants/manualQuestions";
import { COMMUNICATION_MATRIX_LEVELS, SCORE_LABELS } from "@/constants";
import type { AgeBandId, AssessmentResult, RiskLevel, ScoreKey } from "@/types";

const SCORE_KEYS: ScoreKey[] = [
  "eyeContact",
  "speech",
  "gesture",
  "attention",
  "facialExpression",
  "auditoryResponse",
];

const scoreFor = (v: AnswerValue) => ANSWER_OPTIONS.find((o) => o.value === v)!.score;

/** Deterministic scoring of the parent-reported (manual) questionnaire. */
export function scoreManualAssessment(
  bandId: AgeBandId,
  answers: Record<string, AnswerValue>,
  childId: string,
): AssessmentResult {
  const questions = MANUAL_QUESTIONS_BY_BAND[bandId];
  const buckets = new Map<ScoreKey, number[]>();
  for (const k of SCORE_KEYS) buckets.set(k, []);

  for (const q of questions) {
    const answer = answers[q.id];
    if (!answer) continue;
    buckets.get(q.domain)!.push(scoreFor(answer));
  }

  const scores = SCORE_KEYS.reduce(
    (acc, k) => {
      const vals = buckets.get(k)!;
      acc[k] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 70;
      return acc;
    },
    {} as Record<ScoreKey, number>,
  );

  const overallScore = Math.round(SCORE_KEYS.reduce((a, k) => a + scores[k], 0) / SCORE_KEYS.length);
  const answered = questions.filter((q) => answers[q.id]).length;
  const notYet = questions.filter((q) => answers[q.id] === "no");
  const sometimes = questions.filter((q) => answers[q.id] === "sometimes");
  const strengths = questions.filter((q) => answers[q.id] === "yes");

  const riskLevel: RiskLevel = overallScore >= 80 ? "low" : overallScore >= 60 ? "monitor" : "elevated";
  const matrixLevel = Math.min(7, Math.max(1, Math.round(overallScore / 14)));
  const matrix = COMMUNICATION_MATRIX_LEVELS.find((l) => l.level === matrixLevel)!;
  const responseLatencyMs = Math.round(2600 - overallScore * 14);

  const weakest = [...SCORE_KEYS].sort((a, b) => scores[a] - scores[b]).slice(0, 2);
  const strongest = [...SCORE_KEYS].sort((a, b) => scores[b] - scores[a])[0];

  return {
    id: `m_${Date.now().toString(36)}`,
    childId,
    ageBandId: bandId,
    completedAt: new Date().toISOString(),
    overallScore,
    matrixLevel,
    matrixLevelName: matrix.name,
    responseLatencyMs,
    riskLevel,
    confidence: Math.min(0.94, 0.6 + (answered / Math.max(1, questions.length)) * 0.34),
    scores,
    aiExplanation:
      `Based on ${answered} parent-reported observations for the ${bandId} age band, communication is scored ${overallScore}/100, ` +
      `mapping to Communication Matrix Level ${matrixLevel} (${matrix.name}). ` +
      `${SCORE_LABELS[strongest]} is the clearest strength, while ${weakest
        .map((k) => SCORE_LABELS[k].toLowerCase())
        .join(" and ")} are the priority areas. ` +
      (riskLevel === "low"
        ? "Reported behaviours are broadly within the expected range; continue routine monitoring."
        : riskLevel === "monitor"
          ? "Some behaviours are emerging inconsistently — targeted daily practice and a re-screen in four weeks are advised."
          : "Several expected behaviours are not yet reported. A referral for a professional speech and language evaluation is recommended."),
    observations: [
      ...strengths.slice(0, 4).map((q) => `Reported consistently: ${q.text.replace(/\?$/, "")}.`),
      ...sometimes.slice(0, 3).map((q) => `Emerging, seen only sometimes: ${q.text.replace(/\?$/, "")}.`),
    ],
    riskFactors: notYet.length
      ? notYet.slice(0, 5).map((q) => `${SCORE_LABELS[q.domain]}: not yet observed — ${q.text.replace(/\?$/, "")}.`)
      : ["No parent-reported red flags in this questionnaire."],
  };
}
