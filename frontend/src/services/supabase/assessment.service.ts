/**
 * Assessment data service — Supabase-backed.
 */
import { supabase } from "@/lib/supabase/client";
import type { InsertTables, Tables } from "@/lib/supabase/types";
import type { AgeBandId } from "@/lib/supabase/types";

// ── Assessments ───────────────────────────────────────────────────────────

export async function createAssessment(
  childId: string,
  ageBand: AgeBandId,
): Promise<Tables<"assessments"> | null> {
  const { data } = await supabase
    .from("assessments")
    .insert({ child_id: childId, age_band: ageBand, status: "in_progress", started_at: new Date().toISOString() })
    .select()
    .single();
  return data;
}

export async function updateAssessmentStatus(
  id: string,
  status: "completed" | "cancelled",
): Promise<void> {
  await supabase
    .from("assessments")
    .update({
      status,
      ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);
}

export async function getAssessmentsForChild(
  childId: string,
): Promise<Tables<"assessments">[]> {
  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ── Analysis Results ──────────────────────────────────────────────────────

export async function saveAnalysisResult(
  result: InsertTables<"analysis_results">,
): Promise<Tables<"analysis_results"> | null> {
  const { data } = await supabase
    .from("analysis_results")
    .insert(result)
    .select()
    .single();
  return data;
}

export async function getAnalysisResultsForChild(
  childId: string,
): Promise<Tables<"analysis_results">[]> {
  const { data } = await supabase
    .from("analysis_results")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAnalysisResult(
  resultId: string,
): Promise<Tables<"analysis_results"> | null> {
  const { data } = await supabase
    .from("analysis_results")
    .select("*")
    .eq("id", resultId)
    .single();
  return data;
}

// ── Frame Metrics ─────────────────────────────────────────────────────────

export async function saveFrameMetrics(
  metrics: InsertTables<"frame_metrics">[],
): Promise<void> {
  if (metrics.length === 0) return;
  // Batch insert in chunks of 500
  for (let i = 0; i < metrics.length; i += 500) {
    await supabase.from("frame_metrics").insert(metrics.slice(i, i + 500));
  }
}

export async function getFrameMetrics(
  resultId: string,
): Promise<Tables<"frame_metrics">[]> {
  const { data } = await supabase
    .from("frame_metrics")
    .select("*")
    .eq("analysis_result_id", resultId)
    .order("timestamp_ms", { ascending: true });
  return data ?? [];
}

// ── Timeline Events ───────────────────────────────────────────────────────

export async function saveTimelineEvents(
  events: InsertTables<"timeline_events">[],
): Promise<void> {
  if (events.length === 0) return;
  await supabase.from("timeline_events").insert(events);
}

export async function getTimelineEvents(
  resultId: string,
): Promise<Tables<"timeline_events">[]> {
  const { data } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("analysis_result_id", resultId)
    .order("timestamp_ms", { ascending: true });
  return data ?? [];
}

// ── Domain Scores ─────────────────────────────────────────────────────────

export async function saveDomainScores(
  scores: InsertTables<"domain_scores">[],
): Promise<void> {
  if (scores.length === 0) return;
  await supabase.from("domain_scores").insert(scores);
}

export async function getDomainScores(
  resultId: string,
): Promise<Tables<"domain_scores">[]> {
  const { data } = await supabase
    .from("domain_scores")
    .select("*")
    .eq("analysis_result_id", resultId)
    .order("domain");
  return data ?? [];
}

// ── Recommendations ───────────────────────────────────────────────────────

export async function saveRecommendations(
  recs: InsertTables<"recommendations">[],
): Promise<void> {
  if (recs.length === 0) return;
  await supabase.from("recommendations").insert(recs);
}

export async function getRecommendations(
  resultId: string,
): Promise<Tables<"recommendations">[]> {
  const { data } = await supabase
    .from("recommendations")
    .select("*")
    .eq("analysis_result_id", resultId)
    .order("priority");
  return data ?? [];
}

// ── Milestones ────────────────────────────────────────────────────────────

export async function getMilestones(
  childId: string,
): Promise<Tables<"milestones">[]> {
  const { data } = await supabase
    .from("milestones")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createMilestone(
  milestone: InsertTables<"milestones">,
): Promise<Tables<"milestones"> | null> {
  const { data } = await supabase
    .from("milestones")
    .insert(milestone)
    .select()
    .single();
  return data;
}

// ── Notifications ─────────────────────────────────────────────────────────

export async function getNotifications(
  profileId: string,
): Promise<Tables<"notifications">[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}
