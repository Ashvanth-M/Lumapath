/**
 * Camera recording built on MediaRecorder.
 *
 * The old record screen opened a camera preview, ran a timer, and captured
 * nothing — its own UI said "recording is simulated". This actually produces a
 * File the existing analysis pipeline can consume, so a parent can record in
 * the app instead of finding a video elsewhere first.
 */

/** Codecs in preference order. WebM/VP9 first, MP4 for Safari. */
const CANDIDATE_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** The first container this browser will actually write, or null if none. */
export function preferredMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATE_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export interface RecorderHandle {
  stream: MediaStream;
  /** Resolves with the recorded file once stop() completes. */
  stop: () => Promise<File>;
  /** Abandons the recording and releases the camera. */
  cancel: () => void;
  mimeType: string;
}

export class RecorderError extends Error {
  constructor(
    message: string,
    readonly kind: "unsupported" | "permission" | "no-device" | "failed",
  ) {
    super(message);
    this.name = "RecorderError";
  }
}

/**
 * Requests camera + microphone and starts recording immediately.
 *
 * Audio is requested with echo cancellation and noise suppression **off** —
 * those processes are tuned for calls and suppress exactly the quiet, irregular
 * vocalisations this screening is trying to measure.
 */
export async function startRecording(): Promise<RecorderHandle> {
  if (!isRecordingSupported()) {
    throw new RecorderError(
      "This browser cannot record video. Record with your phone's camera app and upload the file instead.",
      "unsupported",
    );
  }

  const mimeType = preferredMimeType();
  if (!mimeType) {
    throw new RecorderError(
      "This browser supports no recording format we can analyse. Please upload a video file instead.",
      "unsupported",
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      throw new RecorderError(
        "Camera and microphone access was blocked. Allow it in your browser settings, then try again.",
        "permission",
      );
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      throw new RecorderError("No camera was found on this device.", "no-device");
    }
    throw new RecorderError("The camera could not be started.", "failed");
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const release = () => stream.getTracks().forEach((track) => track.stop());

  const stopped = new Promise<File>((resolve, reject) => {
    recorder.onstop = () => {
      release();
      if (chunks.length === 0) {
        reject(new RecorderError("Nothing was captured — the recording was empty.", "failed"));
        return;
      }
      const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType });
      resolve(
        new File([blob], `lumapath-session-${Date.now()}.${extension}`, { type: mimeType }),
      );
    };
    recorder.onerror = () => {
      release();
      reject(new RecorderError("Recording stopped unexpectedly.", "failed"));
    };
  });

  // One-second chunks so a crash loses at most a second, and so progress is
  // observable while recording.
  recorder.start(1000);

  return {
    stream,
    mimeType,
    stop: async () => {
      if (recorder.state !== "inactive") recorder.stop();
      return stopped;
    },
    cancel: () => {
      if (recorder.state !== "inactive") recorder.stop();
      release();
    },
  };
}
