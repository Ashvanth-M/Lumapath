import type { StandardActivity } from "@/types";

export const SCREENING_DISCLAIMER =
  "AI-assisted Screening Tool. Not intended to replace clinical diagnosis.";

/** The five standardized parent–child interaction activities. */
export const STANDARD_ACTIVITIES: StandardActivity[] = [
  {
    id: "response-to-name",
    title: "Response to Name",
    purpose: "Observe orientation toward caregiver after hearing name.",
    icon: "megaphone",
    recommendedSeconds: 45,
    observes: ["Head turn", "Eye contact", "Response latency"],
    setup: [
      "Sit your child comfortably, slightly out of your direct line of sight.",
      "Place the camera so both faces are visible.",
      "Call the name warmly, then wait five full seconds. Repeat up to four times.",
    ],
  },
  {
    id: "toy-presentation",
    title: "Toy Presentation",
    purpose: "Observe attention toward presented object.",
    icon: "toy",
    recommendedSeconds: 45,
    observes: ["Visual tracking", "Attention hold", "Face orientation"],
    setup: [
      "Hold a bright toy about 30 cm from your child's face.",
      "Move it slowly left to right, roughly one hand-width per second.",
      "Do not name the toy — we are measuring visual attention only.",
    ],
  },
  {
    id: "requesting-a-toy",
    title: "Requesting a Toy",
    purpose: "Observe pointing, reaching and intentional communication.",
    icon: "point",
    recommendedSeconds: 60,
    observes: ["Pointing", "Reaching", "Intentional signalling"],
    setup: [
      "Place two toys equally apart and just out of reach.",
      "Ask which one your child wants, then wait.",
      "Only hand it over after a point, reach or vocalisation.",
    ],
  },
  {
    id: "social-play",
    title: "Social Play",
    purpose: "Observe smile, eye contact and shared attention.",
    icon: "peekaboo",
    recommendedSeconds: 60,
    observes: ["Smile duration", "Gaze alternation", "Shared attention"],
    setup: [
      "Play peek-a-boo, hiding behind your hands or a scarf.",
      "Vary the timing so your child has to anticipate the reveal.",
      "Repeat at least three times.",
    ],
  },
  {
    id: "free-play",
    title: "Free Play",
    purpose: "Observe natural communication behaviours.",
    icon: "sparkles",
    recommendedSeconds: 90,
    observes: ["Spontaneous vocalisation", "Play quality", "Initiation"],
    setup: [
      "Let your child choose what to play with.",
      "Follow their lead rather than directing the play.",
      "Stay in frame but interact naturally.",
    ],
  },
];

export function getStandardActivity(id: string) {
  return STANDARD_ACTIVITIES.find((a) => a.id === id) ?? STANDARD_ACTIVITIES[0];
}

/** Ordered analysis pipeline shown on the analysis page. */
export const ANALYSIS_STAGES = [
  { key: "upload", label: "Uploading", model: "Secure transfer", weight: 1 },
  { key: "frames", label: "Frame Extraction", model: "OpenCV", weight: 2 },
  { key: "face", label: "Face Detection", model: "MediaPipe Face Detection", weight: 2 },
  { key: "head", label: "Head Tracking", model: "MediaPipe Face Mesh", weight: 2 },
  { key: "gaze", label: "Eye Contact", model: "MediaPipe Face Mesh", weight: 2 },
  { key: "social", label: "Social Engagement", model: "Behaviour heuristics", weight: 2 },
  { key: "object", label: "Object Interaction", model: "MediaPipe Hands", weight: 2 },
  { key: "vad", label: "Voice Activity Detection", model: "OpenAI Whisper", weight: 2 },
  { key: "vocal", label: "Vocalisation Analysis", model: "OpenAI Whisper", weight: 2 },
  { key: "latency", label: "Response Latency", model: "Temporal model", weight: 1 },
  { key: "timeline", label: "Behaviour Timeline", model: "Event fusion", weight: 1 },
  { key: "matrix", label: "Communication Matrix Mapping", model: "Rule engine", weight: 1 },
  { key: "report", label: "Behaviour Report Generation", model: "Google Gemini", weight: 2 },
] as const;

export const AI_MODEL_STACK = [
  {
    group: "Computer Vision",
    items: ["MediaPipe Face Detection", "MediaPipe Face Mesh", "MediaPipe Hands"],
  },
  { group: "Speech Processing", items: ["OpenAI Whisper"] },
  { group: "Behaviour Analysis", items: ["OpenCV"] },
  { group: "Reasoning", items: ["Google Gemini"] },
];

export const AI_MODULES = [
  { title: "Face Detection", body: "Locates and tracks the child's face across every extracted frame." },
  { title: "Head Tracking", body: "Measures head orientation and turn events toward the caregiver." },
  { title: "Eye Contact", body: "Estimates mutual-gaze windows and their duration." },
  { title: "Social Engagement", body: "Smile, gaze alternation and shared-attention episodes." },
  { title: "Vocal Behaviour", body: "Voice activity, vocalisation count and speech attempts." },
  { title: "Object Interaction", body: "Reaching, grasping and pointing toward presented objects." },
  { title: "Response Latency", body: "Time from caregiver prompt to the child's first response." },
  { title: "Behaviour Timeline", body: "Every detected behaviour, timestamped against the video." },
  { title: "Communication Matrix", body: "Maps observations onto the seven-level Communication Matrix." },
  { title: "Clinician Report", body: "Structured, exportable summary written for a clinical reader." },
];

export const WHY_LUMAPATH = [
  { title: "Home-based screening", body: "Record a five-minute interaction in your living room — no clinic visit." },
  { title: "Objective AI measurements", body: "Counts, durations and latencies instead of recalled impressions." },
  { title: "Supports clinicians", body: "Objective observations arrive before the appointment, not during it." },
  { title: "Accessible anywhere", body: "Any phone camera, any browser, no specialist equipment." },
  { title: "Progress monitoring", body: "Every upload extends a longitudinal behavioural record." },
  { title: "Parent-friendly", body: "Plain-language explanations alongside the clinical detail." },
];

export const HOW_IT_WORKS = [
  { n: "01", title: "Record standardized activity", body: "Follow the on-screen setup for one of five standardized interactions." },
  { n: "02", title: "Upload video", body: "Drag and drop MP4, MOV or AVI. We check duration, resolution and audio." },
  { n: "03", title: "AI behaviour analysis", body: "Vision and speech models extract behavioural features frame by frame." },
  { n: "04", title: "Behaviour report", body: "Scores, timeline, Communication Matrix level and AI confidence." },
  { n: "05", title: "Clinician review", body: "Your clinician reads objective observations before deciding anything." },
];
