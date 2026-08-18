-- LumaPath AI — allow results that have no video
-- Run after 003_storage.sql
--
-- analysis_results.video_id was NOT NULL, which made three cases impossible:
--
--   1. Manual questionnaire results — parent-reported, no recording exists.
--   2. Live session results — measured from the camera stream in real time and
--      never written to a file.
--   3. Metrics-only storage — analysing in the browser and persisting just the
--      scores plus a few thumbnails, instead of a 100 MB upload.
--
-- The foreign key stays, so a result that DOES reference a video is still
-- validated and still cascades on delete.

ALTER TABLE public.analysis_results
  ALTER COLUMN video_id DROP NOT NULL;

-- Storage path for the thumbnail frames used by the report and replay views
-- when the original video is not retained.
ALTER TABLE public.analysis_results
  ADD COLUMN IF NOT EXISTS thumbnail_paths jsonb;

-- Which of the five standardised activities produced this result. Previously
-- only recoverable by digging through the analysis_data blob.
ALTER TABLE public.analysis_results
  ADD COLUMN IF NOT EXISTS activity_id text;
