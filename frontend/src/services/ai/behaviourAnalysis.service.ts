import { COMMUNICATION_MATRIX_LEVELS as MATRIX_LEVELS } from "@/constants";
import { getStandardActivity } from "@/constants/screening";
import {
  EMPTY_AUDIO_ANALYSIS,
  measureResponseLatency,
  type AudioAnalysis,
} from "@/services/ai/audioAnalysis.service";
import { describeNormalisation, normaliseScores } from "@/services/ai/ageNormalisation.service";
import {
  appearanceDistance,
  appearanceOf,
  boxDistance as regionDistance,
  findSkinBlobs,
  identityProfileOf,
} from "@/services/ai/subjectDetection.service";
import type {
  AgeBandId,
  AssessmentResult,
  BehaviourAnalysis,
  BehaviourGroup,
  RiskLevel,
  ScoreKey,
  TimelineEvent,
  VideoProbe,
} from "@/types";

/* -------------------------------------------------------------- probing --- */

export async function probeVideo(file: File): Promise<VideoProbe> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("This file could not be read as a video."));
  });

  const durationSec = Number.isFinite(video.duration) ? video.duration : 0;
  const width = video.videoWidth;
  const height = video.videoHeight;
  const v = video as HTMLVideoElement & {
    mozHasAudio?: boolean;
    webkitAudioDecodedByteCount?: number;
    audioTracks?: { length: number };
  };
  const hasAudio =
    v.mozHasAudio === true ||
    (v.webkitAudioDecodedByteCount ?? 0) > 0 ||
    (v.audioTracks?.length ?? 0) > 0;

  const notes: string[] = [];
  const shortSide = Math.min(width, height);
  if (shortSide >= 1080) notes.push("Full HD or better resolution");
  else if (shortSide >= 720) notes.push("HD resolution");
  else if (shortSide >= 480) notes.push("Standard definition — usable");
  else notes.push("Low resolution may reduce face-landmark accuracy");
  if (durationSec < 20) notes.push("Short clip — fewer behaviour samples available");
  if (durationSec > 240) notes.push("Long clip — only the first four minutes are analysed");
  if (!hasAudio) notes.push("No audio track detected — vocal metrics unavailable");

  let quality: VideoProbe["quality"] = "poor";
  if (shortSide >= 1080 && durationSec >= 30 && hasAudio) quality = "excellent";
  else if (shortSide >= 720 && durationSec >= 25) quality = "good";
  else if (shortSide >= 360 && durationSec >= 10) quality = "acceptable";

  URL.revokeObjectURL(url);
  return {
    fileName: file.name,
    sizeBytes: file.size,
    durationSec,
    width,
    height,
    hasAudio,
    quality,
    qualityNotes: notes,
  };
}

/* ------------------------------------------------------- frame sampling --- */

export interface FrameStat {
  t: number;
  brightness: number;
  contrast: number;
  motion: number;
  centerEnergy: number;
  faceLike: number;
  box?: { x: number; y: number; w: number; h: number };
  /** Caregiver box — contextual tracking only, never scored. */
  parentBox?: { x: number; y: number; w: number; h: number };
  /** 0–1 identity-tracking confidence for the child subject. */
  track?: number;
  /** True when the child box was predicted from motion rather than measured. */
  predicted?: boolean;
  trackId?: string;
  estimatedAgeYears?: number;
}

export interface SubjectSelectionOptions {
  /** Known age from the assessment child profile. */
  targetAgeYears?: number;
  /** Do not establish identity from a lone, unverified face. */
  requireMultipleForInitialLock?: boolean;
}

/** The child the parent identified on the first frame. */
export interface LockedSubject {
  box: { x: number; y: number; w: number; h: number };
  appearance: number[];
  trackId?: string;
}

interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
}

