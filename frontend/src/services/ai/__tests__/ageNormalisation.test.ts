import { describe, expect, it } from "vitest";
import {
  expectationsFor,
  normaliseLatency,
  normaliseScore,
  normaliseScores,
} from "@/services/ai/ageNormalisation.service";
import type { ScoreKey } from "@/types";

describe("normaliseScore", () => {
  it("maps meeting the expectation to 70", () => {
    expect(normaliseScore(50, 50)).toBe(70);
  });

  it("scales proportionally below the expectation", () => {
    expect(normaliseScore(25, 50)).toBe(35);
    expect(normaliseScore(0, 50)).toBe(5); // floored, never zero
  });

  it("compresses above the expectation and never reaches 100", () => {
    const perfect = normaliseScore(100, 50);
    expect(perfect).toBeGreaterThan(70);
    expect(perfect).toBeLessThanOrEqual(99);
  });

  it("never divides by zero when the expectation is zero", () => {
    expect(Number.isFinite(normaliseScore(30, 0))).toBe(true);
  });
});

describe("age banding", () => {
  const raw: Record<ScoreKey, number> = {
    eyeContact: 50,
    speech: 40,
    gesture: 40,
    attention: 45,
    facialExpression: 50,
    auditoryResponse: 50,
  };

  it("scores the same raw measurement higher for a younger child", () => {
    const infant = normaliseScores(raw, "0-6m");
    const preschooler = normaliseScores(raw, "4-6y");

    // This is the whole point of the module: identical behaviour, different
    // meaning by age. Few gestures at 4 months is typical; at 5 years it is not.
    expect(infant.gesture).toBeGreaterThan(preschooler.gesture);
    expect(infant.speech).toBeGreaterThan(preschooler.speech);
  });

  it("raises expectations monotonically with age for speech", () => {
    const bands = ["0-6m", "6-12m", "1-2y", "2-3y", "3-4y", "4-6y"] as const;
    const speech = bands.map((b) => expectationsFor(b).speech);
    const ascending = [...speech].sort((a, b) => a - b);
    expect(speech).toEqual(ascending);
  });

  it("falls back to a mid band for an unknown id", () => {
    // Guards against a crash if a bad age_band string reaches this from the DB.
    const fallback = expectationsFor("nonsense" as never);
    expect(fallback.speech).toBeGreaterThan(0);
  });
});

describe("normaliseLatency", () => {
  it("scores a faster-than-expected response above 70", () => {
    expect(normaliseLatency(1000, "4-6y")).toBeGreaterThan(70);
  });

  it("scores a slower-than-expected response below 70", () => {
    expect(normaliseLatency(4000, "4-6y")).toBeLessThan(70);
  });

  it("treats the same latency as better for a younger child", () => {
    expect(normaliseLatency(2500, "0-6m")).toBeGreaterThan(normaliseLatency(2500, "4-6y"));
  });

  it("returns a neutral score when latency was not measurable", () => {
    expect(normaliseLatency(0, "1-2y")).toBe(50);
  });
});
