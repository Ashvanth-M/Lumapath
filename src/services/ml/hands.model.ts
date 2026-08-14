/**
 * MediaPipe Hands (mock).
 * Real drop-in: `@mediapipe/tasks-vision` HandLandmarker with
 * `hand_landmarker.task` (21 keypoints per hand, 2 hands).
 */
import { loadGraphModel, predict } from "./tfjsRuntime";
import type { InferenceResult, ModelBox, ModelDescriptor, Point2D } from "./types";

export const HANDS_MODEL: ModelDescriptor = {
  id: "mediapipe-hands",
  name: "MediaPipe Hands",
  vendor: "Google MediaPipe",
  task: "21-point hand landmarks · pointing & reaching",
  backend: "mediapipe-wasm",
  weights: "/models/mediapipe/hand_landmarker.task",
  sizeMB: 7.5,
  inputShape: "[1,224,224,3]",
  outputShape: "[2,21,3]",
  targetFps: 24,
};

export interface HandOutput {
  hands: Array<{ label: "Left" | "Right"; landmarks: Point2D[]; pointing: boolean }>;
  gestureCount: number;
}

export const loadHands = () => loadGraphModel(HANDS_MODEL);

export function runHands(body: ModelBox, energy: number): InferenceResult<HandOutput> {
  return predict(HANDS_MODEL, () => {
    const build = (side: number): Point2D[] =>
      Array.from({ length: 21 }, (_, i) => ({
        x: body.x + body.w * (side === 0 ? 0.14 : 0.86) + (i % 5) * body.w * 0.012,
        y: body.y + body.h * (0.72 + Math.floor(i / 5) * 0.02),
        score: 0.88,
      }));
    return {
      confidence: 0.9,
      output: {
        hands: [
          { label: "Left" as const, landmarks: build(0), pointing: energy > 0.42 },
          { label: "Right" as const, landmarks: build(1), pointing: false },
        ],
        gestureCount: energy > 0.42 ? 1 : 0,
      },
    };
  });
}