/**
 * Real MediaPipe Tasks Vision inference — face landmarks and hand landmarks.
 *
 * This replaces the mock in `faceMesh.model.ts` and `hands.model.ts`, which
 * generated 468 points on a circle. Everything here calls the actual models.
 *
 * ## Before this works you must add the model files
 *
 * They are not in the repository — they are ~10 MB of binary weights, and the
 * licence is Apache-2.0 from Google. Download and place them at:
 *
 *   frontend/public/models/mediapipe/face_landmarker.task
 *   frontend/public/models/mediapipe/hand_landmarker.task
 *   frontend/public/models/mediapipe/wasm/          (the tasks-vision wasm dir)
 *
 * Sources:
 *   https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
 *   https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
 *   wasm: copy node_modules/@mediapipe/tasks-vision/wasm into public/models/mediapipe/wasm
 *
 * `isMediaPipeAvailable()` returns false until they are present, and every
 * caller falls back to the existing pixel analyser rather than failing.
 *
 * **Untested.** Written against the tasks-vision API but never run, because the
 * model files were not available. Expect to debug the first load.
 */

import type { Box } from "@/services/ai/subjectDetection.service";

const MODEL_BASE = "/models/mediapipe";

/** Landmark indices for the iris centres in the 468-point face mesh. */
const LEFT_IRIS = 468;
const RIGHT_IRIS = 473;
/** Outer eye corners, used to normalise gaze offset against face width. */
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const NOSE_TIP = 1;

export interface FaceObservation {
  box: Box;
  /** Head yaw in degrees; negative is turned left. */
  yaw: number;
  pitch: number;
  /** 0–1 estimate that the face is oriented toward the camera. */
  towardCamera: number;
  /** 0–1 smile strength from the blendshape scores. */
  smile: number;
  /** 0–1 how open the eyes are; low values mean blinking or looking down. */
  eyeOpenness: number;
  /** Normalised iris positions for the gaze overlay. */
  eyes: Array<{ x: number; y: number }>;
}

export interface HandObservation {
  /** Normalised fingertip of the index finger. */
  indexTip: { x: number; y: number };
  /** True when the index finger is extended well beyond the other fingers. */
  pointing: boolean;
  landmarks: Array<{ x: number; y: number }>;
}

export interface VisionObservation {
  faces: FaceObservation[];
  hands: HandObservation[];
}

/* --------------------------------------------------------------- loading --- */

type FaceLandmarkerType = Awaited<ReturnType<typeof createFaceLandmarker>>;
type HandLandmarkerType = Awaited<ReturnType<typeof createHandLandmarker>>;

let faceLandmarker: FaceLandmarkerType | null = null;
let handLandmarker: HandLandmarkerType | null = null;
let loadState: "idle" | "loading" | "ready" | "unavailable" = "idle";
let loadPromise: Promise<boolean> | null = null;

async function createFaceLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(`${MODEL_BASE}/wasm`);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: `${MODEL_BASE}/face_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    // Two: the child and the caregiver. Which is which is decided by the
    // parent-assisted subject selection, not by this model.
    numFaces: 2,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
}

async function createHandLandmarker() {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(`${MODEL_BASE}/wasm`);
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: `${MODEL_BASE}/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

/**
 * Loads both models once. Resolves false when the files are absent, which is
 * the normal state until someone downloads them — callers fall back rather
 * than fail.
 */
export function loadMediaPipe(): Promise<boolean> {
  if (loadPromise) return loadPromise;

  loadState = "loading";
  loadPromise = (async () => {
    try {
      [faceLandmarker, handLandmarker] = await Promise.all([
        createFaceLandmarker(),
        createHandLandmarker(),
      ]);
      loadState = "ready";
      return true;
    } catch (error) {
      // Missing .task files, no WebGL, or the package is absent. All mean the
      // same thing here: use the built-in pixel analyser instead.
      console.warn("[LumaPath] MediaPipe unavailable, falling back to pixel CV.", error);
      loadState = "unavailable";
      faceLandmarker = null;
      handLandmarker = null;
      return false;
    }
  })();

  return loadPromise;
}

export function isMediaPipeAvailable(): boolean {
  return loadState === "ready";
}

export function mediaPipeStatus() {
  return loadState;
}

