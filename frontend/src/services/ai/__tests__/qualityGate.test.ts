import { describe, expect, it } from "vitest";
import { assessQuality } from "@/services/ai/qualityGate.service";
import type { FrameStat } from "@/services/ai/behaviourAnalysis.service";
import type { VideoProbe } from "@/types";

const goodProbe: VideoProbe = {
  fileName: "session.mp4",
  sizeBytes: 12_000_000,
  durationSec: 45,
  width: 1280,
  height: 720,
  hasAudio: true,
  quality: "good",
  qualityNotes: [],
};

const frame = (over: Partial<FrameStat> = {}): FrameStat => ({
  t: 0,
  brightness: 0.5,
  contrast: 0.3,
  motion: 0.2,
  centerEnergy: 0.4,
  faceLike: 0.7,
  ...over,
});

const frames = (n: number, over: Partial<FrameStat> = {}) =>
  Array.from({ length: n }, (_, i) => frame({ t: i, ...over }));

describe("assessQuality", () => {
  it("accepts a well-lit clip with a visible face", () => {
    const verdict = assessQuality(goodProbe, frames(14));
    expect(verdict.scorable).toBe(true);
    expect(verdict.reasons).toHaveLength(0);
  });

  it("rejects a clip where the face is rarely visible", () => {
    const verdict = assessQuality(goodProbe, frames(14, { faceLike: 0.05 }));
    expect(verdict.scorable).toBe(false);
    expect(verdict.reasons.join(" ")).toMatch(/face was visible/i);
    // A rejection is only useful if it says what to do instead.
    expect(verdict.fixes.length).toBeGreaterThan(0);
  });

  it("rejects a clip that is too dark", () => {
    const verdict = assessQuality(goodProbe, frames(14, { brightness: 0.05 }));
    expect(verdict.scorable).toBe(false);
    expect(verdict.reasons.join(" ")).toMatch(/too dark/i);
  });

  it("rejects an over-exposed clip", () => {
    const verdict = assessQuality(goodProbe, frames(14, { brightness: 0.98 }));
    expect(verdict.scorable).toBe(false);
    expect(verdict.reasons.join(" ")).toMatch(/over-exposed/i);
  });

  it("rejects a clip that is too short", () => {
    const verdict = assessQuality({ ...goodProbe, durationSec: 4 }, frames(14));
    expect(verdict.scorable).toBe(false);
  });

  it("rejects when no frames could be decoded", () => {
    const verdict = assessQuality(goodProbe, []);
    expect(verdict.scorable).toBe(false);
    expect(verdict.fixes.join(" ")).toMatch(/MP4|WebM/i);
  });

  it("warns without blocking when audio is missing", () => {
    const verdict = assessQuality({ ...goodProbe, hasAudio: false }, frames(14));
    expect(verdict.scorable).toBe(true);
    expect(verdict.warnings.join(" ")).toMatch(/audio/i);
  });

  it("warns without blocking on low resolution", () => {
    const verdict = assessQuality({ ...goodProbe, width: 320, height: 240 }, frames(14));
    expect(verdict.scorable).toBe(true);
    expect(verdict.warnings.join(" ")).toMatch(/resolution/i);
  });
});
