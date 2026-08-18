/**
 * Persists a completed assessment result so it outlives the browser session.
 *
 * Two paths, chosen by configuration:
 *   - `VITE_BACKEND_URL` set → POST to the FastAPI service, which verifies the
 *     caller's token and re-checks child ownership before writing.
 *   - otherwise → write directly to Supabase from the browser, where Row Level
 *     Security enforces the same rule at the database.
 *
 * Failures never throw into the analysis flow. The result is already in the
 * local store by the time this runs, so a network problem degrades the session
 * to device-only rather than losing it.
 */
import { supabase } from "@/lib/supabase/client";
import { isBackendConfigured, saveResult as saveViaBackend } from "@/services/backend/client";
import type { Json } from "@/lib/supabase/types";
import type { AssessmentResult } from "@/types";

export interface PersistOutcome {
  persisted: boolean;
  /** Server-assigned id, when the write succeeded. */
  remoteId?: string;
  /** Why it did not persist — for a toast, not for the console alone. */
  reason?: string;
}

export async function persistResult(
  result: AssessmentResult,
  activityId?: string,
): Promise<PersistOutcome> {
  try {
    if (isBackendConfigured) {
      const { resultId } = await saveViaBackend({
        childId: result.childId,
        ageBandId: result.ageBandId,
        overallScore: result.overallScore,
        confidence: result.confidence,
        riskLevel: result.riskLevel,
        matrixLevel: result.matrixLevel,
        matrixLevelName: result.matrixLevelName,
        responseLatencyMs: result.responseLatencyMs,
        faceDetectionRate: result.analysis?.faceDetectionRate,
        scores: result.scores,
        aiExplanation: result.aiExplanation,
        observations: result.observations,
        riskFactors: result.riskFactors,
        timeline: result.analysis?.timeline ?? [],
        source: result.source ?? "video",
        activityId: activityId ?? result.analysis?.activityId,
        analysisData: result.analysis,
      });
      return { persisted: true, remoteId: resultId };
    }

    return await persistDirectToSupabase(result, activityId);
  } catch (error) {
    return {
      persisted: false,
      reason: error instanceof Error ? error.message : "Could not reach the server.",
    };
  }
}

/** Browser-direct write. RLS on the tables enforces ownership. */
async function persistDirectToSupabase(
  result: AssessmentResult,
  activityId?: string,
): Promise<PersistOutcome> {
  const { data: assessment, error: assessmentError } = await supabase
    .from("assessments")
    .insert({
      child_id: result.childId,
      age_band: result.ageBandId,
      status: "completed",
      completed_at: result.completedAt,
    })
    .select("id")
    .single();

  if (assessmentError || !assessment) {
    return { persisted: false, reason: assessmentError?.message ?? "Could not start the record." };
  }

  const { data: row, error: resultError } = await supabase
    .from("analysis_results")
    .insert({
      assessment_id: assessment.id,
      child_id: result.childId,
      age_band: result.ageBandId,
      overall_score: result.overallScore,
      confidence: result.confidence,
      risk_level: result.riskLevel,
      matrix_level: result.matrixLevel,
      matrix_level_name: result.matrixLevelName,
      response_latency_ms: result.responseLatencyMs,
      face_detection_rate: result.analysis?.faceDetectionRate ?? null,
      eye_contact_score: result.scores.eyeContact,
      speech_score: result.scores.speech,
      gesture_score: result.scores.gesture,
      attention_score: result.scores.attention,
      facial_expression_score: result.scores.facialExpression,
      auditory_response_score: result.scores.auditoryResponse,
      ai_explanation: result.aiExplanation,
      observations: result.observations,
      risk_factors: result.riskFactors,
      // Stored as jsonb; BehaviourAnalysis has no structural overlap with Json.
      analysis_data: (result.analysis ?? null) as unknown as Json,
      source: result.source ?? "video",
      activity_id: activityId ?? result.analysis?.activityId ?? null,
    })
    .select("id")
    .single();

  if (resultError || !row) {
    return { persisted: false, reason: resultError?.message ?? "Could not save the scores." };
  }

  const timeline = result.analysis?.timeline ?? [];
  if (timeline.length > 0) {
    await supabase.from("timeline_events").insert(
      timeline.map((event) => ({
        analysis_result_id: row.id,
        timestamp_ms: event.atSec * 1000,
        event_type: event.kind,
        description: `${event.label} — ${event.detail}`,
        confidence: result.confidence,
      })),
    );
  }

  await supabase.from("domain_scores").insert(
    (Object.keys(result.scores) as Array<keyof typeof result.scores>).map((domain) => ({
      analysis_result_id: row.id,
      domain,
      score: result.scores[domain],
      confidence: result.confidence,
    })),
  );

  return { persisted: true, remoteId: row.id };
}
