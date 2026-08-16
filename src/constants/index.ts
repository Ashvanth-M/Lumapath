import type { Activity, AgeBand, AgeBandId, ScoreKey } from "@/types";

export const APP_NAME = "LumaPath AI";
export const APP_TAGLINE =
  "Beyond Assessment. Building an AI Development Companion for Every Child.";

export const AGE_BANDS: AgeBand[] = [
  {
    id: "0-6m",
    label: "0–6 Months",
    monthsMin: 0,
    monthsMax: 6,
    durationMinutes: 6,
    activityCount: 5,
    description: "Early social attention, startle response and pre-intentional signalling.",
    focusAreas: ["Auditory startle", "Eye gaze", "Social smile"],
  },
  {
    id: "6-12m",
    label: "6–12 Months",
    monthsMin: 6,
    monthsMax: 12,
    durationMinutes: 8,
    activityCount: 6,
    description: "Name response, babbling patterns and early joint attention.",
    focusAreas: ["Name response", "Babbling", "Joint attention"],
  },
  {
    id: "1-2y",
    label: "1–2 Years",
    monthsMin: 12,
    monthsMax: 24,
    durationMinutes: 10,
    activityCount: 7,
    description: "Pointing, gesture use, first words and simple instruction following.",
    focusAreas: ["Pointing", "First words", "Gestures"],
  },
  {
    id: "2-3y",
    label: "2–3 Years",
    monthsMin: 24,
    monthsMax: 36,
    durationMinutes: 12,
    activityCount: 7,
    description: "Two-word combinations, turn taking and symbolic play.",
    focusAreas: ["Word combining", "Turn taking", "Pretend play"],
  },
  {
    id: "3-4y",
    label: "3–4 Years",
    monthsMin: 36,
    monthsMax: 48,
    durationMinutes: 14,
    activityCount: 8,
    description: "Sentence structure, intelligibility and conversational exchange.",
    focusAreas: ["Sentences", "Intelligibility", "Conversation"],
  },
  {
    id: "4-6y",
    label: "4–6 Years",
    monthsMin: 48,
    monthsMax: 72,
    durationMinutes: 15,
    activityCount: 8,
    description: "Narrative language, comprehension depth and social pragmatics.",
    focusAreas: ["Narrative", "Comprehension", "Pragmatics"],
  },
];

export const ACTIVITIES_BY_BAND: Record<AgeBandId, Activity[]> = {
  "0-6m": [
    {
      id: "a1",
      title: "Call your child's name",
      instruction:
        "Sit about 40 cm away, out of your child's direct line of sight, and say their name warmly twice.",
      audioScript: "Say your child's name softly, then wait five seconds before repeating.",
      seconds: 30,
      icon: "megaphone",
      tip: "Keep the room quiet so the auditory response is measurable.",
    },
    {
      id: "a2",
      title: "Smile and hold eye contact",
      instruction: "Face your child, smile broadly and hold the expression for a few seconds.",
      audioScript: "Smile and wait for your child to smile back.",
      seconds: 30,
      icon: "smile",
      tip: "Avoid touching your child so the smile is socially triggered.",
    },
    {
      id: "a3",
      title: "Show a colourful toy",
      instruction: "Slowly move a bright toy from left to right in front of your child.",
      audioScript: "Move the toy slowly and watch whether the eyes track it.",
      seconds: 40,
      icon: "toy",
      tip: "Move at roughly one hand-width per second.",
    },
    {
      id: "a4",
      title: "Clap your hands",
      instruction: "Clap twice behind your child, then twice in front.",
      audioScript: "Clap twice out of view, then twice in view.",
      seconds: 30,
      icon: "clap",
      tip: "This checks auditory localisation.",
    },
    {
      id: "a5",
      title: "Talk face to face",
      instruction: "Talk to your child in a sing-song voice and pause to let them vocalise.",
      audioScript: "Speak warmly, then pause for four seconds.",
      seconds: 45,
      icon: "speech",
      tip: "Pauses are essential — they let us measure response latency.",
    },
  ],
  "6-12m": [],
  "1-2y": [],
  "2-3y": [],
  "3-4y": [],
  "4-6y": [],
};

const OLDER_EXTRA: Activity[] = [
  {
    id: "b1",
    title: "Wave goodbye",
    instruction: "Wave and say goodbye, then wait for your child to copy the gesture.",
    audioScript: "Wave and say bye-bye, then wait.",
    seconds: 30,
    icon: "wave",
    tip: "Do not take your child's hand — the gesture must be spontaneous.",
  },
  {
    id: "b2",
    title: "Play peek-a-boo",
    instruction: "Cover your face with your hands, then reveal it and say peek-a-boo.",
    audioScript: "Hide, reveal, and watch the reaction.",
    seconds: 40,
    icon: "peekaboo",
    tip: "Repeat three times for a reliable pattern.",
  },
  {
    id: "b3",
    title: "Ask your child to point",
    instruction: "Place two toys apart and ask which one your child wants.",
    audioScript: "Ask which toy they want and wait for a point or reach.",
    seconds: 45,
    icon: "point",
    tip: "Hold both toys at equal distance.",
  },
];

for (const band of ["6-12m", "1-2y", "2-3y", "3-4y", "4-6y"] as AgeBandId[]) {
  ACTIVITIES_BY_BAND[band] = [
    ...ACTIVITIES_BY_BAND["0-6m"].slice(0, band === "6-12m" ? 3 : 5),
    ...OLDER_EXTRA,
  ].map((a, i) => ({ ...a, id: `${band}-${i + 1}` }));
}

export const SCORE_LABELS: Record<ScoreKey, string> = {
  eyeContact: "Eye Contact",
  speech: "Speech & Vocalisation",
  gesture: "Gesture Use",
  attention: "Shared Attention",
  facialExpression: "Facial Expression",
  auditoryResponse: "Auditory Response",
};

export const COMMUNICATION_MATRIX_LEVELS = [
  { level: 1, name: "Pre-Intentional Behaviour", detail: "Behaviour reflects general state." },
  { level: 2, name: "Intentional Behaviour", detail: "Behaviour is intentional but not yet communicative." },
  { level: 3, name: "Unconventional Communication", detail: "Pre-symbolic signals used intentionally." },
  { level: 4, name: "Conventional Communication", detail: "Culturally shared gestures and vocalisations." },
  { level: 5, name: "Concrete Symbols", detail: "Pictures, objects and iconic gestures." },
  { level: 6, name: "Abstract Symbols", detail: "Single words, signs or printed words." },
  { level: 7, name: "Language", detail: "Combining symbols into ordered phrases." },
];

export const AI_PROCESSING_STEPS = [
  "Analyzing video frames",
  "Analyzing audio track",
  "Detecting eye contact",
  "Detecting facial expressions",
  "Gesture analysis",
  "Speech analysis",
  "Response latency modelling",
  "Communication Matrix mapping",
  "Generating AI report",
  "Creating recommendations",
];