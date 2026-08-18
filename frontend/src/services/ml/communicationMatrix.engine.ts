/**
 * Communication Matrix Rule Engine (mock, deterministic).
 *
 * Maps measured behavioural signals onto the 7 Communication Matrix levels
 * using explicit, auditable rules — no black box. A clinical build would load
 * the rule table from the server; the shape stays identical.
 */
import { COMMUNICATION_MATRIX_LEVELS } from "@/constants";

export interface MatrixSignals {
  eyeContactPct: number;
  vocalisations: number;
  gestureCount: number;
  pointingCount: number;
  sharedAttention: number;
  responseLatencyMs: number;
  wordsUsed?: number;
}

export interface MatrixRule {
  id: string;
  level: number;
  label: string;
  test: (s: MatrixSignals) => boolean;
  rationale: string;
}

export const MATRIX_RULES: MatrixRule[] = [
  {
    id: "L1",
    level: 1,
    label: "Pre-intentional behaviour",
    test: (s) => s.eyeContactPct < 12 && s.vocalisations < 2 && s.gestureCount === 0,
    rationale: "No consistent communicative signal observed in the sampled interaction.",
  },
  {
    id: "L2",
    level: 2,
    label: "Intentional behaviour",
    // Requires *some* signal. Without this clause L2 also fires on a recording
    // where nothing at all was observed, and because the engine takes the
    // highest firing level, a completely unresponsive session was being
    // reported as "behaviour is goal-directed" — the opposite of the finding.
    test: (s) =>
      s.eyeContactPct < 25 &&
      s.vocalisations < 4 &&
      (s.vocalisations >= 2 || s.gestureCount > 0 || s.eyeContactPct >= 12),
    rationale: "Behaviour is goal-directed but not yet directed to a partner.",
  },
  {
    id: "L3",
    level: 3,
    label: "Unconventional communication",
    test: (s) => s.gestureCount > 0 && s.pointingCount === 0 && s.sharedAttention < 45,
    rationale: "Partner-directed signals present without conventional gestures.",
  },
  {
    id: "L4",
    level: 4,
    label: "Conventional communication",
    test: (s) => s.pointingCount >= 1 && s.sharedAttention >= 45,
    rationale: "Pointing plus joint attention indicates conventional gesture use.",
  },
  {
    id: "L5",
    level: 5,
    label: "Concrete symbols",
    test: (s) => (s.wordsUsed ?? 0) >= 3 && s.responseLatencyMs < 2600,
    rationale: "Consistent symbol use with timely responses to partner prompts.",
  },
  {
    id: "L6",
    level: 6,
    label: "Abstract symbols",
    test: (s) => (s.wordsUsed ?? 0) >= 10 && s.eyeContactPct >= 45,
    rationale: "Spoken vocabulary used flexibly with sustained partner engagement.",
  },
  {
    id: "L7",
    level: 7,
    label: "Language",
    test: (s) => (s.wordsUsed ?? 0) >= 25 && s.sharedAttention >= 70,
    rationale: "Combined symbols in reciprocal exchanges across the session.",
  },
];

export interface MatrixEvaluation {
  level: number;
  name: string;
  detail: string;
  firedRules: Array<{ id: string; label: string; rationale: string }>;
  nextLevelTargets: string[];
  confidence: number;
}

export function evaluateCommunicationMatrix(signals: MatrixSignals): MatrixEvaluation {
  const fired = MATRIX_RULES.filter((r) => r.test(signals));
  const level = fired.length ? Math.max(...fired.map((r) => r.level)) : 1;
  const entry =
    COMMUNICATION_MATRIX_LEVELS.find((l) => l.level === level) ?? COMMUNICATION_MATRIX_LEVELS[0];
  return {
    level: entry.level,
    name: entry.name,
    detail: entry.detail,
    firedRules: fired.map((r) => ({ id: r.id, label: r.label, rationale: r.rationale })),
    nextLevelTargets: [
      "Increase spontaneous communicative initiations",
      "Expand consistent symbol or word use",
      "Generalise signals across new partners",
    ],
    confidence: Math.min(0.96, 0.62 + fired.length * 0.07),
  };
}