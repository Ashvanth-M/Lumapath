import type {
  AppNotification,
  AssessmentResult,
  ChildProfile,
  Milestone,
  ParentProfile,
  Recommendation,
  WeeklyGoal,
} from "@/types";

export const DEMO_PARENT: ParentProfile = {
  id: "p_1",
  fullName: "Amara Okafor",
  email: "amara.okafor@example.com",
  phone: "+1 415 555 0142",
  relationship: "mother",
  country: "United States",
};

export const DEMO_CHILD: ChildProfile = {
  id: "c_1",
  name: "Zuri Okafor",
  birthDate: "2024-02-18",
  gender: "female",
  medicalNotes:
    "Full-term birth, no NICU stay. Passed newborn hearing screening. Two episodes of otitis media at 14 months.",
  ageBandId: "1-2y",
  developmentHistory: [
    { id: "d1", date: "2024-08-10", title: "Sat unsupported", detail: "Achieved at 5 months, within range." },
    { id: "d2", date: "2025-01-22", title: "First independent steps", detail: "Achieved at 11 months." },
    { id: "d3", date: "2025-06-04", title: "Pincer grasp refined", detail: "Consistent use with small objects." },
  ],
  communicationHistory: [
    { id: "c1", date: "2024-11-02", title: "Consistent babbling", detail: "Reduplicated syllables: ba-ba, da-da." },
    { id: "c2", date: "2025-03-15", title: "Responds to name", detail: "Turns within 2 seconds in quiet rooms." },
    { id: "c3", date: "2025-09-28", title: "First meaningful word", detail: "Used 'mama' referentially." },
  ],
};

export const DEMO_RESULTS: AssessmentResult[] = [
  {
    id: "r_003",
    childId: "c_1",
    ageBandId: "1-2y",
    completedAt: "2026-07-24T09:15:00Z",
    overallScore: 78,
    matrixLevel: 4,
    matrixLevelName: "Conventional Communication",
    responseLatencyMs: 1420,
    riskLevel: "monitor",
    confidence: 0.91,
    scores: {
      eyeContact: 82,
      speech: 68,
      gesture: 84,
      attention: 76,
      facialExpression: 88,
      auditoryResponse: 74,
    },
    aiExplanation:
      "Zuri consistently oriented to her name within 1.4 seconds and produced clear communicative gestures such as pointing and waving. Vocal output remains primarily babble with two consistent word approximations, which is at the lower edge of expectation for 17 months. Auditory localisation was accurate for front-facing sounds but slower for sounds presented behind her.",
    observations: [
      "Oriented to name in 4 of 5 trials with a mean latency of 1.4 s.",
      "Spontaneous index-finger point used twice to request a preferred toy.",
      "Shared smile and gaze alternation observed during peek-a-boo.",
      "Two consistent word approximations recorded: 'mama', 'ba' for ball.",
      "Delayed head turn for sounds presented from behind the midline.",
    ],
    riskFactors: [
      "Expressive vocabulary below the 25th percentile for chronological age.",
      "History of recurrent middle-ear infection may affect auditory access.",
    ],
  },
  {
    id: "r_002",
    childId: "c_1",
    ageBandId: "1-2y",
    completedAt: "2026-06-19T10:02:00Z",
    overallScore: 71,
    matrixLevel: 3,
    matrixLevelName: "Unconventional Communication",
    responseLatencyMs: 1780,
    riskLevel: "monitor",
    confidence: 0.88,
    scores: {
      eyeContact: 76,
      speech: 58,
      gesture: 74,
      attention: 70,
      facialExpression: 82,
      auditoryResponse: 68,
    },
    aiExplanation:
      "Gesture use was emerging but inconsistent, and vocal turns were mostly reactive rather than initiated. Eye contact quality improved across the session, suggesting warm-up effects.",
    observations: [
      "Reached toward desired objects without pointing in 3 of 4 trials.",
      "Gaze alternation between object and caregiver observed once.",
    ],
    riskFactors: ["Limited initiation of communicative turns."],
  },
  {
    id: "r_001",
    childId: "c_1",
    ageBandId: "6-12m",
    completedAt: "2026-05-08T08:40:00Z",
    overallScore: 64,
    matrixLevel: 3,
    matrixLevelName: "Unconventional Communication",
    responseLatencyMs: 2130,
    riskLevel: "elevated",
    confidence: 0.84,
    scores: {
      eyeContact: 68,
      speech: 52,
      gesture: 60,
      attention: 64,
      facialExpression: 76,
      auditoryResponse: 62,
    },
    aiExplanation:
      "Baseline screening showed slower orientation to auditory cues and limited gesture vocabulary relative to age expectations.",
    observations: ["Name response present in 2 of 5 trials.", "Social smile reliably elicited."],
    riskFactors: ["Slow auditory orientation.", "Reduced gesture repertoire."],
  },
];

