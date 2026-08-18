/**
 * Decides whether a recording can support a score at all.
 *
 * Previously a poor recording still produced a confident-looking number with a
 * slightly lower confidence value attached. A parent reading "48/100, elevated
 * risk" has no way to know the real finding was "the camera barely saw your
 * child". Refusing to score is more useful — and more honest — than scoring
 * badly, because the fix is simply to record again.
 */
import type { FrameStat } from "@/services/ai/behaviourAnalysis.service";
import type { VideoProbe } from "@/types";

export interface QualityVerdict {
  /** False when the recording cannot support a score. */
  scorable: boolean;
  /** Why it was rejected, in words a parent can act on. */
  reasons: string[];
  /** Concrete steps to fix it before re-recording. */
  fixes: string[];
  /** Non-blocking issues that should temper interpretation. */
  warnings: string[];
}

/** Below this share of frames containing a face, there is nothing to measure. */
const MIN_FACE_RATE = 0.25;
/** Shorter than this and the sample is too small to mean anything. */
const MIN_DURATION_SEC = 8;
/** Below this the image is too dark for skin-tone or landmark detection. */
const MIN_BRIGHTNESS = 0.12;
/** Above this the image is blown out and detail is gone. */
const MAX_BRIGHTNESS = 0.92;

export function assessQuality(probe: VideoProbe, frames: FrameStat[]): QualityVerdict {
  const reasons: string[] = [];
  const fixes: string[] = [];
  const warnings: string[] = [];

  if (frames.length === 0) {
    return {
      scorable: false,
      reasons: ["No frames could be read from this video."],
      fixes: ["Re-export the clip as MP4 (H.264) or WebM and try again."],
      warnings: [],
    };
  }

  const avg = (fn: (f: FrameStat) => number) =>
    frames.reduce((a, f) => a + fn(f), 0) / frames.length;

  const faceRate = avg((f) => f.faceLike);
  const brightness = avg((f) => f.brightness);
  const motion = avg((f) => f.motion);

  if (probe.durationSec < MIN_DURATION_SEC) {
    reasons.push(`The clip is only ${probe.durationSec.toFixed(0)} seconds long.`);
    fixes.push("Record for at least 30 seconds so there are enough moments to measure.");
  }

  if (faceRate < MIN_FACE_RATE) {
    reasons.push(
      `A face was visible in only ${Math.round(faceRate * 100)}% of the frames sampled.`,
    );
    fixes.push("Place the camera at your child's eye level, about one metre away, facing them.");
  }

  if (brightness < MIN_BRIGHTNESS) {
    reasons.push("The recording is too dark to track faces reliably.");
    fixes.push("Record near a window during the day, or turn on more lights.");
  } else if (brightness > MAX_BRIGHTNESS) {
    reasons.push("The recording is over-exposed, so facial detail is lost.");
    fixes.push("Avoid pointing the camera at a window or bright light behind your child.");
  }

  /* -------- non-blocking, but worth surfacing on the report -------- */

  if (Math.min(probe.width, probe.height) < 480) {
    warnings.push("Low resolution reduces the accuracy of face and gesture measures.");
  }
  if (!probe.hasAudio) {
    warnings.push("No audio track, so vocal behaviour could not be measured at all.");
  }
  if (motion > 0.5) {
    warnings.push("The camera moved a lot, which inflates the movement-based measures.");
  }
  if (probe.durationSec >= MIN_DURATION_SEC && probe.durationSec < 25) {
    warnings.push("Short clip — fewer samples than a full activity provides.");
  }

  return { scorable: reasons.length === 0, reasons, fixes, warnings };
}
