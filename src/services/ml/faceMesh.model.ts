/**
 * MediaPipe Face Mesh (mock).
 * Real drop-in: `@mediapipe/tasks-vision` FaceLandmarker with
 * `face_landmarker.task`. This mock derives a 468-point topology
 * deterministically from the detected face box so overlays look correct.
 */
import { loadGraphModel, predict } from "./tfjsRuntime";
import type { InferenceResult, ModelBox, ModelDescriptor, Point2D } from "./types";

export const FACE_MESH_MODEL: ModelDescriptor = {
  id: "mediapipe-face-mesh",
  name: "MediaPipe Face Mesh",
  vendor: "Google MediaPipe",
  task: "468-point facial landmarks · gaze · blendshapes",
  backend: "mediapipe-wasm",
  weights: "/models/mediapipe/face_landmarker.task",
  sizeMB: 3.2,
  inputShape: "[1,192,192,3]",
  outputShape: "[1,468,3]",
  targetFps: 30,
};

export interface FaceMeshOutput {
  landmarks: Point2D[];
  leftEye: Point2D;
  rightEye: Point2D;
  mouthOpen: number;
  smile: number;
  yaw: number;
  pitch: number;
}

export const loadFaceMesh = () => loadGraphModel(FACE_MESH_MODEL);

export function runFaceMesh(face: ModelBox, yaw = 0): InferenceResult<FaceMeshOutput> {
  return predict(FACE_MESH_MODEL, () => {
    const landmarks: Point2D[] = [];
    for (let i = 0; i < 468; i++) {
      const a = (i / 468) * Math.PI * 2;
      const ring = 0.18 + 0.3 * ((i % 7) / 7);
      landmarks.push({
        x: face.x + face.w * (0.5 + Math.cos(a) * ring),
        y: face.y + face.h * (0.5 + Math.sin(a) * ring * 1.15),
        score: 0.92,
      });
    }
    return {
      confidence: 0.94,
      output: {
        landmarks,
        leftEye: { x: face.x + face.w * 0.34, y: face.y + face.h * 0.42 },
        rightEye: { x: face.x + face.w * 0.66, y: face.y + face.h * 0.42 },
        mouthOpen: 0.24,
        smile: 0.41,
        yaw,
        pitch: 0,
      },
    };
  });
}