export const DEMO_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec1",
    category: "daily",
    title: "Narrate the routine",
    description:
      "Describe every step of nappy changes, meals and bath time using short three-word phrases. Pause after each phrase to invite a vocal turn.",
    durationMinutes: 10,
    frequency: "3× daily",
  },
  {
    id: "rec2",
    category: "game",
    title: "Two-choice offering",
    description:
      "Hold two toys apart at eye level and ask which one she wants. Only hand over the toy after a point, reach or vocalisation.",
    durationMinutes: 5,
    frequency: "Daily",
  },
  {
    id: "rec3",
    category: "exercise",
    title: "Sound localisation practice",
    description:
      "Shake a rattle quietly from behind the left, then the right shoulder. Reward the head turn with praise and eye contact.",
    durationMinutes: 5,
    frequency: "5× weekly",
  },
  {
    id: "rec4",
    category: "speech",
    title: "Consonant expansion",
    description:
      "Model /b/, /m/ and /d/ sounds in playful repetition: ba-ba-ball, mmm-milk. Exaggerate lip movement so she can watch your mouth.",
    durationMinutes: 8,
    frequency: "Daily",
  },
  {
    id: "rec5",
    category: "tip",
    title: "Wait five seconds",
    description:
      "After every question, count silently to five. Extended wait time is the single strongest driver of communicative initiation at this stage.",
    durationMinutes: 0,
    frequency: "Always",
  },
  {
    id: "rec6",
    category: "game",
    title: "Peek-a-boo variations",
    description:
      "Use a scarf, a book and your hands. Vary the timing so she must anticipate and signal for the reveal.",
    durationMinutes: 6,
    frequency: "4× weekly",
  },
];

export const DEMO_GOALS: WeeklyGoal[] = [
  { id: "g1", title: "Spontaneous points per day", progress: 68, target: "6 per day" },
  { id: "g2", title: "New word approximations", progress: 40, target: "4 new this week" },
  { id: "g3", title: "Shared-attention episodes", progress: 85, target: "10 per day" },
];

export const DEMO_MILESTONES: Milestone[] = [
  { id: "m1", title: "Responds to own name", date: "Mar 2026", achieved: true, description: "Consistent within 2 seconds." },
  { id: "m2", title: "Uses index-finger point", date: "Jul 2026", achieved: true, description: "Observed to request objects." },
  { id: "m3", title: "Ten spoken words", date: "Target Oct 2026", achieved: false, description: "Currently at 2 approximations." },
  { id: "m4", title: "Two-word combinations", date: "Target Feb 2027", achieved: false, description: "Expected between 20–24 months." },
];

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    title: "Monthly screening is due",
    body: "Zuri's 1–2 year communication screening is ready to record.",
    time: "2h ago",
    type: "reminder",
    read: false,
  },
  {
    id: "n2",
    title: "Clinician report generated",
    body: "The July report is ready to download and share.",
    time: "Yesterday",
    type: "report",
    read: false,
  },
  {
    id: "n3",
    title: "Gesture use improved 14%",
    body: "Pointing frequency increased since the June session.",
    time: "3 days ago",
    type: "insight",
    read: true,
  },
];

export const PROGRESS_SERIES = [
  { month: "Feb", overall: 52, speech: 40, gesture: 48, eyeContact: 58 },
  { month: "Mar", overall: 57, speech: 45, gesture: 54, eyeContact: 62 },
  { month: "Apr", overall: 61, speech: 49, gesture: 57, eyeContact: 65 },
  { month: "May", overall: 64, speech: 52, gesture: 60, eyeContact: 68 },
  { month: "Jun", overall: 71, speech: 58, gesture: 74, eyeContact: 76 },
  { month: "Jul", overall: 78, speech: 68, gesture: 84, eyeContact: 82 },
];