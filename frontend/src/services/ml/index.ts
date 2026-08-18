/**
 * LumaPath ML model registry (mock inference stack).
 *
 * Every entry is a self-contained adapter with the same shape a production
 * model would expose, so real MediaPipe / TF.js / ONNX runtimes can be
 * swapped in per-model without touching the UI.
 */
import { FACE_MESH_MODEL, loadFaceMesh, runFaceMesh } from "./faceMesh.model";
import { HANDS_MODEL, loadHands, runHands } from "./hands.model";
import { MOVENET_MODEL, loadMoveNet, runMoveNet } from "./movenet.model";
import { VAD_MODEL, loadVad, runVad } from "./vad.model";
import { YOLO_MODEL, loadYolo, runYolo } from "./yolo.model";
import { activeBackend, statusOf } from "./tfjsRuntime";
import { MATRIX_RULES, evaluateCommunicationMatrix } from "./communicationMatrix.engine";
import type { ModelDescriptor } from "./types";

export * from "./types";
export { FACE_MESH_MODEL, loadFaceMesh, runFaceMesh };
export { HANDS_MODEL, loadHands, runHands };
export { MOVENET_MODEL, loadMoveNet, runMoveNet };
export { YOLO_MODEL, loadYolo, runYolo };
export { VAD_MODEL, loadVad, runVad };
export { MATRIX_RULES, evaluateCommunicationMatrix };
export * from "./tfjsRuntime";

export const MATRIX_ENGINE: ModelDescriptor = {
  id: "communication-matrix-rules",
  name: "Communication Matrix Rule Engine",
  vendor: "LumaPath clinical rules",
  task: `Maps signals to 7 Matrix levels · ${MATRIX_RULES.length} rules`,
  backend: "rule-engine",
  weights: "/models/rules/communication-matrix.v3.json",
  sizeMB: 0.1,
  inputShape: "signals[7]",
  outputShape: "level[1..7]",
  targetFps: 60,
};

export const MODEL_STACK: ModelDescriptor[] = [
  FACE_MESH_MODEL,
  HANDS_MODEL,
  MOVENET_MODEL,
  YOLO_MODEL,
  VAD_MODEL,
  MATRIX_ENGINE,
];

/** Warms up every model in the stack (mock: resolves in a few ms). */
export async function loadModelStack() {
  await Promise.all([loadFaceMesh(), loadHands(), loadMoveNet(), loadYolo(), loadVad()]);
  return MODEL_STACK.map((m) => ({ id: m.id, status: statusOf(m.id) }));
}

export function runtimeInfo() {
  return { backend: activeBackend(), models: MODEL_STACK.length };
}