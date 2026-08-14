/**
 * Parent-assisted subject selection.
 *
 * Automatic "largest face = child" heuristics are unreliable, so the parent
 * identifies the child once on the first frame. This module finds candidate
 * people on that frame and builds a compact appearance descriptor that the
 * frame sampler later uses to keep the same track locked.
 */

export type Box = { x: number; y: number; w: number; h: number };

export interface DetectedPerson {
  index: number;
  box: Box;
  /** Compact appearance signature used for re-identification. */
  appearance: number[];
  /** Relative confidence of the raw detection. */
  score: number;
  source: "face-detector" | "region";
}

export interface FirstFrameDetection {
  frameUrl: string;
  atSec: number;
  width: number;
  height: number;
  people: DetectedPerson[];
}

const AW = 96; // analysis width

interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
}

function makeDetector(): FaceDetectorLike | null {
  const FD = (window as unknown as { FaceDetector?: new (o?: unknown) => FaceDetectorLike })
    .FaceDetector;
  try {
    return FD ? new FD({ fastMode: true, maxDetectedFaces: 6 }) : null;
  } catch {
    return null;
  }
}

const isSkin = (r: number, g: number, b: number) =>
  r > 70 && g > 40 && b > 20 && r > g && r > b && r - Math.min(g, b) > 15;

/**
 * Connected-component skin-region grouping — the fallback candidate finder for
 * browsers without the Shape Detection API.
 */
export function findSkinBlobs(data: Uint8ClampedArray, W: number, H: number): Box[] {
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const p = i * 4;
    if (isSkin(data[p], data[p + 1], data[p + 2])) mask[i] = 1;
  }
  const seen = new Uint8Array(W * H);
  const blobs: { minX: number; maxX: number; minY: number; maxY: number; n: number }[] = [];
  const stack: number[] = [];
  for (let i = 0; i < W * H; i++) {
    if (!mask[i] || seen[i]) continue;
    stack.length = 0;
    stack.push(i);
    seen[i] = 1;
    let minX = W, maxX = 0, minY = H, maxY = 0, n = 0;
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % W;
      const y = (j - x) / W;
      n++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const k = ny * W + nx;
          if (mask[k] && !seen[k]) {
            seen[k] = 1;
            stack.push(k);
          }
        }
      }
    }
    if (n >= Math.max(6, (W * H) / 900)) blobs.push({ minX, maxX, minY, maxY, n });
  }
  return blobs
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map((b) => {
      const x = b.minX / W;
      const y = b.minY / H;
      const w = Math.max(0.06, (b.maxX - b.minX + 1) / W);
      const h = Math.max(0.08, (b.maxY - b.minY + 1) / H);
      // Widen slightly so the box reads as a person region, not a skin patch.
      const px = Math.min(0.06, w * 0.25);
      const py = Math.min(0.08, h * 0.25);
      return {
        x: Math.max(0, x - px),
        y: Math.max(0, y - py),
        w: Math.min(1 - Math.max(0, x - px), w + px * 2),
        h: Math.min(1 - Math.max(0, y - py), h + py * 2),
      };
    });
}

/** Mean-colour + geometry signature of a normalised box within a frame. */
export function appearanceOf(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  box: Box,
): number[] {
  const x0 = Math.max(0, Math.floor(box.x * W));
  const x1 = Math.min(W - 1, Math.ceil((box.x + box.w) * W));
  const y0 = Math.max(0, Math.floor(box.y * H));
  const y1 = Math.min(H - 1, Math.ceil((box.y + box.h) * H));
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = (y * W + x) * 4;
      r += data[p];
      g += data[p + 1];
      b += data[p + 2];
      n++;
    }
  }
  n = Math.max(1, n);
  return [
    r / n / 255,
    g / n / 255,
    b / n / 255,
    Math.min(1, box.w * box.h * 6),
    box.y + box.h / 2,
  ];
}

export function appearanceDistance(a: number[] | undefined, b: number[] | undefined) {
  if (!a || !b) return 0.5;
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) d += Math.abs(a[i] - b[i]);
  return d / Math.min(a.length, b.length);
}

/* ------------------------------------------------- identity embedding --- */

export interface IdentityProfile {
  /** Comparable embedding: face + hair + clothing colour + body proportions. */
  vector: number[];
  skinHex: string;
  hairHex: string;
  clothingHex: string;
  /** Height / width ratio of the selected region. */
  proportion: number;
}

function meanColour(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  box: Box,
): [number, number, number] {
  const x0 = Math.max(0, Math.floor(box.x * W));
  const x1 = Math.min(W - 1, Math.ceil((box.x + box.w) * W));
  const y0 = Math.max(0, Math.floor(box.y * H));
  const y1 = Math.min(H - 1, Math.ceil((box.y + box.h) * H));
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = (y * W + x) * 4;
      r += data[p];
      g += data[p + 1];
      b += data[p + 2];
      n++;
    }
  }
  n = Math.max(1, n);
  return [r / n, g / n, b / n];
}

const hex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;

/**
 * Builds the locked identity embedding for a selected region: hair band,
 * face band, upper-body clothing band and body proportions. Used both when
 * the parent confirms the child and on every sampled frame for re-identification.
 */
