export type Gender = "male" | "female" | "other";

export interface ParentProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  relationship: "mother" | "father" | "guardian" | "caregiver";
  country?: string;
  avatarUrl?: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  birthDate: string;
  gender: Gender;
  photoUrl?: string;
  medicalNotes?: string;
  ageBandId: AgeBandId;
  developmentHistory: HistoryEntry[];
  communicationHistory: HistoryEntry[];
}

export interface HistoryEntry {
  id: string;
  date: string;
  title: string;
  detail: string;
}

export type AgeBandId = "0-6m" | "6-12m" | "1-2y" | "2-3y" | "3-4y" | "4-6y";

export interface AgeBand {
  id: AgeBandId;
  label: string;
  monthsMin: number;
  monthsMax: number;
  durationMinutes: number;
  activityCount: number;
  description: string;
  focusAreas: string[];
}

export interface Activity {
  id: string;
  title: string;
  instruction: string;
  audioScript: string;
  seconds: number;
  icon: string;
  tip: string;
}

export type ScoreKey =
  | "eyeContact"
  | "speech"
  | "gesture"
  | "attention"
  | "facialExpression"
  | "auditoryResponse";

export type RiskLevel = "low" | "monitor" | "elevated";

export interface AssessmentResult {
  id: string;
  childId: string;
  ageBandId: AgeBandId;
  completedAt: string;
  overallScore: number;
  matrixLevel: number;
  matrixLevelName: string;
  responseLatencyMs: number;
  riskLevel: RiskLevel;
  confidence: number;
  scores: Record<ScoreKey, number>;
  aiExplanation: string;
  observations: string[];
  riskFactors: string[];
  /** Present when the result came from an uploaded interaction video. */
  analysis?: BehaviourAnalysis;
  source?: "video" | "manual" | "live";
}

export interface Recommendation {
  id: string;
  category: "daily" | "game" | "exercise" | "speech" | "tip";
  title: string;
  description: string;
  durationMinutes: number;
  frequency: string;
}

export interface StandardActivity {
  id: string;
  title: string;
  purpose: string;
  icon: string;
  recommendedSeconds: number;
  observes: string[];
  setup: string[];
}

export interface VideoProbe {
  fileName: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  quality: "excellent" | "good" | "acceptable" | "poor";
  qualityNotes: string[];
}

export interface BehaviourMetric {
  label: string;
  value: string;
  /** 0–100 confidence/strength for the bar. */
  pct: number;
}

export interface BehaviourGroup {
  key: "faceHead" | "social" | "object" | "vocal" | "timing";
  title: string;
  metrics: BehaviourMetric[];
}

export interface TimelineEvent {
  atSec: number;
  label: string;
  kind: "gaze" | "vocal" | "gesture" | "social" | "attention";
  detail: string;
}

export interface BehaviourAnalysis {
  activityId: string;
  video: VideoProbe;
  framesAnalysed: number;
  faceDetectionRate: number;
  groups: BehaviourGroup[];
  timeline: TimelineEvent[];
  /** Per-sample signals used to drive the behaviour replay overlays. */
  samples?: BehaviourSample[];
}

export interface BehaviourSample {
  t: number;
  /** 0–1 face-presence confidence. */
  face: number;
  /** 0–1 gaze/mutual-attention estimate. */
  gaze: number;
  /** 0–1 movement energy. */
  motion: number;
  /** 0–1 vocal/voice-activity estimate. */
  voice: number;
  /** Normalised bounding box of the CHILD — the primary tracked subject. */
  box: { x: number; y: number; w: number; h: number };
  /** Normalised bounding box of the caregiver — contextual tracking only. */
  parentBox?: { x: number; y: number; w: number; h: number };
  /** 0–1 identity-tracking confidence for the child subject. */
  track?: number;
  /** True when the child box was predicted rather than measured. */
  predicted?: boolean;
  /** Stable identity assigned to the assessment child for the full clip. */
  trackId?: string;
  /** Profile-calibrated apparent age estimate used during subject selection. */
  estimatedAgeYears?: number;
}

export interface WeeklyGoal {
  id: string;
  title: string;
  progress: number;
  target: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  achieved: boolean;
  description: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "reminder" | "report" | "insight";
  read: boolean;
}