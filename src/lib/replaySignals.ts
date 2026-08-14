import type { BehaviourSample } from "@/types";

export const EMPTY_SAMPLE: BehaviourSample = {
  t: 0,
  face: 0,
  gaze: 0,
  motion: 0,
  voice: 0,
  box: { x: 0.3, y: 0.3, w: 0.23, h: 0.33 },
  parentBox: { x: 0.61, y: 0.1, w: 0.32, h: 0.44 },
  track: 0.9,
  trackId: "CHILD-01",
  estimatedAgeYears: 3,
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Smoothly interpolates the measured samples at an arbitrary playback time. */
export function sampleAt(samples: BehaviourSample[] | undefined, t: number): BehaviourSample {
  if (!samples || samples.length === 0) return EMPTY_SAMPLE;
  if (samples.length === 1) return samples[0];
  if (t <= samples[0].t) return samples[0];
  const last = samples[samples.length - 1];
  if (t >= last.t) return last;

  let i = 0;
  while (i < samples.length - 2 && samples[i + 1].t < t) i++;
  const a = samples[i];
  const b = samples[i + 1];
  const span = Math.max(0.001, b.t - a.t);
  const k = Math.max(0, Math.min(1, (t - a.t) / span));
  return {
    t,
    face: lerp(a.face, b.face, k),
    gaze: lerp(a.gaze, b.gaze, k),
    motion: lerp(a.motion, b.motion, k),
    voice: lerp(a.voice, b.voice, k),
    box: {
      x: lerp(a.box.x, b.box.x, k),
      y: lerp(a.box.y, b.box.y, k),
      w: lerp(a.box.w, b.box.w, k),
      h: lerp(a.box.h, b.box.h, k),
    },
    parentBox:
      a.parentBox && b.parentBox
        ? {
            x: lerp(a.parentBox.x, b.parentBox.x, k),
            y: lerp(a.parentBox.y, b.parentBox.y, k),
            w: lerp(a.parentBox.w, b.parentBox.w, k),
            h: lerp(a.parentBox.h, b.parentBox.h, k),
          }
        : (a.parentBox ?? b.parentBox),
    track: lerp(a.track ?? 0.9, b.track ?? 0.9, k),
    predicted: k < 0.5 ? a.predicted : b.predicted,
    trackId: a.trackId ?? b.trackId ?? "CHILD-01",
    estimatedAgeYears: lerp(a.estimatedAgeYears ?? 3, b.estimatedAgeYears ?? 3, k),
  };
}

export const pct = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);

/**
 * Older sessions (and manual questionnaires) carry no per-frame samples.
 * Derive a smooth, deterministic signal track from their domain scores so the
 * replay overlays still animate against the stored measurements.
 */
export function derivedSamples(
  scores: { eyeContact: number; gesture: number; speech: number; attention: number },
  durationSec: number,
  count = 18,
): BehaviourSample[] {
  const d = Math.max(4, durationSec);
  return Array.from({ length: count }, (_, i) => {
    const t = (d * (i + 0.5)) / count;
    const wave = (freq: number, phase: number) => 0.5 + 0.5 * Math.sin(i * freq + phase);
    const face = Math.min(1, 0.55 + (scores.attention / 100) * 0.4 * wave(0.7, 0.2));
    const gaze = Math.min(1, (scores.eyeContact / 100) * (0.6 + 0.5 * wave(0.5, 1.1)));
    const motion = Math.min(1, (scores.gesture / 100) * (0.25 + 0.55 * wave(0.9, 2.3)));
    const voice = Math.min(1, (scores.speech / 100) * (0.3 + 0.7 * wave(1.3, 0.7)));
    return {
      t: Math.round(t * 10) / 10,
      face,
      gaze,
      motion,
      voice,
      box: {
        x: 0.3 + Math.sin(i * 0.6) * 0.05,
        y: 0.3 + Math.cos(i * 0.5) * 0.04,
        w: 0.23,
        h: 0.33,
      },
      parentBox: {
        x: 0.59 + Math.sin(i * 0.4) * 0.03,
        y: 0.1 + Math.cos(i * 0.35) * 0.03,
        w: 0.32,
        h: 0.44,
      },
      track: Math.min(0.99, 0.86 + face * 0.12),
      trackId: "CHILD-01",
      estimatedAgeYears: 3,
    };
  });
}