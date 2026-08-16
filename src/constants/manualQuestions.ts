import type { AgeBandId, ScoreKey } from "@/types";

export type AnswerValue = "yes" | "sometimes" | "no";

export interface ManualQuestion {
  id: string;
  text: string;
  helper: string;
  domain: ScoreKey;
}

export const ANSWER_OPTIONS: { value: AnswerValue; label: string; score: number }[] = [
  { value: "yes", label: "Yes, consistently", score: 100 },
  { value: "sometimes", label: "Sometimes", score: 60 },
  { value: "no", label: "Not yet", score: 20 },
];

const COMMON: ManualQuestion[] = [
  {
    id: "q_name",
    text: "Does your baby turn or look at you when you say their name?",
    helper: "Call the name twice from just outside their line of sight in a quiet room.",
    domain: "auditoryResponse",
  },
  {
    id: "q_peekaboo",
    text: "Did your baby smile or laugh during a peek-a-boo game?",
    helper: "Cover your face, reveal it and say peek-a-boo three times.",
    domain: "facialExpression",
  },
  {
    id: "q_eye",
    text: "Does your child hold eye contact with you for a few seconds?",
    helper: "Face-to-face, about 40 cm apart, without touching them.",
    domain: "eyeContact",
  },
  {
    id: "q_sound",
    text: "Does your child answer you with sounds, babbles or words?",
    helper: "Speak, then pause for four seconds to leave them a turn.",
    domain: "speech",
  },
  {
    id: "q_yesno",
    text: "Can your child say or show yes and no (word, nod or head shake)?",
    helper: "Offer a favourite item and one they dislike, then watch the reply.",
    domain: "speech",
  },
  {
    id: "q_point",
    text: "Does your child point, reach or gesture to ask for something?",
    helper: "Hold two toys apart and ask which one they want.",
    domain: "gesture",
  },
  {
    id: "q_wave",
    text: "Does your child wave bye-bye or copy simple gestures?",
    helper: "Wave and say bye-bye, then wait — do not move their hand.",
    domain: "gesture",
  },
  {
    id: "q_track",
    text: "Does your child follow a moving toy with their eyes?",
    helper: "Move a bright toy slowly from left to right.",
    domain: "attention",
  },
  {
    id: "q_shared",
    text: "Does your child look between you and a toy to share interest?",
    helper: "Show excitement about a toy and watch whether they check your face.",
    domain: "attention",
  },
  {
    id: "q_clap",
    text: "Does your child react to sudden sounds such as a clap or a door?",
    helper: "Clap twice out of view and watch for a turn or startle.",
    domain: "auditoryResponse",
  },
];

const OLDER: ManualQuestion[] = [
  {
    id: "q_words",
    text: "Does your child use at least a few clear words other people understand?",
    helper: "Count words used meaningfully, not just imitated.",
    domain: "speech",
  },
  {
    id: "q_instruction",
    text: "Does your child follow a simple instruction without gestures?",
    helper: 'Try "give me the ball" with your hands still.',
    domain: "attention",
  },
  {
    id: "q_pretend",
    text: "Does your child join pretend play (feeding a doll, driving a car)?",
    helper: "Offer a doll and a spoon and watch what they do.",
    domain: "facialExpression",
  },
];

export const MANUAL_QUESTIONS_BY_BAND: Record<AgeBandId, ManualQuestion[]> = {
  "0-6m": COMMON.slice(0, 6),
  "6-12m": COMMON.slice(0, 8),
  "1-2y": COMMON,
  "2-3y": [...COMMON, ...OLDER],
  "3-4y": [...COMMON, ...OLDER],
  "4-6y": [...COMMON, ...OLDER],
};
