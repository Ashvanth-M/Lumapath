-- LumaPath AI — Row Level Security Policies
-- Run after 001_schema.sql

-- Enable RLS on all tables
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frame_metrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_access       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES — users can read/update their own profile
-- ============================================================
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
-- Insert handled by the trigger; allow self-insert as fallback
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- CHILDREN — parents manage their own children
-- ============================================================
CREATE POLICY children_parent_select ON public.children
  FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY children_parent_insert ON public.children
  FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY children_parent_update ON public.children
  FOR UPDATE USING (parent_id = auth.uid());
CREATE POLICY children_parent_delete ON public.children
  FOR DELETE USING (parent_id = auth.uid());

-- Clinicians can read children shared with them
CREATE POLICY children_clinician_select ON public.children
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_access sa
      WHERE sa.child_id = children.id
        AND sa.clinician_id = auth.uid()
        AND sa.revoked_at IS NULL
    )
  );

-- ============================================================
-- ASSESSMENTS — accessible through child ownership
-- ============================================================
CREATE POLICY assessments_parent_select ON public.assessments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );
CREATE POLICY assessments_parent_insert ON public.assessments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );
CREATE POLICY assessments_parent_update ON public.assessments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );

-- Clinician read-only for shared children
CREATE POLICY assessments_clinician_select ON public.assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_access sa
      WHERE sa.child_id = assessments.child_id
        AND sa.clinician_id = auth.uid()
        AND sa.revoked_at IS NULL
    )
  );

-- ============================================================
-- ASSESSMENT ACTIVITIES
-- ============================================================
CREATE POLICY activities_parent ON public.assessment_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.children c ON c.id = a.child_id
      WHERE a.id = assessment_id AND c.parent_id = auth.uid()
    )
  );

-- ============================================================
-- VIDEOS — accessible through assessment ownership
-- ============================================================
CREATE POLICY videos_parent ON public.videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.children c ON c.id = a.child_id
      WHERE a.id = assessment_id AND c.parent_id = auth.uid()
    )
  );

-- ============================================================
-- ANALYSIS RESULTS — accessible through child ownership
-- ============================================================
CREATE POLICY results_parent_select ON public.analysis_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );
CREATE POLICY results_parent_insert ON public.analysis_results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );

-- Clinician read for shared children
CREATE POLICY results_clinician_select ON public.analysis_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_access sa
      WHERE sa.child_id = analysis_results.child_id
        AND sa.clinician_id = auth.uid()
        AND sa.revoked_at IS NULL
    )
  );

-- ============================================================
-- FRAME METRICS — through result ownership
-- ============================================================
CREATE POLICY frame_metrics_parent ON public.frame_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.analysis_results ar
      JOIN public.children c ON c.id = ar.child_id
      WHERE ar.id = analysis_result_id AND c.parent_id = auth.uid()
    )
  );

-- ============================================================
-- TIMELINE EVENTS
-- ============================================================
CREATE POLICY timeline_parent ON public.timeline_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.analysis_results ar
      JOIN public.children c ON c.id = ar.child_id
      WHERE ar.id = analysis_result_id AND c.parent_id = auth.uid()
    )
  );

-- ============================================================
-- DOMAIN SCORES
-- ============================================================
CREATE POLICY domain_scores_parent ON public.domain_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.analysis_results ar
      JOIN public.children c ON c.id = ar.child_id
      WHERE ar.id = analysis_result_id AND c.parent_id = auth.uid()
    )
  );

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================
CREATE POLICY recommendations_parent ON public.recommendations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.analysis_results ar
      JOIN public.children c ON c.id = ar.child_id
      WHERE ar.id = analysis_result_id AND c.parent_id = auth.uid()
    )
  );

-- ============================================================
-- MILESTONES — through child ownership
-- ============================================================
CREATE POLICY milestones_parent ON public.milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );

-- ============================================================
-- NOTIFICATIONS — user can manage their own
-- ============================================================
CREATE POLICY notifications_own ON public.notifications
  FOR ALL USING (profile_id = auth.uid());

-- ============================================================
-- SHARED ACCESS — parents grant, clinicians read
-- ============================================================
CREATE POLICY shared_parent ON public.shared_access
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid())
  );
CREATE POLICY shared_clinician ON public.shared_access
  FOR SELECT USING (clinician_id = auth.uid());