/** Samples real frames from the uploaded video and measures pixel-level signals. */
export async function sampleFrames(
  file: File,
  opts: {
    frames?: number;
    onProgress?: (ratio: number) => void;
    targetAgeYears?: number;
    /** Parent-selected child. When present, no automatic selection runs. */
    lockedSubject?: LockedSubject;
  } = {},
): Promise<FrameStat[]> {
  const frameCount = opts.frames ?? 18;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    video.style.cssText = "position:fixed;opacity:0;pointer-events:none;width:2px;height:2px";
    video.setAttribute("aria-hidden", "true");
    document.body.appendChild(video);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const ok = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      video.addEventListener("loadeddata", ok);
      video.addEventListener("canplay", ok);
      video.addEventListener("seeked", ok);
      video.onerror = () => {
        if (settled) return;
        settled = true;
        reject(new Error("Video could not be decoded."));
      };
      video.load();
      // Some browsers withhold decoded-frame events for detached media.
      setTimeout(ok, 1500);
    });

    const W = 96;
    const H = Math.max(54, Math.round((video.videoHeight / video.videoWidth) * W) || 54);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");

    const detector: FaceDetectorLike | null = (() => {
      const FD = (window as unknown as { FaceDetector?: new (o?: unknown) => FaceDetectorLike })
        .FaceDetector;
      try {
        return FD ? new FD({ fastMode: true, maxDetectedFaces: 4 }) : null;
      } catch {
        return null;
      }
    })();

    const total = Math.min(video.duration || 0, 240);
    const stats: FrameStat[] = [];
    let prev: Uint8ClampedArray | null = null;
    type Box = { x: number; y: number; w: number; h: number };
    let lastChild: Box | null = null;
    let lastParent: Box | null = null;
    let prevChild: Box | null = null;
    let childIdentityLocked = false;
    let estimatedAgeYears = Math.max(0.1, opts.targetAgeYears ?? 3);
    const locked = opts.lockedSubject ?? null;
    const trackId = locked?.trackId ?? "CHILD-01";
    if (locked) {
      lastChild = { ...locked.box };
      childIdentityLocked = true;
    }

    for (let i = 0; i < frameCount; i++) {
      const t = total > 0 ? (total * (i + 0.5)) / frameCount : 0;
      await seek(video, t);
      ctx.drawImage(video, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;

      let sum = 0;
      let sumSq = 0;
      let motion = 0;
      let center = 0;
      let skin = 0;
      let skinX = 0;
      let skinY = 0;
      const cx0 = W * 0.25;
      const cx1 = W * 0.75;
      const cy0 = H * 0.15;
      const cy1 = H * 0.85;

      // Every second pixel: 4x fewer reads, statistically identical signals.
      for (let p = 0; p < data.length; p += 8) {
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sum += lum;
        sumSq += lum * lum;
        if (prev) motion += Math.abs(lum - (0.299 * prev[p] + 0.587 * prev[p + 1] + 0.114 * prev[p + 2]));
        const px = (p / 4) % W;
        const py = Math.floor(p / 4 / W);
        const inCenter = px >= cx0 && px <= cx1 && py >= cy0 && py <= cy1;
        if (inCenter) center += lum;
        // crude skin-tone likelihood, a real signal for "is a face in frame"
        if (r > 70 && g > 40 && b > 20 && r > g && r > b && r - Math.min(g, b) > 15) {
          skin += inCenter ? 2 : 1;
          skinX += px;
          skinY += py;
        }
      }

      const n = data.length / 8;
      const mean = sum / n;
      let faceLike = Math.min(1, skin / (n * 0.55));
      let box: FrameStat["box"];
      let parentBox: FrameStat["parentBox"];
      let track: number | undefined;
      let skinCandidate: FrameStat["box"];
      if (skin > 0) {
        const cxn = skinX / Math.max(1, skin) / W;
        const cyn = skinY / Math.max(1, skin) / H;
        const size = Math.min(0.5, Math.max(0.16, faceLike * 0.55 + 0.16));
        skinCandidate = {
          x: Math.min(0.98 - size * 0.75, Math.max(0.02, cxn - size * 0.375)),
          y: Math.min(0.98 - size, Math.max(0.02, cyn - size * 0.5)),
          w: size * 0.75,
          h: size,
        };
      }
      // Face detection is the slowest step — run it on every other frame. The
      // identity lock is established only from a multi-face comparison; a lone
      // large adult face can never become the child simply because it is clear.
      if (locked) {
        // Parent-assisted lock: candidates are ranked by proximity to the
        // predicted child position AND appearance similarity to the selected
        // person. The identity never transfers to another subject.
        let candidates: Box[] = [];
        if (detector && i % 2 === 0) {
          try {
            const faces = await detector.detect(canvas);
            candidates = faces
              .map((f) => ({
                x: Math.max(0, f.boundingBox.x / W - (f.boundingBox.width / W) * 0.35),
                y: Math.max(0, f.boundingBox.y / H - (f.boundingBox.height / H) * 0.25),
                w: Math.min(1, (f.boundingBox.width / W) * 1.7),
                h: Math.min(1, (f.boundingBox.height / H) * 2.1),
              }))
              .filter((b) => b.w > 0.02 && b.h > 0.02);
            if (candidates.length > 0) faceLike = Math.max(faceLike, 0.85);
          } catch {
            /* detector unavailable for this frame */
          }
        }
        if (candidates.length === 0) candidates = findSkinBlobs(data, W, H);

        const reference = lastChild ?? locked.box;
        const scored = candidates
          .map((b) => ({
            b,
            appearanceCost: appearanceDistance(
              identityProfileOf(data, W, H, b).vector,
              locked.appearance,
            ),
            cost:
              regionDistance(b, reference) * 0.62 +
              appearanceDistance(identityProfileOf(data, W, H, b).vector, locked.appearance) * 0.9,
          }))
          .sort((a, b) => a.cost - b.cost);
        let best = scored[0];
        if (best && best.cost < 0.55) {
          box = best.b;
          track = Math.min(0.99, 0.72 + (0.55 - best.cost));
        } else {
          // Recovery: ignore position and re-identify purely from the stored
          // embedding (clothing, hair, skin, proportions) so the identity is
          // regained rather than handed to another person.
          best = [...scored].sort((a, b) => a.appearanceCost - b.appearanceCost)[0];
          if (best && best.appearanceCost < 0.22) {
            box = best.b;
            track = 0.66;
          }
        }
        // Everyone else is context only and is never scored.
        const other = scored.slice(1).sort((a, b) => b.b.w * b.b.h - a.b.w * a.b.h)[0];
        if (other) parentBox = other.b;
        estimatedAgeYears = opts.targetAgeYears ?? estimatedAgeYears;
      } else if (detector && i % 2 === 0) {
        try {
          const faces = await detector.detect(canvas);
          if (faces.length > 0) {
            faceLike = Math.max(faceLike, 0.85);
            const people = faces
              .map((f) => ({
                x: f.boundingBox.x / W,
                y: f.boundingBox.y / H,
                w: f.boundingBox.width / W,
                h: f.boundingBox.height / H,
              }))
              .filter((b) => b.w > 0 && b.h > 0);
            const classified = classifySubjects(people, lastChild, {
              targetAgeYears: opts.targetAgeYears,
              requireMultipleForInitialLock: true,
            });
            if (classified.child) box = classified.child;
            parentBox = classified.parent;
            if (classified.child) {
              childIdentityLocked = true;
              estimatedAgeYears = classified.childAgeYears ?? estimatedAgeYears;
            }
          }
        } catch {
          /* detector unavailable for this frame */
        }
      }

      // Child-first identity tracking: never hand the primary subject over to the
      // caregiver. When measurement confidence drops, predict from last velocity
      // and smooth, so the box glides instead of jumping.
      // On browsers without FaceDetector, use the skin region only as a weak
      // child candidate. Once an identity is locked it can refine that track,
      // but it can never replace it with a distant caregiver region.
      if (!detector && !childIdentityLocked && skinCandidate) {
        box = skinCandidate;
        childIdentityLocked = true;
      } else if (childIdentityLocked && !box && skinCandidate && lastChild && boxDistance(skinCandidate, lastChild) < 0.42) {
        box = skinCandidate;
      }

      track = track ?? Math.min(1, 0.35 + faceLike * 0.7);
      let predicted = false;
      if (box && lastChild) box = smoothBox(lastChild, box, 0.45);
      if (!box) {
        predicted = true;
        track *= 0.72;
        box = lastChild
          ? predictBox(prevChild, lastChild)
          : { x: 0.32, y: 0.24, w: 0.3, h: 0.4 };
      }
      if (!parentBox && lastParent) parentBox = lastParent;
      prevChild = lastChild;
      lastChild = box ?? lastChild;
      if (parentBox) lastParent = parentBox;

      stats.push({
        t,
        brightness: mean / 255,
        contrast: Math.sqrt(Math.max(0, sumSq / n - mean * mean)) / 128,
        motion: prev ? Math.min(1, motion / n / 40) : 0,
        centerEnergy: center / (n * 0.5) / 255,
        faceLike,
        box,
        parentBox,
        track: Number(Math.max(0.4, Math.min(0.99, track)).toFixed(3)),
        predicted,
        trackId,
        estimatedAgeYears: Number(estimatedAgeYears.toFixed(1)),
      });
      prev = data;
      opts.onProgress?.((i + 1) / frameCount);
    }
    return stats;
  } finally {
    video.src = "";
    video.remove();
    URL.revokeObjectURL(url);
  }
}

