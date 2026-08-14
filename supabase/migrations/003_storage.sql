-- LumaPath AI — Storage Buckets & Policies
-- Run after 002_rls.sql

-- ============================================================
-- Create private storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('assessment-videos', 'assessment-videos', false),
  ('assessment-results', 'assessment-results', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ASSESSMENT VIDEOS — authenticated upload/read for own videos
-- ============================================================

-- Upload: authenticated users can upload to their own folder
CREATE POLICY storage_videos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assessment-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: authenticated users can read their own videos
CREATE POLICY storage_videos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'assessment-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: authenticated users can delete their own videos
CREATE POLICY storage_videos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'assessment-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- ASSESSMENT RESULTS — authenticated read for own results
-- ============================================================

CREATE POLICY storage_results_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assessment-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY storage_results_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'assessment-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
