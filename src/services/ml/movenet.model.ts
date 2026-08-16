/**
 * MoveNet SinglePose Lightning (mock).
 * Real drop-in: `@tensorflow-models/pose-detection` MoveNet, 17 COCO keypoints.
 */
import { loadGraphModel, predict } from "./tfjsRuntime";
import type { InferenceResult, ModelBox, ModelDescriptor, Point2D } from "./types";

export const MOVENET_MODEL: ModelDescriptor = {
  id: "movenet-lightning",
  name: "MoveNet Pose Estimation",
  vendor: "TensorFlow.js",
  task: "17-keypoint body pose · posture & orientation",
  backend: "tfjs-webgl",
  weights: "/models/movenet/singlepose-lightning/model.json",
  sizeMB: 9.1,
  inputShape: "[1,192,192,3]",
  outputShape: "[1,1,17,3]",
  targetFps: 30,
};

export const MOVENET_KEYPOINTS = [
  "nose", "left_eye", "right_eye", "left_ear", "right_ear",
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle",
] as const;

export interface PoseOutput {
  keypoints: Array<Point2D & { name: string }>;
  torsoLean: number;
  orientedToPartner: boolean;
}

export const loadMoveNet = () => loadGraphModel(MOVENET_MODEL);

export function runMoveNet(body: ModelBox, yaw = 0): InferenceResult<PoseOutput> {
  return predict(MOVENET_MODEL, () => {
    const rows = [0.08, 0.12, 0.12, 0.13, 0.13, 0.3, 0.3, 0.45, 0.45, 0.6, 0.6, 0.62, 0.62, 0.8, 0.8, 0.96, 0.96];
    const cols = [0.5, 0.44, 0.56, 0.38, 0.62, 0.32, 0.68, 0.26, 0.74, 0.2, 0.8, 0.36, 0.64, 0.34, 0.66, 0.33, 0.67];
    return {
      confidence: 0.91,
      output: {
        keypoints: MOVENET_KEYPOINTS.map((name, i) => ({
          name,
          x: body.x + body.w * cols[i],
          y: body.y + body.h * rows[i],
          score: 0.86,
        })),
        torsoLean: Number((yaw / 55).toFixed(2)),
        orientedToPartner: Math.abs(yaw) < 25,
      },
    };
  });
}