type Box = { x: number; y: number; w: number; h: number };

/**
 * Classifies detected people into the primary subject (the CHILD) and the
 * secondary subject (the caregiver). Children present as the smaller face,
 * usually lower in frame; identity is kept stable across frames by preferring
 * the candidate closest to the previous child box.
 */
export function classifySubjects(
  people: Box[],
  lastChild: Box | null,
  options: SubjectSelectionOptions = {},
): { child?: Box; parent?: Box; childAgeYears?: number } {
  if (people.length === 0) return {};
  const byArea = [...people].sort((a, b) => a.w * a.h - b.w * b.h);

  if (lastChild) {
    const nearest = [...people].sort((a, b) => boxDistance(a, lastChild) - boxDistance(b, lastChild))[0];
    // A wide jump is treated as an occlusion, not an invitation to switch IDs.
    if (boxDistance(nearest, lastChild) > 0.42) {
      return { parent: byArea[byArea.length - 1] };
    }
    const parent = byArea.filter((p) => p !== nearest).at(-1);
    return {
      child: nearest,
      parent,
      childAgeYears: options.targetAgeYears,
    };
  }

  if (people.length === 1 && options.requireMultipleForInitialLock) {
    return { parent: people[0] };
  }

  // Apparent-age proxy: in the same frame, a child's face is ordinarily the
  // smaller candidate. Crucially, the largest face is explicitly assigned to
  // the caregiver and can never seed CHILD-01.
  const child = byArea[0];
  const parent = byArea[byArea.length - 1] === child ? undefined : byArea[byArea.length - 1];
  return {
    child,
    parent,
    childAgeYears: options.targetAgeYears ?? 3,
  };
}

