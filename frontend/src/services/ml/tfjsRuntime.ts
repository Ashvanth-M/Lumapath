/**
 * Mock TensorFlow.js inference engine.
 *
 * Mirrors the surface of `@tensorflow/tfjs` (`setBackend`, `ready`,
 * `loadGraphModel`, `predict`) so the real runtime can replace it without
 * touching model or UI code. Nothing here downloads weights — it simulates
 * warm-up, backend selection and per-frame latency accounting.
 */
import type { InferenceResult, ModelDescriptor, ModelStatus } from "./types";

export type Backend = "webgl" | "wasm" | "cpu";

let backend: Backend = "webgl";
let warm = false;

export function setBackend(next: Backend) {
  backend = next;
  warm = false;
}

export function activeBackend() {
  return backend;
}

/** Simulates `tf.ready()` + shader compilation warm-up. */
export async function ready(): Promise<void> {
  if (warm) return;
  await new Promise((r) => setTimeout(r, 40));
  warm = true;
}

export function isWarm() {
  return warm;
}

const loaded = new Map<string, ModelStatus>();

/** Simulates `tf.loadGraphModel(descriptor.weights)`. */
export async function loadGraphModel(descriptor: ModelDescriptor): Promise<ModelStatus> {
  loaded.set(descriptor.id, "loading");
  await ready();
  await new Promise((r) => setTimeout(r, Math.min(120, descriptor.sizeMB * 4)));
  loaded.set(descriptor.id, "ready");
  return "ready";
}

export function statusOf(id: string): ModelStatus {
  return loaded.get(id) ?? "idle";
}

/** Wraps a synchronous mock kernel and records a plausible latency. */
export function predict<T>(
  descriptor: ModelDescriptor,
  kernel: () => { output: T; confidence: number },
): InferenceResult<T> {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const { output, confidence } = kernel();
  const t1 = typeof performance !== "undefined" ? performance.now() : 0;
  const budget = 1000 / descriptor.targetFps;
  loaded.set(descriptor.id, "running");
  return {
    modelId: descriptor.id,
    latencyMs: Number(Math.max(t1 - t0, budget * 0.35).toFixed(2)),
    confidence,
    output,
  };
}