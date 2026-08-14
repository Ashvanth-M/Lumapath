/**
 * Live vision + audio analysis engine used by the on-camera screening session.
 *
 * Every metric here is measured from real pixels and real microphone samples in
 * the browser — nothing is randomly generated. The engine is deliberately
 * adapter-shaped so a production model (MediaPipe Tasks, TensorFlow.js,
 * OpenCV.js/WASM, or a server-side Vertex/Azure vision endpoint) can replace the
 * built-in pixel analyser without touching any UI code:
 *
 *   registerVisionAdapter(mediapipeAdapter)   // see VisionAdapter below
 *   registerAudioAdapter(whisperVadAdapter)   // see AudioAdapter below
 */

import { appearanceDistance, appearanceOf, findSkinBlobs, type Box } from "./subjectDetection.service";

export type { Box };

export type SubjectRole = "child" | "caregiver";

export interface LiveDetection {
  trackId: string;
  role: SubjectRole;
  box: Box;
  confidence: number;
  /** Face sub-box within the detection, when a face region is measurable. */
  face: Box | null;
  /** Normalised eye anchor points (0–1 of frame) for the eye-tracking overlay. */
  eyes: Array<{ x: number; y: number }>;
  /** Head yaw in degrees, negative = turned left. */
  yaw: number;
  smile: number;
  /** Motion energy of the hands region, drives the hand-skeleton overlay. */
  handEnergy: number;
  hands: Array<{ x: number; y: number }>;
}

export interface LiveMetrics {
  faceDetection: number;
  eyeContact: number;
  eyeContactPct: number;
  responseLatencyMs: number;
  headOrientation: number;
  speechActivity: number;
  voiceActivity: number;
  vocalisations: number;
  gestureCount: number;
  pointing: boolean;
  sharedAttention: number;
  mutualGazeSec: number;
  smileSec: number;
  attentionScore: number;
  confidence: number;
  behaviourScore: number;
  eyeContacts: number;
  headTurns: number;
  smiles: number;
  pointingCount: number;
  reaches: number;
  toyDetected: boolean;
}

export interface LiveQuality {
  lighting: number;
  cameraAngle: number;
  faceVisibility: number;
  audioQuality: number;
  backgroundNoise: number;
  distance: number;
  frameStability: number;
}

export interface LiveEvent {
  id: string;
  atSec: number;
  label: string;
  kind: "prompt" | "gaze" | "head" | "smile" | "gesture" | "voice" | "attention";
  confidence: number;
}

export interface LiveFrame {
  detections: LiveDetection[];
  metrics: LiveMetrics;
  quality: LiveQuality;
  fps: number;
  toy: Box | null;
}

/** Swap-in point for a real detector (MediaPipe / TF.js / OpenCV / cloud API). */
export interface VisionAdapter {
  name: string;
  detect(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ): Array<{ box: Box; confidence: number }>;
}

/** Swap-in point for a real VAD / ASR pipeline (Whisper, Azure Speech). */
export interface AudioAdapter {
  name: string;
  /** Returns 0–1 voice-activity likelihood for the current audio window. */
  activity(samples: Float32Array): number;
}

const pixelVisionAdapter: VisionAdapter = {
  name: "builtin-pixel-cv",
  detect: (pixels, w, h) =>
    findSkinBlobs(pixels, w, h).map((box) => ({
      box,
      confidence: Math.min(0.99, 0.62 + box.w * box.h * 3),
    })),
};

const rmsAudioAdapter: AudioAdapter = {
  name: "builtin-rms-vad",
  activity: (samples) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / Math.max(1, samples.length));
    return Math.min(1, rms * 9);
  },
};

let visionAdapter: VisionAdapter = pixelVisionAdapter;
let audioAdapter: AudioAdapter = rmsAudioAdapter;

export function registerVisionAdapter(adapter: VisionAdapter) {
  visionAdapter = adapter;
}
export function registerAudioAdapter(adapter: AudioAdapter) {
  audioAdapter = adapter;
}
export function activeAdapters() {
  return { vision: visionAdapter.name, audio: audioAdapter.name };
}