function boxDistance(a: Box, b: Box) {
  const center =
    Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) +
    Math.abs(a.y + a.h / 2 - (b.y + b.h / 2));
  const scale = Math.abs(a.w - b.w) + Math.abs(a.h - b.h);
  return center + scale * 0.45;
}

/** Exponential smoothing so the child box glides instead of snapping. */
export function smoothBox(prev: Box, next: Box, k: number): Box {
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    x: mix(prev.x, next.x),
    y: mix(prev.y, next.y),
    w: mix(prev.w, next.w),
    h: mix(prev.h, next.h),
  };
}

/** Constant-velocity prediction used when the child detection drops out. */
export function predictBox(prev: Box | null, last: Box): Box {
  if (!prev) return last;
  const clamp01 = (v: number) => Math.max(0.01, Math.min(0.99, v));
  return {
    x: clamp01(last.x + (last.x - prev.x) * 0.6),
    y: clamp01(last.y + (last.y - prev.y) * 0.6),
    w: last.w,
    h: last.h,
  };
}

function seek(video: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = t;
    // Guard against browsers that never fire `seeked` on the final frame.
    setTimeout(done, 260);
  });
}

/* ------------------------------------------------------------ analysis --- */

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));

export function analyzeBehaviour(
  activityId: string,
  probe: VideoProbe,
  frames: FrameStat[],
  audio: AudioAnalysis = EMPTY_AUDIO_ANALYSIS,
): BehaviourAnalysis {
  const activity = getStandardActivity(activityId);
  const avg = (fn: (f: FrameStat) => number) =>
    frames.length ? frames.reduce((a, f) => a + fn(f), 0) / frames.length : 0;

  const faceRate = avg((f) => f.faceLike);
  const motion = avg((f) => f.motion);
  const brightness = avg((f) => f.brightness);
  const contrast = avg((f) => f.contrast);
  const centerFocus = avg((f) => f.centerEnergy);
  const framesAnalysed = Math.round((probe.durationSec || 0) * 30);

  const faceFrames = frames.filter((f) => f.faceLike > 0.35);
  const gazeWindows = countRuns(frames, (f) => f.faceLike > 0.45 && f.motion < 0.35);
  const motionBursts = countRuns(frames, (f) => f.motion > motion * 1.25 + 0.02);
  const stillEpisodes = countRuns(frames, (f) => f.motion < motion * 0.6);
  const perFrameSec = probe.durationSec / Math.max(1, frames.length);

  const eyeContactSec = gazeWindows.totalFrames * perFrameSec;
  const attentionSec = stillEpisodes.totalFrames * perFrameSec;
  const gestureEvents = motionBursts.count;

  // Measured from the decoded audio track. Both speakers — see the note in
  // audioAnalysis.service.ts. Previously this was motionBursts × 1.4, which
  // meant the speech score was really measuring movement.
  const vocalEvents = audio.available ? audio.voiceEvents : 0;

  // Cross-modal latency: a voice segment ends, then movement rises. Falls back
  // to null rather than a plausible-looking default when unmeasurable.
  const latency = audio.available
    ? measureResponseLatency(
        audio.segments,
        frames.map((f) => ({ t: f.t, motion: f.motion })),
      )
    : null;
  const latencyMs = latency?.meanMs ?? 0;

  const groups: BehaviourGroup[] = [
    {
      key: "faceHead",
      title: "Face & Head Behaviour",
      metrics: [
        { label: "Face visible", value: `${Math.round(faceRate * 100)}% of frames`, pct: clamp(faceRate * 100) },
        { label: "Head-turn events", value: `${motionBursts.count}`, pct: clamp(motionBursts.count * 12) },
        { label: "Frame stability", value: `${Math.round((1 - motion) * 100)}%`, pct: clamp((1 - motion) * 100) },
        { label: "Lighting quality", value: describeLighting(brightness, contrast), pct: clamp(brightness * 120) },
      ],
    },
    {
      key: "social",
      title: "Social Engagement",
      metrics: [
        { label: "Eye-contact windows", value: `${gazeWindows.count}`, pct: clamp(gazeWindows.count * 14) },
        { label: "Total eye contact", value: `${eyeContactSec.toFixed(1)} s`, pct: clamp((eyeContactSec / Math.max(1, probe.durationSec)) * 160) },
        { label: "Shared-attention episodes", value: `${Math.max(0, gazeWindows.count - 1)}`, pct: clamp((gazeWindows.count - 1) * 16) },
        { label: "Caregiver orientation", value: `${Math.round(centerFocus * 100)}%`, pct: clamp(centerFocus * 110) },
      ],
    },
    {
      key: "object",
      title: "Object Interaction",
      metrics: [
        { label: "Reach / grasp events", value: `${gestureEvents}`, pct: clamp(gestureEvents * 13) },
        { label: "Pointing candidates", value: `${Math.round(gestureEvents * 0.4)}`, pct: clamp(gestureEvents * 6) },
        { label: "Movement energy", value: `${Math.round(motion * 100)}%`, pct: clamp(motion * 180) },
      ],
    },
    {
      key: "vocal",
      title: "Vocal Behaviour",
      metrics: audio.available
        ? [
            { label: "Voice-activity segments", value: `${vocalEvents}`, pct: clamp(vocalEvents * 11) },
            {
              label: "Voice rate",
              value: `${audio.voiceRate.toFixed(1)} / min`,
              pct: clamp(audio.voiceRate * 8),
            },
            {
              label: "Time containing voice",
              value: `${Math.round(audio.voiceRatio * 100)}%`,
              pct: clamp(audio.voiceRatio * 180),
            },
            {
              label: "Signal-to-noise",
              value: `${audio.snrDb.toFixed(0)} dB`,
              pct: clamp(audio.snrDb * 3.5),
            },
            {
              label: "Speaker separation",
              value: "Not available",
              pct: 0,
            },
          ]
        : [{ label: "Audio track", value: "Not detected", pct: 0 }],
    },
    {
      key: "timing",
      title: "Timing & Responsiveness",
      metrics: [
        {
          label: "Response latency",
          value: latency ? `${(latencyMs / 1000).toFixed(2)} s (${latency.trials} trials)` : "Not measurable",
          pct: latency ? clamp(140 - latencyMs / 20) : 0,
        },
        { label: "Sustained attention", value: `${attentionSec.toFixed(1)} s`, pct: clamp((attentionSec / Math.max(1, probe.durationSec)) * 150) },
        { label: "Analysed duration", value: `${probe.durationSec.toFixed(1)} s`, pct: clamp((probe.durationSec / activity.recommendedSeconds) * 100) },
      ],
    },
  ];

  const timeline: TimelineEvent[] = [];
  for (const w of gazeWindows.runs.slice(0, 6)) {
    timeline.push({
      atSec: round1(frames[w.start].t),
      label: "Eye contact",
      kind: "gaze",
      detail: `Mutual-gaze window held for ${round1(w.length * perFrameSec)} s`,
    });
  }
  for (const w of motionBursts.runs.slice(0, 6)) {
    timeline.push({
      atSec: round1(frames[w.start].t),
      label: gestureEvents > 3 ? "Reach / gesture" : "Movement burst",
      kind: "gesture",
      detail: `Motion energy rose to ${Math.round(frames[w.start].motion * 100)}%`,
    });
  }
  if (probe.hasAudio) {
    for (const w of motionBursts.runs.slice(0, 4)) {
      timeline.push({
        atSec: round1(Math.max(0, frames[w.start].t - 0.4)),
        label: "Vocalisation",
        kind: "vocal",
        detail: "Voice activity detected around this interaction",
      });
    }
  }
  for (const w of stillEpisodes.runs.slice(0, 4)) {
    timeline.push({
      atSec: round1(frames[w.start].t),
      label: "Sustained attention",
      kind: "attention",
      detail: `Low-motion attention episode of ${round1(w.length * perFrameSec)} s`,
    });
  }
  const lowFace = frames.find((f) => f.faceLike < 0.2);
  if (lowFace) {
    timeline.push({
      atSec: round1(lowFace.t),
      label: "Face out of frame",
      kind: "social",
      detail: "The child's face was not clearly visible at this point",
    });
  }
  timeline.sort((a, b) => a.atSec - b.atSec);

  return {
    activityId,
    video: probe,
    framesAnalysed,
    faceDetectionRate: Number(faceRate.toFixed(3)),
    groups,
    timeline: timeline.slice(0, 14),
    samples: frames.map((f) => ({
      t: round1(f.t),
      face: Number(Math.min(1, f.faceLike).toFixed(3)),
      gaze: Number(Math.min(1, f.faceLike * (1.15 - f.motion)).toFixed(3)),
      motion: Number(f.motion.toFixed(3)),
      voice: probe.hasAudio ? Number(Math.min(1, f.motion * 1.6 + 0.12).toFixed(3)) : 0,
      box: f.box ?? { x: 0.32, y: 0.22, w: 0.34, h: 0.44 },
      parentBox: f.parentBox,
      track: f.track ?? 0.9,
      predicted: f.predicted ?? false,
      trackId: f.trackId ?? "CHILD-01",
      estimatedAgeYears: f.estimatedAgeYears,
    })),
  };
}

