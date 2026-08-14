-- LumaPath AI — Database Schema
-- Run this in the Supabase SQL Editor at https://vjykkdzyqiswwlefqluz.supabase.co

-- ============================================================
-- HELPER: auto-update updated_at on row change
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text,
  phone       text,
  relationship text,
  country     text,
  avatar_url  text,
  role        text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'clinician')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. CHILDREN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.children (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  birth_date    date NOT NULL,
  gender        text NOT NULL DEFAULT 'other' CHECK (gender IN ('male', 'female', 'other')),
  medical_notes text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_children_parent ON public.children(parent_id);
CREATE TRIGGER children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 3. ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  age_band     text NOT NULL CHECK (age_band IN ('0-6m','6-12m','1-2y','2-3y','3-4y','4-6y')),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessments_child ON public.assessments(child_id);
CREATE TRIGGER assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. ASSESSMENT ACTIVITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assessment_activities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  activity_id    text NOT NULL,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  video_id       uuid,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_assessment ON public.assessment_activities(assessment_id);

-- ============================================================
-- 5. VIDEOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.videos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id    uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  activity_id      text NOT NULL,
  storage_path     text NOT NULL,
  file_name        text NOT NULL,
  duration_seconds real,
  width            integer,
  height           integer,
  has_audio        boolean NOT NULL DEFAULT false,
  upload_status    text NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending','uploading','uploaded','failed')),
  analysis_status  text NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending','processing','completed','failed')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_videos_assessment ON public.videos(assessment_id);

-- ============================================================
-- 6. ANALYSIS RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id                 uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  assessment_id            uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  child_id                 uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  age_band                 text NOT NULL,
  overall_score            real NOT NULL,
  confidence               real NOT NULL,
  risk_level               text NOT NULL DEFAULT 'monitor' CHECK (risk_level IN ('low','monitor','elevated')),
  matrix_level             integer NOT NULL DEFAULT 1,
  matrix_level_name        text NOT NULL DEFAULT '',
  face_detection_rate      real,
  eye_contact_score        real,
  gesture_score            real,
  facial_expression_score  real,
  attention_score          real,
  vocal_activity_score     real,
  speech_score             real,
  auditory_response_score  real,
  object_interaction_score real,
  response_latency_ms      real,
  ai_explanation           text,
  observations             jsonb,
  risk_factors             jsonb,
  analysis_data            jsonb,
  source                   text,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_results_assessment ON public.analysis_results(assessment_id);
CREATE INDEX idx_results_child     ON public.analysis_results(child_id);
CREATE INDEX idx_results_video     ON public.analysis_results(video_id);

-- ============================================================
-- 7. FRAME METRICS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.frame_metrics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_result_id  uuid NOT NULL REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  timestamp_ms        real NOT NULL,
  face_detected       boolean NOT NULL DEFAULT false,
  face_confidence     real,
  eye_contact         real,
  gaze_x              real,
  gaze_y              real,
  head_yaw            real,
  head_pitch          real,
  hand_detected       boolean NOT NULL DEFAULT false,
  pointing            boolean NOT NULL DEFAULT false,
  gesture_score       real,
  object_detected     boolean NOT NULL DEFAULT false,
  vocal_activity      boolean NOT NULL DEFAULT false,
  speech_probability  real,
  attention_score     real,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_frame_metrics_result ON public.frame_metrics(analysis_result_id);

-- ============================================================
-- 8. TIMELINE EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_result_id  uuid NOT NULL REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  timestamp_ms        real NOT NULL,
  event_type          text NOT NULL,
  severity            text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','notable','concern')),
  confidence          real NOT NULL DEFAULT 0.5,
  description         text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_timeline_result ON public.timeline_events(analysis_result_id);

-- ============================================================
-- 9. DOMAIN SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.domain_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_result_id  uuid NOT NULL REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  domain              text NOT NULL,
  score               real NOT NULL,
  confidence          real NOT NULL,
  sample_count        integer,
  quality             text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_domain_scores_result ON public.domain_scores(analysis_result_id);

-- ============================================================
-- 10. RECOMMENDATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recommendations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_result_id  uuid NOT NULL REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  domain              text NOT NULL,
  recommendation      text NOT NULL,
  priority            text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  reason              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recommendations_result ON public.recommendations(analysis_result_id);

-- ============================================================
-- 11. MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.milestones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id       uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  title          text NOT NULL,
  target_date    date,
  observed_date  date,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','achieved','delayed')),
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_milestones_child ON public.milestones(child_id);
CREATE TRIGGER milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text NOT NULL,
  type        text NOT NULL DEFAULT 'system' CHECK (type IN ('reminder','report','insight','system')),
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_profile ON public.notifications(profile_id);

-- ============================================================
-- 13. SHARED ACCESS (for clinician access to parent data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shared_access (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  clinician_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  UNIQUE(child_id, clinician_id)
);
CREATE INDEX idx_shared_clinician ON public.shared_access(clinician_id);