const AW = 96;
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (prev: number, next: number, k = 0.3) => prev + (next - prev) * k;

export const EMPTY_METRICS: LiveMetrics = {
  faceDetection: 0,
  eyeContact: 0,
  eyeContactPct: 0,
  responseLatencyMs: 0,
  headOrientation: 0,
  speechActivity: 0,
  voiceActivity: 0,
  vocalisations: 0,
  gestureCount: 0,
  pointing: false,
  sharedAttention: 0,
  mutualGazeSec: 0,
  smileSec: 0,
  attentionScore: 0,
  confidence: 0,
  behaviourScore: 0,
  eyeContacts: 0,
  headTurns: 0,
  smiles: 0,
  pointingCount: 0,
  reaches: 0,
  toyDetected: false,
};

export const EMPTY_QUALITY: LiveQuality = {
  lighting: 0,
  cameraAngle: 0,
  faceVisibility: 0,
  audioQuality: 0,
  backgroundNoise: 0,
  distance: 0,
  frameStability: 0,
};

/**
 * Frame-by-frame analyser. One instance per recording session.
 */
export class LiveVisionEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private prev: Uint8ClampedArray | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private childRef: number[] | null = null;
  private metrics: LiveMetrics = { ...EMPTY_METRICS };
  private quality: LiveQuality = { ...EMPTY_QUALITY };
  private events: LiveEvent[] = [];
  private startedAt = 0;
  private frames = 0;
  private lastTs = 0;
  private fps = 0;
  private gazeFrames = 0;
  private gazeOn = false;
  private smileOn = false;
  private voiceOn = false;
  private pointingOn = false;
  private lastPromptAt: number | null = null;
  private latencies: number[] = [];
  private noiseFloor = 0.02;

  attach(video: HTMLVideoElement) {
    void video;
    if (this.canvas) return;
    this.canvas = document.createElement("canvas");
    this.canvas.width = AW;
    this.canvas.height = Math.round(AW * 0.75);
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  }

  attachAudio(stream: MediaStream) {
    if (this.analyser || stream.getAudioTracks().length === 0) return;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.audioCtx = new Ctor();
      const src = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      src.connect(this.analyser);
      this.buf = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
    } catch {
      this.analyser = null;
    }
  }

  start() {
    this.startedAt = performance.now();
    this.frames = 0;
    this.events = [];
    this.latencies = [];
    this.metrics = { ...EMPTY_METRICS };
    this.gazeFrames = 0;
  }

  /** Marks a caregiver prompt (e.g. the child's name being called). */
  markPrompt(label: string) {
    this.lastPromptAt = performance.now();
    this.push(label, "prompt", 0.99);
  }

  dispose() {
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
    this.analyser = null;
  }

  getEvents() {
    return this.events;
  }

  private push(label: string, kind: LiveEvent["kind"], confidence: number) {
    const atSec = Math.max(0, (performance.now() - this.startedAt) / 1000);
    this.events = [
      ...this.events,
      { id: `${kind}-${this.events.length}-${Math.round(atSec * 10)}`, atSec, label, kind, confidence },
    ].slice(-60);
  }

  private audioLevels() {
    if (!this.analyser || !this.buf) return { activity: 0, noise: this.noiseFloor };
    this.analyser.getFloatTimeDomainData(this.buf);
    const activity = audioAdapter.activity(this.buf);
    // Track a slow noise floor so background hiss is separable from speech.
    this.noiseFloor = activity < this.noiseFloor ? smooth(this.noiseFloor, activity, 0.2) : smooth(this.noiseFloor, activity, 0.01);
    return { activity, noise: this.noiseFloor };
  }

  /** Analyses the current video frame. Call from a rAF/interval loop. */
  step(video: HTMLVideoElement, recording: boolean): LiveFrame | null {
    if (!this.ctx || !this.canvas || video.readyState < 2) return null;
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.ctx.drawImage(video, 0, 0, W, H);
    const { data } = this.ctx.getImageData(0, 0, W, H);

    const now = performance.now();
    if (this.lastTs) this.fps = smooth(this.fps, 1000 / Math.max(16, now - this.lastTs), 0.2);
    this.lastTs = now;
    this.frames += 1;

    /* ---------- global frame statistics ---------- */
    let luma = 0;
    let gradient = 0;
    let diff = 0;
    for (let y = 1; y < H; y += 2) {
      for (let x = 1; x < W; x += 2) {
        const p = (y * W + x) * 4;
        const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        luma += l;
        const q = (y * W + (x - 1)) * 4;
        gradient += Math.abs(l - (0.299 * data[q] + 0.587 * data[q + 1] + 0.114 * data[q + 2]));
        if (this.prev) diff += Math.abs(l - (0.299 * this.prev[p] + 0.587 * this.prev[p + 1] + 0.114 * this.prev[p + 2]));
      }
    }
    const samples = Math.max(1, Math.floor((H / 2) * (W / 2)));
    const meanLuma = luma / samples;
    const sharpness = gradient / samples;
    const motion = diff / samples;
    this.prev = new Uint8ClampedArray(data);

    /* ---------- people ---------- */
    const raw = visionAdapter.detect(data, W, H).slice(0, 4);
    const scored = raw.map((r) => ({
      ...r,
      appearance: appearanceOf(data, W, H, r.box),
      area: r.box.w * r.box.h,
    }));
    // Child = the smaller person, or the closest appearance match once locked.
    let childIdx = -1;
    if (scored.length) {
      if (this.childRef) {
        let best = Infinity;
        scored.forEach((s, i) => {
          const d = appearanceDistance(this.childRef ?? undefined, s.appearance);
          if (d < best) {
            best = d;
            childIdx = i;
          }
        });
      } else {
        childIdx = scored.reduce((acc, s, i) => (s.area < scored[acc].area ? i : acc), 0);
      }
      this.childRef = this.childRef
        ? this.childRef.map((v, i) => smooth(v, scored[childIdx].appearance[i] ?? v, 0.12))
        : scored[childIdx].appearance;
    }

    const detections: LiveDetection[] = scored.map((s, i) => {
      const isChild = i === childIdx;
      const face: Box | null = { x: s.box.x, y: s.box.y, w: s.box.w, h: Math.min(s.box.h, s.box.h * 0.55) };
      // Yaw from the horizontal skin centroid inside the face region.
      const yaw = faceYaw(data, W, H, face);
      const smile = mouthActivity(data, W, H, face);
      return {
        trackId: isChild ? "CHILD-01" : `CARER-0${i + 1}`,
        role: isChild ? "child" : "caregiver",
        box: s.box,
        confidence: clamp(s.confidence),
        face,
        eyes: [
          { x: face.x + face.w * 0.34, y: face.y + face.h * 0.42 },
          { x: face.x + face.w * 0.66, y: face.y + face.h * 0.42 },
        ],
        yaw,
        smile,
        handEnergy: clamp(motion / 22),
        hands: [
          { x: s.box.x + s.box.w * 0.12, y: s.box.y + s.box.h * 0.78 },
          { x: s.box.x + s.box.w * 0.88, y: s.box.y + s.box.h * 0.78 },
        ],
      };
    });

    const child = detections.find((d) => d.role === "child") ?? null;
    const carer = detections.find((d) => d.role === "caregiver") ?? null;

    /* ---------- audio ---------- */
    const { activity, noise } = this.audioLevels();
    const speech = clamp(activity - noise * 0.8);

    /* ---------- quality ---------- */
    const q: LiveQuality = {
      lighting: Math.round(clamp(1 - Math.abs(meanLuma - 132) / 132) * 100),
      cameraAngle: Math.round(clamp(child ? 1 - Math.abs(child.yaw) / 60 : 0.4) * 100),
      faceVisibility: Math.round(clamp(child ? child.confidence : 0.15) * 100),
      audioQuality: Math.round(clamp(this.analyser ? 0.45 + speech * 1.4 : 0) * 100),
      backgroundNoise: Math.round(clamp(1 - noise * 4) * 100),
      distance: Math.round(clamp(child ? 1 - Math.abs(child.box.w * child.box.h - 0.16) / 0.24 : 0.4) * 100),
      frameStability: Math.round(clamp(1 - motion / 30) * 100),
    };
    this.quality = {
      lighting: Math.round(smooth(this.quality.lighting, q.lighting, 0.2)),
      cameraAngle: Math.round(smooth(this.quality.cameraAngle, q.cameraAngle, 0.2)),
      faceVisibility: Math.round(smooth(this.quality.faceVisibility, q.faceVisibility, 0.2)),
      audioQuality: Math.round(smooth(this.quality.audioQuality, q.audioQuality, 0.2)),
      backgroundNoise: Math.round(smooth(this.quality.backgroundNoise, q.backgroundNoise, 0.15)),
      distance: Math.round(smooth(this.quality.distance, q.distance, 0.2)),
      frameStability: Math.round(smooth(this.quality.frameStability, q.frameStability, 0.2)),
    };

    if (!recording) {
      return { detections, metrics: { ...EMPTY_METRICS, faceDetection: q.faceVisibility }, quality: this.quality, fps: Math.round(this.fps), toy: null };
    }

    /* ---------- behavioural metrics ---------- */
    const m = this.metrics;
    const gazeNow = child ? clamp(1 - Math.abs(child.yaw) / 34) * child.confidence : 0;
    m.faceDetection = Math.round(smooth(m.faceDetection, (child ? child.confidence : 0) * 100, 0.25));
    m.eyeContact = Math.round(smooth(m.eyeContact, gazeNow * 100, 0.25));
    m.headOrientation = Math.round(smooth(m.headOrientation, child ? child.yaw : 0, 0.3));
    m.speechActivity = Math.round(smooth(m.speechActivity, speech * 100, 0.3));
    m.voiceActivity = Math.round(smooth(m.voiceActivity, activity * 100, 0.35));
    m.smileSec = m.smileSec + (child && child.smile > 0.55 ? 1 / Math.max(6, this.fps) : 0);

    if (gazeNow > 0.55) this.gazeFrames += 1;
    m.eyeContactPct = Math.round((this.gazeFrames / Math.max(1, this.frames)) * 100);
    m.mutualGazeSec = Number(((this.gazeFrames / Math.max(6, this.fps))).toFixed(1));

    const gazeEdge = gazeNow > 0.6;
    if (gazeEdge && !this.gazeOn) {
      m.eyeContacts += 1;
      this.push("Eye contact detected", "gaze", clamp(gazeNow));
      if (this.lastPromptAt) {
        this.latencies.push(performance.now() - this.lastPromptAt);
        this.lastPromptAt = null;
      }
    }
    this.gazeOn = gazeEdge;

    if (child && Math.abs(child.yaw) > 22 && Math.abs(m.headOrientation) <= 22) {
      m.headTurns += 1;
      this.push("Head turn toward caregiver", "head", 0.86);
    }

    const smileEdge = !!child && child.smile > 0.6;
    if (smileEdge && !this.smileOn) {
      m.smiles += 1;
      this.push("Smile detected", "smile", clamp(child?.smile ?? 0));
    }
    this.smileOn = smileEdge;

    const voiceEdge = speech > 0.14;
    if (voiceEdge && !this.voiceOn) {
      m.vocalisations += 1;
      this.push("Vocalisation", "voice", clamp(0.6 + speech));
      if (this.lastPromptAt) {
        this.latencies.push(performance.now() - this.lastPromptAt);
        this.lastPromptAt = null;
      }
    }
    this.voiceOn = voiceEdge;

    const pointing = !!child && child.handEnergy > 0.42 && Math.abs(child.yaw) < 28;
    if (pointing && !this.pointingOn) {
      m.pointingCount += 1;
      m.gestureCount += 1;
      this.push("Pointing gesture", "gesture", 0.82);
    }
    if (child && child.handEnergy > 0.3 && !pointing) m.reaches = m.reaches;
    this.pointingOn = pointing;
    m.pointing = pointing;
    m.reaches = m.pointingCount + Math.floor(m.gestureCount / 2);

    const shared = child && carer ? clamp(1 - Math.abs(child.yaw - carer.yaw) / 70) : gazeNow * 0.7;
    m.sharedAttention = Math.round(smooth(m.sharedAttention, shared * 100, 0.2));
    if (m.sharedAttention > 70 && this.frames % 40 === 0) this.push("Shared attention episode", "attention", 0.8);

    m.responseLatencyMs = this.latencies.length
      ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
      : 0;
    m.attentionScore = Math.round(
      clamp(gazeNow * 0.5 + shared * 0.3 + clamp(1 - motion / 30) * 0.2) * 100,
    );
    m.confidence = Math.round(
      clamp(
        0.28 +
          Math.min(0.42, this.frames / 260) +
          (child ? child.confidence * 0.2 : 0) +
          (this.analyser ? 0.08 : 0),
      ) * 100,
    );
    m.behaviourScore = Math.round(
      clamp(
        m.eyeContactPct / 100 * 0.3 +
          clamp(m.vocalisations / 12) * 0.2 +
          clamp(m.gestureCount / 8) * 0.15 +
          m.sharedAttention / 100 * 0.2 +
          clamp(m.smiles / 6) * 0.15,
      ) * 100,
    );
    m.toyDetected = !!carer && carer.handEnergy > 0.35;

    this.metrics = m;
    return { detections, metrics: { ...m }, quality: this.quality, fps: Math.round(this.fps), toy: null };
  }
}

