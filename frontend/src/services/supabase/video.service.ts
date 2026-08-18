/**
 * Video storage service — Supabase Storage backed.
 *
 * Uploads videos to private Supabase Storage bucket, creates database records,
 * and provides signed URLs for authenticated playback.
 */
import { supabase } from "@/lib/supabase/client";
import type { InsertTables, Tables } from "@/lib/supabase/types";

const BUCKET = "assessment-videos";

/**
 * Uploads a video file to Supabase Storage and creates a `videos` table record.
 */
export async function uploadVideo(
  file: File,
  userId: string,
  assessmentId: string,
  activityId: string,
  metadata: {
    durationSeconds?: number;
    width?: number;
    height?: number;
    hasAudio?: boolean;
  } = {},
): Promise<Tables<"videos"> | null> {
  const ext = file.name.split(".").pop() ?? "mp4";
  const storagePath = `${userId}/${assessmentId}/${activityId}_${Date.now()}.${ext}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    console.error("Video upload failed:", uploadError.message);
    return null;
  }

  // Create database record
  const record: InsertTables<"videos"> = {
    assessment_id: assessmentId,
    activity_id: activityId,
    storage_path: storagePath,
    file_name: file.name,
    duration_seconds: metadata.durationSeconds ?? null,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    has_audio: metadata.hasAudio ?? false,
    upload_status: "uploaded",
    analysis_status: "pending",
  };

  const { data } = await supabase.from("videos").insert(record).select().single();
  return data;
}

/**
 * Returns a signed URL for private video playback (valid for 1 hour).
 */
export async function getVideoSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error("Failed to get signed URL:", error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Updates the analysis status of a video record.
 */
export async function updateVideoAnalysisStatus(
  videoId: string,
  status: "processing" | "completed" | "failed",
): Promise<void> {
  await supabase.from("videos").update({ analysis_status: status }).eq("id", videoId);
}

/**
 * Gets a video record by ID.
 */
export async function getVideo(videoId: string): Promise<Tables<"videos"> | null> {
  const { data } = await supabase.from("videos").select("*").eq("id", videoId).single();
  return data;
}
