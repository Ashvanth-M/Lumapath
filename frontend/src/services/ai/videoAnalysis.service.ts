/**
 * Placeholder for the future video analysis pipeline
 * (MediaPipe face mesh + YOLO gesture detection + OpenCV pre-processing).
 * Replace `analyzeVideo` with a call to the FastAPI `/v1/analysis/video` endpoint.
 */
import type { ScoreKey } from "@/types";

export interface VideoAnalysisPayload {
  assessmentId: string;
  videoUrl: string;
}

export interface VideoAnalysisResponse {
  frameCount: number;
  faceDetectionRate: number;
  scores: Pick<Record<ScoreKey, number>, "eyeContact" | "gesture" | "facialExpression" | "attention">;
}

export async function analyzeVideo(
  payload: VideoAnalysisPayload,
): Promise<VideoAnalysisResponse> {
  await new Promise((r) => setTimeout(r, 600));
  void payload;
  return {
    frameCount: 2740,
    faceDetectionRate: 0.96,
    scores: { eyeContact: 82, gesture: 84, facialExpression: 88, attention: 76 },
  };
}