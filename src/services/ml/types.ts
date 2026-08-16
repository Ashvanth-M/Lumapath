/** Shared types for the LumaPath ML model stack (mock inference layer). */
export interface Point2D {
  x: number;
  y: number;
  score?: number;
}

export interface ModelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ModelStatus = "idle" | "loading" | "ready" | "running" | "error";

export interface ModelDescriptor {
  id: string;
  name: string;
  vendor: string;
  task: string;
  backend: "tfjs-webgl" | "tfjs-wasm" | "mediapipe-wasm" | "onnx-wasm" | "rule-engine";
  /** Mock artefact path — a real build would ship the weights here. */
  weights: string;
  sizeMB: number;
  inputShape: string;
  outputShape: string;
  targetFps: number;
}

export interface InferenceResult<T> {
  modelId: string;
  latencyMs: number;
  confidence: number;
  output: T;
}