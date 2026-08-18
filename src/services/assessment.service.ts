/**
 * Assessment data service — unified API for the UI layer.
 *
 * In production mode, queries Supabase. When VITE_DEMO_MODE=true, falls back
 * to the mock data for UI development.
 */
import {
  getAnalysisResultsForChild,
  getAnalysisResult as getAnalysisResultById,
  getMilestones as getMilestonesForChild,
  getNotifications as getNotificationsForProfile,
  getRecommendations as getRecommendationsForResult,
} from "@/services/supabase/assessment.service";
import type { AssessmentResult, Milestone, Recommendation } from "@/types";
import type { Tables } from "@/lib/supabase/types";

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

/** Maps a Supabase analysis_result row to the app's AssessmentResult type. */
function mapResult(row: Tables<"analysis_results">): AssessmentResult {
  return {
    id: row.id,
    childId: row.child_id,
    ageBandId: row.age_band as AssessmentResult["ageBandId"],
    completedAt: row.created_at,
    overallScore: Math.round(row.overall_score),
    matrixLevel: row.matrix_level,
    matrixLevelName: row.matrix_level_name,
    responseLatencyMs: Math.round(row.response_latency_ms ?? 0),
    riskLevel: row.risk_level as AssessmentResult["riskLevel"],
    confidence: row.confidence,
    scores: {
      eyeContact: Math.round(row.eye_contact_score ?? 0),
      speech: Math.round(row.speech_score ?? 0),
      gesture: Math.round(row.gesture_score ?? 0),
      attention: Math.round(row.attention_score ?? 0),
      facialExpression: Math.round(row.facial_expression_score ?? 0),
      auditoryResponse: Math.round(row.auditory_response_score ?? 0),
    },
    aiExplanation: row.ai_explanation ?? "",
    observations: (row.observations as string[]) ?? [],
    riskFactors: (row.risk_factors as string[]) ?? [],
    // Stored as jsonb, so the column type is `Json` — no structural overlap
    // with BehaviourAnalysis, hence the trip through `unknown`.
    analysis: (row.analysis_data ?? undefined) as unknown as AssessmentResult["analysis"],
    source: (row.source as AssessmentResult["source"]) ?? "video",
  };
}

/**
 * Lists all assessment results for a child.
 */
export async function listAssessments(childId: string): Promise<AssessmentResult[]> {
  if (isDemoMode) {
    const { DEMO_RESULTS } = await import("@/services/mockData");
    return DEMO_RESULTS;
  }
  if (!childId) return [];
  const rows = await getAnalysisResultsForChild(childId);
  return rows.map(mapResult);
}

/**
 * Gets a single assessment result by ID.
 */
export async function getAssessment(resultId: string): Promise<AssessmentResult | null> {
  if (isDemoMode) {
    const { DEMO_RESULTS } = await import("@/services/mockData");
    return DEMO_RESULTS.find((r) => r.id === resultId) ?? DEMO_RESULTS[0] ?? null;
  }
  const row = await getAnalysisResultById(resultId);
  return row ? mapResult(row) : null;
}

/**
 * Gets the latest assessment result for a child.
 */
export async function getLatestAssessment(childId: string): Promise<AssessmentResult | null> {
  const results = await listAssessments(childId);
  return results[0] ?? null;
}

/**
 * Builds progress series from real assessment history.
 */
export async function getProgressSeries(childId: string) {
  if (isDemoMode) {
    const { PROGRESS_SERIES } = await import("@/services/mockData");
    return PROGRESS_SERIES;
  }
  const results = await listAssessments(childId);
  if (results.length === 0) return [];

  return results
    .reverse()
    .map((r) => ({
      month: new Date(r.completedAt).toLocaleDateString(undefined, { month: "short" }),
      overall: r.overallScore,
      speech: r.scores.speech,
      gesture: r.scores.gesture,
      eyeContact: r.scores.eyeContact,
    }));
}

/**
 * Gets milestones for a child.
 */
export async function getMilestones(childId: string): Promise<Milestone[]> {
  if (isDemoMode) {
    const { DEMO_MILESTONES } = await import("@/services/mockData");
    return DEMO_MILESTONES;
  }
  if (!childId) return [];
  const rows = await getMilestonesForChild(childId);
  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    date: m.observed_date ?? m.target_date ?? "",
    achieved: m.status === "achieved",
    description: m.description ?? "",
  }));
}

/**
 * Gets notifications for a user profile.
 */
export async function getNotifications(profileId: string) {
  if (isDemoMode) {
    const { DEMO_NOTIFICATIONS } = await import("@/services/mockData");
    return DEMO_NOTIFICATIONS;
  }
  if (!profileId) return [];
  const rows = await getNotificationsForProfile(profileId);
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.message,
    time: formatRelativeTime(n.created_at),
    type: n.type as "reminder" | "report" | "insight",
    read: n.read,
  }));
}

/**
 * Gets recommendations for a result.
 */
export async function getResultRecommendations(resultId: string): Promise<Recommendation[]> {
  if (isDemoMode) {
    const { DEMO_RECOMMENDATIONS } = await import("@/services/mockData");
    return DEMO_RECOMMENDATIONS;
  }
  const rows = await getRecommendationsForResult(resultId);
  return rows.map((r) => ({
    id: r.id,
    category: r.domain as Recommendation["category"],
    title: r.recommendation.split(".")[0] ?? r.recommendation,
    description: r.recommendation,
    durationMinutes: 5,
    frequency: r.priority === "high" ? "Daily" : "3× weekly",
  }));
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}