/**
 * Age-band expectations for the six scored domains.
 *
 * Until this existed, `buildResultFromAnalysis` took an `ageBandId` and never
 * read it — a 9-month-old and a 5-year-old were judged against identical
 * thresholds, which makes an age-banded screening tool meaningless.
 *
 * ## Where these numbers come from, and what they are not
 *
 * They encode the *direction* of well-established developmental expectations:
 * pointing emerges around 9–12 months, first words around 12 months, word
 * combinations around 24 months, and so on. An infant producing few gestures is
 * unremarkable; a four-year-old producing few gestures is not, and the raw
 * measurement is identical in both cases.
 *
 * **They are not validated norms.** No normative sample sits behind them. They
 * are explicit, reviewable starting values chosen so a clinician can disagree
 * with a specific number rather than with an opaque formula. Anyone using this
 * clinically must calibrate `EXPECTED` against real data first.
 *
 * `expected` is the raw domain score a typically-developing child in that band
 * would be expected to reach. Normalisation maps raw → 0–100 relative to it, so
 * the same behaviour reads differently at different ages.
 */
import type { AgeBandId, ScoreKey } from "@/types";

type Expectations = Record<ScoreKey, number>;

/** Raw score expected of a typically-developing child in each band. */
const EXPECTED: Record<AgeBandId, Expectations> = {
  // Pre-intentional. Social smile and gaze emerging; no gesture or speech yet.
  "0-6m": {
    eyeContact: 45,
    speech: 15,
    gesture: 10,
    attention: 30,
    facialExpression: 45,
    auditoryResponse: 40,
  },
  // Name response, babbling, early joint attention.
  "6-12m": {
    eyeContact: 55,
    speech: 30,
    gesture: 30,
    attention: 40,
    facialExpression: 55,
    auditoryResponse: 55,
  },
  // Pointing established, first words, follows simple instructions.
  "1-2y": {
    eyeContact: 62,
    speech: 45,
    gesture: 55,
    attention: 50,
    facialExpression: 60,
    auditoryResponse: 62,
  },
  // Two-word combinations, turn taking, symbolic play.
  "2-3y": {
    eyeContact: 68,
    speech: 60,
    gesture: 62,
    attention: 58,
    facialExpression: 65,
    auditoryResponse: 68,
  },
  // Sentences, intelligibility, conversational exchange.
  "3-4y": {
    eyeContact: 72,
    speech: 70,
    gesture: 65,
    attention: 66,
    facialExpression: 70,
    auditoryResponse: 72,
  },
  // Narrative language, comprehension depth, social pragmatics.
  "4-6y": {
    eyeContact: 75,
    speech: 78,
    gesture: 68,
    attention: 72,
    facialExpression: 72,
    auditoryResponse: 75,
  },
};

/** Response latency in ms that is typical for each band — younger is slower. */
const EXPECTED_LATENCY_MS: Record<AgeBandId, number> = {
  "0-6m": 3000,
  "6-12m": 2600,
  "1-2y": 2200,
  "2-3y": 1800,
  "3-4y": 1500,
  "4-6y": 1300,
};

export function expectationsFor(band: AgeBandId): Expectations {
  return EXPECTED[band] ?? EXPECTED["1-2y"];
}

export function expectedLatencyFor(band: AgeBandId): number {
  return EXPECTED_LATENCY_MS[band] ?? 2000;
}

/**
 * Maps a raw domain score to an age-relative 0–100.
 *
 * Meeting expectation lands at 70 — comfortably "on track" without implying
 * perfection. Above expectation compresses toward 100 so a strong session
 * cannot mask a weak domain elsewhere; below it falls proportionally.
 */
export function normaliseScore(raw: number, expected: number): number {
  const safeExpected = Math.max(1, expected);
  if (raw >= safeExpected) {
    const headroom = (raw - safeExpected) / Math.max(1, 100 - safeExpected);
    return Math.round(Math.min(99, 70 + headroom * 29));
  }
  return Math.round(Math.max(5, (raw / safeExpected) * 70));
}

/** Applies age normalisation across all six domains. */
export function normaliseScores(
  raw: Record<ScoreKey, number>,
  band: AgeBandId,
): Record<ScoreKey, number> {
  const expected = expectationsFor(band);
  return (Object.keys(raw) as ScoreKey[]).reduce(
    (acc, key) => {
      acc[key] = normaliseScore(raw[key], expected[key]);
      return acc;
    },
    {} as Record<ScoreKey, number>,
  );
}

/** Age-relative latency score, 0–100. Faster than expected scores above 70. */
export function normaliseLatency(measuredMs: number, band: AgeBandId): number {
  if (measuredMs <= 0) return 50;
  const expected = expectedLatencyFor(band);
  const ratio = expected / measuredMs;
  return Math.round(Math.max(5, Math.min(99, ratio * 70)));
}

/** One-line explanation for the report, so the adjustment is visible. */
export function describeNormalisation(band: AgeBandId): string {
  const expected = expectationsFor(band);
  const avg = Math.round(
    (Object.keys(expected) as ScoreKey[]).reduce((a, k) => a + expected[k], 0) / 6,
  );
  return (
    `Scores are adjusted for the ${band} age band, where the average expected raw ` +
    `measurement is ${avg}/100. A score of 70 means the child met the expectation for their age.`
  );
}
