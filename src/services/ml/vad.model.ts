/**
 * Silero-style Voice Activity Detection (mock).
 * Real drop-in: silero_vad.onnx via ONNX Runtime Web, 30 ms frames @ 16 kHz.
 */
import { loadGraphModel, predict } from "./tfjsRuntime";
import type { InferenceResult, ModelDescriptor } from "./types";

export const VAD_MODEL: ModelDescriptor = {
  id: "silero-vad",
  name: "Voice Activity Detection",
  vendor: "Silero VAD",
  task: "Speech / vocalisation segmentation · turn taking",
  backend: "onnx-wasm",
  weights: "/models/vad/silero_vad.onnx",
  sizeMB: 1.8,
  inputShape: "[1,480]",
  outputShape: "[1,1]",
  targetFps: 33,
};

export interface VadOutput {
  speech: boolean;
  probability: number;
  snrDb: number;
}

export const loadVad = () => loadGraphModel(VAD_MODEL);

/** `samples` is a mono PCM window; the mock uses RMS as the probability proxy. */
export function runVad(samples: Float32Array, noiseFloor = 0.02): InferenceResult<VadOutput> {
  return predict(VAD_MODEL, () => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / Math.max(1, samples.length));
    const probability = Math.min(1, Math.max(0, (rms - noiseFloor) * 9));
    return {
      confidence: 0.87,
      output: {
        speech: probability > 0.35,
        probability: Number(probability.toFixed(2)),
        snrDb: Number((20 * Math.log10((rms + 1e-6) / (noiseFloor + 1e-6))).toFixed(1)),
      },
    };
  });
}