/**
 * YOLOv8n object detection (mock).
 * Real drop-in: ONNX Runtime Web or a tfjs graph-model export of yolov8n,
 * filtered to play-relevant COCO classes.
 */
import { loadGraphModel, predict } from "./tfjsRuntime";
import type { InferenceResult, ModelBox, ModelDescriptor } from "./types";

export const YOLO_MODEL: ModelDescriptor = {
  id: "yolov8n",
  name: "YOLO Object Detection",
  vendor: "Ultralytics YOLOv8n",
  task: "Person & toy detection · joint-attention targets",
  backend: "onnx-wasm",
  weights: "/models/yolo/yolov8n.onnx",
  sizeMB: 12.4,
  inputShape: "[1,3,640,640]",
  outputShape: "[1,84,8400]",
  targetFps: 12,
};

export const YOLO_CLASSES = ["person", "teddy bear", "ball", "book", "cup", "cell phone"] as const;
export type YoloClass = (typeof YOLO_CLASSES)[number];

export interface YoloDetection {
  label: YoloClass;
  score: number;
  box: ModelBox;
}

export const loadYolo = () => loadGraphModel(YOLO_MODEL);

export function runYolo(people: ModelBox[], toyVisible: boolean): InferenceResult<YoloDetection[]> {
  return predict(YOLO_MODEL, () => {
    const out: YoloDetection[] = people.map((box) => ({ label: "person" as const, score: 0.93, box }));
    if (toyVisible) out.push({ label: "teddy bear", score: 0.71, box: { x: 0.42, y: 0.58, w: 0.16, h: 0.2 } });
    return { confidence: 0.89, output: out };
  });
}