/**
 * Supabase database types — hand-written to match the migration schema.
 *
 * These types are used by the Supabase client for type-safe queries.
 * Regenerate with `npx supabase gen types typescript` if the schema changes.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AgeBandId = "0-6m" | "6-12m" | "1-2y" | "2-3y" | "3-4y" | "4-6y";
export type AssessmentStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type UploadStatus = "pending" | "uploading" | "uploaded" | "failed";
export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";
export type RiskLevel = "low" | "monitor" | "elevated";
export type NotificationType = "reminder" | "report" | "insight" | "system";
export type MilestoneStatus = "pending" | "achieved" | "delayed";
export type UserRole = "parent" | "clinician";
export type Gender = "male" | "female" | "other";
export type EventSeverity = "info" | "notable" | "concern";
export type RecommendationPriority = "low" | "medium" | "high";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          relationship: string | null;
          country: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          relationship?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          relationship?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          updated_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          parent_id: string;
          name: string;
          birth_date: string;
          gender: Gender;
          medical_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          name: string;
          birth_date: string;
          gender: Gender;
          medical_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          parent_id?: string;
          name?: string;
          birth_date?: string;
          gender?: Gender;
          medical_notes?: string | null;
          updated_at?: string;
        };
      };
      assessments: {
        Row: {
          id: string;
          child_id: string;
          age_band: AgeBandId;
          status: AssessmentStatus;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          age_band: AgeBandId;
          status?: AssessmentStatus;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          child_id?: string;
          age_band?: AgeBandId;
          status?: AssessmentStatus;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      assessment_activities: {
        Row: {
          id: string;
          assessment_id: string;
          activity_id: string;
          status: AssessmentStatus;
          video_id: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          activity_id: string;
          status?: AssessmentStatus;
          video_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          assessment_id?: string;
          activity_id?: string;
          status?: AssessmentStatus;
          video_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      videos: {
        Row: {
          id: string;
          assessment_id: string;
          activity_id: string;
          storage_path: string;
          file_name: string;
          duration_seconds: number | null;
          width: number | null;
          height: number | null;
          has_audio: boolean;
          upload_status: UploadStatus;
          analysis_status: AnalysisStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          activity_id: string;
          storage_path: string;
          file_name: string;
          duration_seconds?: number | null;
          width?: number | null;
          height?: number | null;
          has_audio?: boolean;
          upload_status?: UploadStatus;
          analysis_status?: AnalysisStatus;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          file_name?: string;
          duration_seconds?: number | null;
          width?: number | null;
          height?: number | null;
          has_audio?: boolean;
          upload_status?: UploadStatus;
          analysis_status?: AnalysisStatus;
        };
      };
      analysis_results: {
        Row: {
          id: string;
          video_id: string;
          assessment_id: string;
          child_id: string;
          age_band: AgeBandId;
          overall_score: number;
          confidence: number;
          risk_level: RiskLevel;
          matrix_level: number;
          matrix_level_name: string;
          face_detection_rate: number | null;
          eye_contact_score: number | null;
          gesture_score: number | null;
          facial_expression_score: number | null;
          attention_score: number | null;
          vocal_activity_score: number | null;
          speech_score: number | null;
          auditory_response_score: number | null;
          object_interaction_score: number | null;
          response_latency_ms: number | null;
          ai_explanation: string | null;
          observations: Json | null;
          risk_factors: Json | null;
          analysis_data: Json | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          assessment_id: string;
          child_id: string;
          age_band: AgeBandId;
          overall_score: number;
          confidence: number;
          risk_level: RiskLevel;
          matrix_level: number;
          matrix_level_name: string;
          face_detection_rate?: number | null;
          eye_contact_score?: number | null;
          gesture_score?: number | null;
          facial_expression_score?: number | null;
          attention_score?: number | null;
          vocal_activity_score?: number | null;
          speech_score?: number | null;
          auditory_response_score?: number | null;
          object_interaction_score?: number | null;
          response_latency_ms?: number | null;
          ai_explanation?: string | null;
          observations?: Json | null;
          risk_factors?: Json | null;
          analysis_data?: Json | null;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          overall_score?: number;
          confidence?: number;
          risk_level?: RiskLevel;
          matrix_level?: number;
          matrix_level_name?: string;
          face_detection_rate?: number | null;
          eye_contact_score?: number | null;
          gesture_score?: number | null;
          facial_expression_score?: number | null;
          attention_score?: number | null;
          vocal_activity_score?: number | null;
          speech_score?: number | null;
          auditory_response_score?: number | null;
          object_interaction_score?: number | null;
          response_latency_ms?: number | null;
          ai_explanation?: string | null;
          observations?: Json | null;
          risk_factors?: Json | null;
          analysis_data?: Json | null;
          source?: string | null;
        };
      };
      frame_metrics: {
        Row: {
          id: string;
          analysis_result_id: string;
          timestamp_ms: number;
          face_detected: boolean;
          face_confidence: number | null;
          eye_contact: number | null;
          gaze_x: number | null;
          gaze_y: number | null;
          head_yaw: number | null;
          head_pitch: number | null;
          hand_detected: boolean;
          pointing: boolean;
          gesture_score: number | null;
          object_detected: boolean;
          vocal_activity: boolean;
          speech_probability: number | null;
          attention_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_result_id: string;
          timestamp_ms: number;
          face_detected?: boolean;
          face_confidence?: number | null;
          eye_contact?: number | null;
          gaze_x?: number | null;
          gaze_y?: number | null;
          head_yaw?: number | null;
          head_pitch?: number | null;
          hand_detected?: boolean;
          pointing?: boolean;
          gesture_score?: number | null;
          object_detected?: boolean;
          vocal_activity?: boolean;
          speech_probability?: number | null;
          attention_score?: number | null;
          created_at?: string;
        };
        Update: {
          timestamp_ms?: number;
          face_detected?: boolean;
          face_confidence?: number | null;
          eye_contact?: number | null;
          gaze_x?: number | null;
          gaze_y?: number | null;
          head_yaw?: number | null;
          head_pitch?: number | null;
          hand_detected?: boolean;
          pointing?: boolean;
          gesture_score?: number | null;
          object_detected?: boolean;
          vocal_activity?: boolean;
          speech_probability?: number | null;
          attention_score?: number | null;
        };
      };
      timeline_events: {
        Row: {
          id: string;
          analysis_result_id: string;
          timestamp_ms: number;
          event_type: string;
          severity: EventSeverity;
          confidence: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_result_id: string;
          timestamp_ms: number;
          event_type: string;
          severity?: EventSeverity;
          confidence: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          timestamp_ms?: number;
          event_type?: string;
          severity?: EventSeverity;
          confidence?: number;
          description?: string | null;
        };
      };
      domain_scores: {
        Row: {
          id: string;
          analysis_result_id: string;
          domain: string;
          score: number;
          confidence: number;
          sample_count: number | null;
          quality: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_result_id: string;
          domain: string;
          score: number;
          confidence: number;
          sample_count?: number | null;
          quality?: string | null;
          created_at?: string;
        };
        Update: {
          domain?: string;
          score?: number;
          confidence?: number;
          sample_count?: number | null;
          quality?: string | null;
        };
      };
      recommendations: {
        Row: {
          id: string;
          analysis_result_id: string;
          domain: string;
          recommendation: string;
          priority: RecommendationPriority;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_result_id: string;
          domain: string;
          recommendation: string;
          priority?: RecommendationPriority;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          domain?: string;
          recommendation?: string;
          priority?: RecommendationPriority;
          reason?: string | null;
        };
      };
      milestones: {
        Row: {
          id: string;
          child_id: string;
          title: string;
          target_date: string | null;
          observed_date: string | null;
          status: MilestoneStatus;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          title: string;
          target_date?: string | null;
          observed_date?: string | null;
          status?: MilestoneStatus;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          child_id?: string;
          title?: string;
          target_date?: string | null;
          observed_date?: string | null;
          status?: MilestoneStatus;
          description?: string | null;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          title: string;
          message: string;
          type: NotificationType;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          title: string;
          message: string;
          type?: NotificationType;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          message?: string;
          type?: NotificationType;
          read?: boolean;
        };
      };
    };
  };
}

/** Convenience helpers */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
