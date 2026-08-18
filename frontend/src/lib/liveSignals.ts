/** Live multimodal signal simulation used by the on-camera assessment. */
export interface LiveSignals {
  faceDetection: number;
  eyeContact: number;
  speech: number;
  gesture: number;
  latencyMs: number;
}

export const IDLE_SIGNALS: LiveSignals = {
  faceDetection: 0,
  eyeContact: 0,
  speech: 0,
  gesture: 0,
  latencyMs: 0,
};

function drift(value: number, target: number, jitter: number) {
  const next = value + (target - value) * 0.35 + (Math.random() - 0.5) * jitter;
  return Math.max(0, Math.min(100, next));
}

export function nextSignals(prev: LiveSignals, tick: number): LiveSignals {
  const wave = (offset: number, base: number) => base + Math.sin((tick + offset) / 3) * 16;
  return {
    faceDetection: drift(prev.faceDetection, wave(0, 88), 6),
    eyeContact: drift(prev.eyeContact, wave(2, 72), 14),
    speech: drift(prev.speech, wave(4, 61), 22),
    gesture: drift(prev.gesture, wave(6, 66), 18),
    latencyMs: Math.round(1100 + Math.sin(tick / 4) * 320 + Math.random() * 120),
  };
}

export interface CoachingCue {
  id: string;
  message: string;
  tone: "info" | "warning";
}

const CUES: CoachingCue[] = [
  { id: "closer", message: "Move a little closer — keep the face inside the frame", tone: "warning" },
  { id: "light", message: "Try better lighting: face a window or lamp", tone: "warning" },
  { id: "face", message: "Child's face is not visible — recentre the camera", tone: "warning" },
  { id: "noise", message: "Reduce background noise so speech is measurable", tone: "warning" },
  { id: "great", message: "Great framing — analysis quality is high", tone: "info" },
  { id: "pause", message: "Pause after each prompt so we can measure the response", tone: "info" },
];

/** Picks a coaching cue from the current signals, mirroring how the vision model would. */
export function coachingFor(s: LiveSignals): CoachingCue {
  if (s.faceDetection < 55) return CUES[2];
  if (s.eyeContact < 45) return CUES[0];
  if (s.speech > 88) return CUES[3];
  if (s.speech < 32) return CUES[5];
  if (s.gesture < 40) return CUES[1];
  return CUES[4];
}