export function identityProfileOf(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  box: Box,
): IdentityProfile {
  const hair = meanColour(data, W, H, { x: box.x, y: box.y, w: box.w, h: Math.max(0.01, box.h * 0.18) });
  const face = meanColour(data, W, H, {
    x: box.x + box.w * 0.2,
    y: box.y + box.h * 0.2,
    w: Math.max(0.01, box.w * 0.6),
    h: Math.max(0.01, box.h * 0.28),
  });
  const cloth = meanColour(data, W, H, {
    x: box.x,
    y: Math.min(0.99, box.y + box.h * 0.55),
    w: box.w,
    h: Math.max(0.01, box.h * 0.45),
  });
  const proportion = box.h / Math.max(0.01, box.w);
  return {
    vector: [
      face[0] / 255, face[1] / 255, face[2] / 255,
      hair[0] / 255, hair[1] / 255, hair[2] / 255,
      cloth[0] / 255, cloth[1] / 255, cloth[2] / 255,
      Math.min(1, box.w * box.h * 6),
      box.y + box.h / 2,
      Math.min(1, proportion / 4),
    ],
    skinHex: hex(face),
    hairHex: hex(hair),
    clothingHex: hex(cloth),
    proportion,
  };
}

/** Reads the identity embedding for a hand-drawn region on the paused frame. */
export async function identityFromFrameRegion(
  frameUrl: string,
  box: Box,
): Promise<IdentityProfile> {
  const img = new Image();
  img.src = frameUrl;
  await img.decode().catch(
    () =>
      new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }),
  );
  const W = Math.max(16, Math.min(160, img.naturalWidth || 96));
  const H = Math.max(16, Math.round(((img.naturalHeight || 54) / (img.naturalWidth || 96)) * W));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable in this browser.");
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;
  return identityProfileOf(data, W, H, box);
}

export function boxDistance(a: Box, b: Box) {
  const center =
    Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)) + Math.abs(a.y + a.h / 2 - (b.y + b.h / 2));
  const scale = Math.abs(a.w - b.w) + Math.abs(a.h - b.h);
  return center + scale * 0.45;
}

/** Extracts a representative early frame and every person visible in it. */
export async function detectPeopleInFirstFrame(file: File): Promise<FirstFrameDetection> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  video.style.cssText = "position:fixed;opacity:0;pointer-events:none;width:2px;height:2px";
  video.setAttribute("aria-hidden", "true");
  document.body.appendChild(video);

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const ok = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      video.addEventListener("loadeddata", ok);
      video.addEventListener("canplay", ok);
      video.onerror = () => {
        if (settled) return;
        settled = true;
        reject(new Error("This video could not be decoded in your browser."));
      };
      video.load();
      setTimeout(ok, 1800);
    });

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 360;
    const atSec = Math.min(1.2, Math.max(0, (video.duration || 2) * 0.2));
    await new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
      video.currentTime = atSec;
      setTimeout(done, 700);
    });

    // Display frame — full resolution capped for memory.
    const dw = Math.min(1280, vw);
    const dh = Math.round((vh / vw) * dw);
    const display = document.createElement("canvas");
    display.width = dw;
    display.height = dh;
    display.getContext("2d")?.drawImage(video, 0, 0, dw, dh);
    const frameUrl = display.toDataURL("image/jpeg", 0.82);

    // Analysis frame — small, for detection and appearance signatures.
    const H = Math.max(54, Math.round((vh / vw) * AW));
    const canvas = document.createElement("canvas");
    canvas.width = AW;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable in this browser.");
    ctx.drawImage(video, 0, 0, AW, H);
    const data = ctx.getImageData(0, 0, AW, H).data;

    let boxes: Box[] = [];
    let source: DetectedPerson["source"] = "region";
    const detector = makeDetector();
    if (detector) {
      try {
        const faces = await detector.detect(canvas);
        const mapped = faces
          .map((f) => ({
            x: f.boundingBox.x / AW,
            y: f.boundingBox.y / H,
            w: f.boundingBox.width / AW,
            h: f.boundingBox.height / H,
          }))
          .filter((b) => b.w > 0.02 && b.h > 0.02);
        if (mapped.length > 0) {
          // Grow a face box into a person region so it is easy to tap.
          boxes = mapped.map((b) => ({
            x: Math.max(0, b.x - b.w * 0.35),
            y: Math.max(0, b.y - b.h * 0.25),
            w: Math.min(1, b.w * 1.7),
            h: Math.min(1 - Math.max(0, b.y - b.h * 0.25), b.h * 2.1),
          }));
          source = "face-detector";
        }
      } catch {
        /* fall through to region detection */
      }
    }
    if (boxes.length === 0) boxes = findSkinBlobs(data, AW, H);
    if (boxes.length === 0) {
      // Guarantee something selectable: split the frame into two regions.
      boxes = [
        { x: 0.08, y: 0.18, w: 0.36, h: 0.62 },
        { x: 0.54, y: 0.18, w: 0.36, h: 0.62 },
      ];
    }

    const people: DetectedPerson[] = boxes
      .sort((a, b) => a.x - b.x)
      .slice(0, 5)
      .map((box, i) => ({
        index: i + 1,
        box,
        appearance: appearanceOf(data, AW, H, box),
        score: source === "face-detector" ? 0.94 : 0.72,
        source,
      }));

    return { frameUrl, atSec, width: dw, height: dh, people };
  } finally {
    video.src = "";
    video.remove();
    URL.revokeObjectURL(url);
  }
}