/* ------------------------------------------------------------- inference --- */

/**
 * Runs both models over one frame.
 *
 * `timestampMs` must increase monotonically across calls — the VIDEO running
 * mode uses it for temporal smoothing and will throw on a decreasing value.
 */
export function observeFrame(
  source: HTMLVideoElement | HTMLCanvasElement,
  timestampMs: number,
): VisionObservation | null {
  if (!faceLandmarker || !handLandmarker) return null;

  try {
    const faceResult = faceLandmarker.detectForVideo(source, timestampMs);
    const handResult = handLandmarker.detectForVideo(source, timestampMs);

    return {
      faces: (faceResult.faceLandmarks ?? []).map((landmarks, i) =>
        toFaceObservation(landmarks, faceResult.faceBlendshapes?.[i]),
      ),
      hands: (handResult.landmarks ?? []).map(toHandObservation),
    };
  } catch {
    return null;
  }
}

type Landmark = { x: number; y: number; z?: number };
type Blendshapes = { categories: Array<{ categoryName: string; score: number }> };

function blendshape(shapes: Blendshapes | undefined, name: string): number {
  return shapes?.categories.find((c) => c.categoryName === name)?.score ?? 0;
}

function toFaceObservation(landmarks: Landmark[], shapes?: Blendshapes): FaceObservation {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = Math.max(1e-4, maxX - minX);
  const nose = landmarks[NOSE_TIP] ?? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

  // Nose offset from the face-box centre, as a share of face width, is a decent
  // yaw proxy without needing the full transformation matrix.
  const centreOffset = (nose.x - (minX + maxX) / 2) / width;
  const yaw = Math.max(-60, Math.min(60, centreOffset * 140));

  const verticalOffset = (nose.y - (minY + maxY) / 2) / Math.max(1e-4, maxY - minY);
  const pitch = Math.max(-45, Math.min(45, verticalOffset * 100));

  const smile = Math.max(
    blendshape(shapes, "mouthSmileLeft"),
    blendshape(shapes, "mouthSmileRight"),
  );
  const blink = Math.max(
    blendshape(shapes, "eyeBlinkLeft"),
    blendshape(shapes, "eyeBlinkRight"),
  );

  const eyes = [landmarks[LEFT_IRIS], landmarks[RIGHT_IRIS]]
    .filter(Boolean)
    .map((p) => ({ x: p.x, y: p.y }));
  const fallbackEyes = [landmarks[LEFT_EYE_OUTER], landmarks[RIGHT_EYE_OUTER]]
    .filter(Boolean)
    .map((p) => ({ x: p.x, y: p.y }));

  return {
    box: { x: minX, y: minY, w: width, h: Math.max(1e-4, maxY - minY) },
    yaw: Number(yaw.toFixed(1)),
    pitch: Number(pitch.toFixed(1)),
    towardCamera: Math.max(0, 1 - Math.abs(yaw) / 45),
    smile,
    eyeOpenness: 1 - blink,
    eyes: eyes.length ? eyes : fallbackEyes,
  };
}

/** Index tip clearly beyond the other fingertips reads as a point. */
function toHandObservation(landmarks: Landmark[]): HandObservation {
  const INDEX_TIP = 8;
  const MIDDLE_TIP = 12;
  const RING_TIP = 16;
  const WRIST = 0;

  const wrist = landmarks[WRIST];
  const index = landmarks[INDEX_TIP];
  const middle = landmarks[MIDDLE_TIP];
  const ring = landmarks[RING_TIP];

  const reach = (p?: Landmark) =>
    p && wrist ? Math.hypot(p.x - wrist.x, p.y - wrist.y) : 0;

  const indexReach = reach(index);
  const othersReach = Math.max(reach(middle), reach(ring));

  return {
    indexTip: index ? { x: index.x, y: index.y } : { x: 0, y: 0 },
    pointing: indexReach > othersReach * 1.25 && indexReach > 0.08,
    landmarks: landmarks.map((p) => ({ x: p.x, y: p.y })),
  };
}

/** Frees GPU resources. Call when leaving a screening session. */
export function disposeMediaPipe(): void {
  faceLandmarker?.close();
  handLandmarker?.close();
  faceLandmarker = null;
  handLandmarker = null;
  loadState = "idle";
  loadPromise = null;
}
