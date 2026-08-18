/**
 * Data deletion.
 *
 * This app stores video and behavioural analysis of children. A parent must be
 * able to remove it, and removal has to actually cascade rather than leaving
 * orphaned rows behind. Not a nice-to-have.
 *
 * The schema already declares `ON DELETE CASCADE` from `children` down through
 * assessments, videos, analysis_results, frame_metrics, timeline_events,
 * domain_scores, recommendations and milestones — so deleting the child row
 * removes the database records. **Storage objects do not cascade**, which is
 * why the video files are removed explicitly first.
 */
import { supabase } from "@/lib/supabase/client";

export interface DeletionSummary {
  ok: boolean;
  videosDeleted: number;
  error?: string;
}

/**
 * Permanently deletes one child and everything derived from them.
 *
 * Irreversible. Callers must confirm with the parent — ideally by having them
 * type the child's name — before calling this.
 */
export async function deleteChildData(childId: string): Promise<DeletionSummary> {
  // Storage first. If the row goes first and this fails, the objects are
  // orphaned with no record pointing at them, and nothing can find them again.
  let videosDeleted = 0;
  try {
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id")
      .eq("child_id", childId);

    const assessmentIds = (assessments ?? []).map((a) => a.id);
    if (assessmentIds.length > 0) {
      const { data: videos } = await supabase
        .from("videos")
        .select("storage_path")
        .in("assessment_id", assessmentIds);

      const paths = (videos ?? []).map((v) => v.storage_path).filter(Boolean);
      if (paths.length > 0) {
        const { error } = await supabase.storage.from("assessment-videos").remove(paths);
        if (error) {
          return { ok: false, videosDeleted: 0, error: `Video files: ${error.message}` };
        }
        videosDeleted = paths.length;
      }
    }
  } catch (error) {
    return {
      ok: false,
      videosDeleted: 0,
      error: error instanceof Error ? error.message : "Could not reach storage.",
    };
  }

  const { error } = await supabase.from("children").delete().eq("id", childId);
  if (error) return { ok: false, videosDeleted, error: error.message };

  return { ok: true, videosDeleted };
}

/**
 * Deletes a single assessment result and its detail rows.
 *
 * For a parent who wants to remove one bad recording without losing the whole
 * history.
 */
export async function deleteResult(resultId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: result } = await supabase
    .from("analysis_results")
    .select("assessment_id")
    .eq("id", resultId)
    .single();

  // Deleting the assessment cascades to the result and everything under it.
  const target = result?.assessment_id;
  const { error } = target
    ? await supabase.from("assessments").delete().eq("id", target)
    : await supabase.from("analysis_results").delete().eq("id", resultId);

  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Revokes a clinician's access to a child.
 *
 * Sets `revoked_at` rather than deleting the row, so there is a record that
 * access existed and when it ended — which matters if anyone later asks who
 * could see what.
 */
export async function revokeClinicianAccess(
  childId: string,
  clinicianId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("shared_access")
    .update({ revoked_at: new Date().toISOString() })
    .eq("child_id", childId)
    .eq("clinician_id", clinicianId);

  return error ? { ok: false, error: error.message } : { ok: true };
}