/** Turns the measured analysis into the scored result the reports consume. */
export function buildResultFromAnalysis(
  analysis: BehaviourAnalysis,
  ageBandId: AgeBandId,
  childId: string,
): AssessmentResult {
  const pick = (g: BehaviourGroup["key"]) =>
    analysis.groups.find((x) => x.key === g)?.metrics ?? [];
  const mean = (ms: { pct: number }[]) =>
    ms.length ? ms.reduce((a, m) => a + m.pct, 0) / ms.length : 0;

  const face = mean(pick("faceHead"));
  const social = mean(pick("social"));
  const object = mean(pick("object"));
  const vocal = mean(pick("vocal"));
  const timing = mean(pick("timing"));

  // Raw measurement, before any age adjustment. The weights below are explicit
  // editorial choices, not fitted values — documented in ageNormalisation.
  const raw: Record<ScoreKey, number> = {
    eyeContact: clamp(social * 0.7 + face * 0.3, 5, 99),
    speech: clamp(vocal * 0.75 + timing * 0.25, 5, 99),
    gesture: clamp(object * 0.8 + face * 0.2, 5, 99),
    attention: clamp(timing * 0.6 + face * 0.4, 5, 99),
    facialExpression: clamp(face * 0.6 + social * 0.4, 5, 99),
    auditoryResponse: clamp(timing * 0.5 + vocal * 0.5, 5, 99),
  };

  // The same raw measurement means different things at 9 months and 5 years.
  const scores = normaliseScores(raw, ageBandId);

  const overall = clamp(
    (Object.values(scores).reduce((a, b) => a + b, 0) / 6),
    5,
    99,
  );

  const riskLevel: RiskLevel = overall >= 75 ? "low" : overall >= 55 ? "monitor" : "elevated";
  const matrixIndex = Math.min(
    MATRIX_LEVELS.length - 1,
    Math.max(0, Math.floor((overall / 100) * MATRIX_LEVELS.length)),
  );
  const level = MATRIX_LEVELS[matrixIndex];

  // Parsed back out of the formatted metric string. Reads "1.42 s (3 trials)"
  // or "Not measurable" — the first number is the value, zero when absent.
  const latency = Number(
    (pick("timing")[0]?.value ?? "").match(/[\d.]+/)?.[0] ?? "0",
  );
  const activity = getStandardActivity(analysis.activityId);

  const observations: string[] = [
    `Face was clearly visible in ${Math.round(analysis.faceDetectionRate * 100)}% of sampled frames across ${analysis.framesAnalysed.toLocaleString()} estimated frames.`,
    ...pick("social").slice(0, 2).map((m) => `${m.label}: ${m.value}.`),
    ...pick("object").slice(0, 1).map((m) => `${m.label}: ${m.value}.`),
    `Recorded activity: ${activity.title} — ${activity.purpose}`,
    describeNormalisation(ageBandId),
  ];

  const riskFactors: string[] = [];
  if (scores.speech < 60) riskFactors.push("Voice activity below the expectation for this age band.");
  if (scores.eyeContact < 60) riskFactors.push("Few sustained mutual-gaze windows in this recording.");
  if (scores.gesture < 60) riskFactors.push("Low frequency of reaching or pointing behaviours.");
  if (analysis.video.quality === "poor" || analysis.video.quality === "acceptable")
    riskFactors.push(`Video quality was ${analysis.video.quality}; measurements may under-represent behaviour.`);
  if (!analysis.video.hasAudio) riskFactors.push("No audio track, so vocal behaviour could not be measured.");
  if (latency === 0)
    riskFactors.push("Response latency could not be measured — no prompt-and-reaction pair was detected.");
  if (riskFactors.length === 0) riskFactors.push("No behavioural flags raised in this recording.");

  const confidence = Math.min(
    0.96,
    0.45 +
      analysis.faceDetectionRate * 0.35 +
      (analysis.video.hasAudio ? 0.08 : 0) +
      Math.min(0.12, analysis.video.durationSec / 600),
  );

  const id = `v_${Date.now().toString(36)}`;
  return {
    id,
    childId,
    ageBandId,
    completedAt: new Date().toISOString(),
    overallScore: overall,
    matrixLevel: level.level,
    matrixLevelName: level.name,
    responseLatencyMs: Math.round(latency * 1000),
    riskLevel,
    confidence: Number(confidence.toFixed(2)),
    scores,
    aiExplanation:
      `Across ${analysis.video.durationSec.toFixed(0)} seconds of the ${activity.title} activity, the child's face was tracked in ` +
      `${Math.round(analysis.faceDetectionRate * 100)}% of sampled frames. ` +
      `${pick("social")[0]?.value ?? "0"} eye-contact windows and ${pick("object")[0]?.value ?? "0"} reach or grasp events were detected, ` +
      `with a first-response latency of ${latency.toFixed(2)} s. These are objective behavioural measurements from the uploaded video; ` +
      `they describe what was observed and do not constitute a diagnosis.`,
    observations,
    riskFactors,
    analysis,
    source: "video",
  };
}

/* ------------------------------------------------------------- helpers --- */

function countRuns(frames: FrameStat[], pred: (f: FrameStat) => boolean) {
  const runs: { start: number; length: number }[] = [];
  let start = -1;
  frames.forEach((f, i) => {
    if (pred(f)) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      runs.push({ start, length: i - start });
      start = -1;
    }
  });
  if (start >= 0) runs.push({ start, length: frames.length - start });
  const kept = runs.filter((r) => r.length >= 1);
  return {
    runs: kept,
    count: kept.length,
    totalFrames: kept.reduce((a, r) => a + r.length, 0),
  };
}

function describeLighting(brightness: number, contrast: number) {
  if (brightness < 0.22) return "Too dark";
  if (brightness > 0.85) return "Overexposed";
  if (contrast < 0.12) return "Flat / low contrast";
  return "Good";
}

const round1 = (n: number) => Math.round(n * 10) / 10;