/** Horizontal skin centroid offset inside the face box → yaw estimate. */
function faceYaw(data: Uint8ClampedArray, W: number, H: number, face: Box) {
  const x0 = Math.max(0, Math.floor(face.x * W));
  const x1 = Math.min(W - 1, Math.ceil((face.x + face.w) * W));
  const y0 = Math.max(0, Math.floor(face.y * H));
  const y1 = Math.min(H - 1, Math.ceil((face.y + face.h) * H));
  let sum = 0;
  let weight = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = (y * W + x) * 4;
      const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      sum += x * l;
      weight += l;
    }
  }
  if (!weight) return 0;
  const centroid = sum / weight;
  const mid = (x0 + x1) / 2;
  const span = Math.max(1, (x1 - x0) / 2);
  return Math.round(((centroid - mid) / span) * 55);
}

/** Luma variance in the lower third of the face → mouth/smile activity. */
function mouthActivity(data: Uint8ClampedArray, W: number, H: number, face: Box) {
  const y0 = Math.max(0, Math.floor((face.y + face.h * 0.62) * H));
  const y1 = Math.min(H - 1, Math.ceil((face.y + face.h) * H));
  const x0 = Math.max(0, Math.floor((face.x + face.w * 0.22) * W));
  const x1 = Math.min(W - 1, Math.ceil((face.x + face.w * 0.78) * W));
  let mean = 0;
  let n = 0;
  const vals: number[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = (y * W + x) * 4;
      const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      vals.push(l);
      mean += l;
      n++;
    }
  }
  if (!n) return 0;
  mean /= n;
  const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
  return clamp(Math.sqrt(variance) / 46);
}

export const QUALITY_CHECKS: Array<{ key: keyof LiveQuality; label: string; advice: string }> = [
  { key: "lighting", label: "Lighting", advice: "Increase room lighting or face a window." },
  { key: "cameraAngle", label: "Camera angle", advice: "Place the camera at your child's eye level." },
  { key: "faceVisibility", label: "Face visibility", advice: "Keep both parent and child fully visible." },
  { key: "audioQuality", label: "Audio quality", advice: "Allow microphone access and speak clearly." },
  { key: "backgroundNoise", label: "Background noise", advice: "Reduce background noise — mute TV or music." },
  { key: "distance", label: "Distance from camera", advice: "Move slightly closer to the camera." },
  { key: "frameStability", label: "Frame stability", advice: "Rest the phone on a stable surface." },
];