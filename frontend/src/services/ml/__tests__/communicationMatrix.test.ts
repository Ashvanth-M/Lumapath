import { describe, expect, it } from "vitest";
import {
  evaluateCommunicationMatrix,
  MATRIX_RULES,
  type MatrixSignals,
} from "@/services/ml/communicationMatrix.engine";

const baseline: MatrixSignals = {
  eyeContactPct: 0,
  vocalisations: 0,
  gestureCount: 0,
  pointingCount: 0,
  sharedAttention: 0,
  responseLatencyMs: 3000,
};

describe("communication matrix rule engine", () => {
  it("assigns level 1 when nothing communicative was observed", () => {
    const result = evaluateCommunicationMatrix(baseline);
    expect(result.level).toBe(1);
    expect(result.name).toBe("Pre-Intentional Behaviour");
  });

  it("reaches level 4 when pointing and joint attention are both present", () => {
    const result = evaluateCommunicationMatrix({
      ...baseline,
      eyeContactPct: 50,
      vocalisations: 6,
      gestureCount: 3,
      pointingCount: 2,
      sharedAttention: 60,
    });
    expect(result.level).toBeGreaterThanOrEqual(4);
  });

  it("takes the highest level among all rules that fire", () => {
    const result = evaluateCommunicationMatrix({
      eyeContactPct: 60,
      vocalisations: 20,
      gestureCount: 10,
      pointingCount: 4,
      sharedAttention: 80,
      responseLatencyMs: 1200,
      wordsUsed: 30,
    });
    expect(result.level).toBe(7);
  });

  it("explains itself — every fired rule carries a rationale", () => {
    // The auditable-rules property is the reason this is not a neural net.
    // A clinician has to be able to read why a level was assigned.
    const result = evaluateCommunicationMatrix({
      ...baseline,
      eyeContactPct: 50,
      pointingCount: 1,
      sharedAttention: 50,
      gestureCount: 2,
    });
    expect(result.firedRules.length).toBeGreaterThan(0);
    for (const rule of result.firedRules) {
      expect(rule.rationale.length).toBeGreaterThan(10);
      expect(rule.id).toMatch(/^L\d$/);
    }
  });

  it("never returns a level outside 1–7", () => {
    const extremes: MatrixSignals[] = [
      baseline,
      { ...baseline, eyeContactPct: 100, vocalisations: 999, gestureCount: 999, pointingCount: 999, sharedAttention: 100, responseLatencyMs: 1, wordsUsed: 999 },
      { ...baseline, responseLatencyMs: 0 },
    ];
    for (const signals of extremes) {
      const { level } = evaluateCommunicationMatrix(signals);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(7);
    }
  });

  it("keeps confidence within a sane range", () => {
    const { confidence } = evaluateCommunicationMatrix(baseline);
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(0.96);
  });

  it("declares a level for every rule in the table", () => {
    for (const rule of MATRIX_RULES) {
      expect(rule.level).toBeGreaterThanOrEqual(1);
      expect(rule.level).toBeLessThanOrEqual(7);
    }
  });
});
