/**
 * Developmental milestone seeding and progress notifications.
 *
 * The `milestones` and `notifications` tables have existed since the first
 * migration with nothing ever writing to them, so both features rendered
 * permanently empty. These are the writers.
 *
 * The milestone list encodes widely-taught developmental expectations. Like the
 * age-band thresholds, they are a defensible starting point rather than
 * validated norms — a clinician should be able to disagree with any single row.
 */
import { supabase } from "@/lib/supabase/client";
import { ageBandForBirthDate } from "@/utils/age";
import type { AgeBandId, AssessmentResult } from "@/types";

interface MilestoneSeed {
  title: string;
  description: string;
  /** Age in months by which this is typically observed. */
  byMonths: number;
}

const MILESTONES: MilestoneSeed[] = [
  { title: "Social smile", description: "Smiles in response to your face and voice.", byMonths: 3 },
  { title: "Turns toward sounds", description: "Looks toward a voice or noise nearby.", byMonths: 5 },
  { title: "Babbles with consonants", description: "Repeats sounds like ba-ba or da-da.", byMonths: 8 },
  { title: "Responds to their name", description: "Turns within a couple of seconds when called.", byMonths: 10 },
  { title: "Points at things", description: "Points to ask for something or to show you.", byMonths: 14 },
  { title: "Waves and gestures", description: "Uses bye-bye, clapping or nodding on purpose.", byMonths: 15 },
  { title: "First meaningful word", description: "Uses a word consistently to mean one thing.", byMonths: 15 },
  { title: "Follows a simple instruction", description: "Understands 'give me the ball' without gestures.", byMonths: 18 },
  { title: "Combines two words", description: "Puts words together — 'more milk', 'daddy go'.", byMonths: 26 },
  { title: "Takes conversational turns", description: "Waits, then responds in a back-and-forth exchange.", byMonths: 32 },
  { title: "Pretend play", description: "Feeds a doll, or uses a block as a phone.", byMonths: 34 },
  { title: "Speaks in sentences", description: "Uses three- to four-word sentences.", byMonths: 42 },
  { title: "Understood by strangers", description: "People outside the family understand most speech.", byMonths: 48 },
  { title: "Tells a simple story", description: "Recounts something that happened, in order.", byMonths: 60 },
];

/** Milestones relevant to a child's current stage, plus the next few ahead. */
function relevantFor(birthDate: string): MilestoneSeed[] {
  const dob = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  // Everything up to now, plus a year of what's coming, so the timeline shows
  // both what's been reached and what to watch for.
  return MILESTONES.filter((m) => m.byMonths <= months + 12);
}

/**
 * Creates the milestone timeline for a newly added child.
 *
 * Safe to call more than once — existing rows short-circuit it, so a repeated
 * onboarding submit cannot duplicate the list.
 */
export async function seedMilestones(childId: string, birthDate: string): Promise<number> {
  const { data: existing } = await supabase
    .from("milestones")
    .select("id")
    .eq("child_id", childId)
    .limit(1);
  if (existing && existing.length > 0) return 0;

  const dob = new Date(birthDate);
  const rows = relevantFor(birthDate).map((m) => {
    const target = new Date(dob);
    target.setMonth(target.getMonth() + m.byMonths);
    return {
      child_id: childId,
      title: m.title,
      description: m.description,
      target_date: target.toISOString().slice(0, 10),
      status: "pending" as const,
    };
  });

  if (rows.length === 0) return 0;
  const { error } = await supabase.from("milestones").insert(rows);
  return error ? 0 : rows.length;
}

/* --------------------------------------------------------- notifications --- */

type NotificationType = "reminder" | "report" | "insight" | "system";

async function notify(
  profileId: string,
  title: string,
  message: string,
  type: NotificationType,
): Promise<void> {
  // Notifications are a courtesy — never let a failure here break the flow that
  // triggered them.
  await supabase
    .from("notifications")
    .insert({ profile_id: profileId, title, message, type })
    .then(undefined, () => undefined);
}

/**
 * Writes the notifications that follow a completed screening: the result
 * itself, anything worth flagging, and when to screen again.
 */
export async function notifyResultReady(
  profileId: string,
  childName: string,
  result: AssessmentResult,
  previous?: AssessmentResult,
): Promise<void> {
  await notify(
    profileId,
    "Screening report ready",
    `${childName}'s results are ready — ${result.overallScore}/100, Communication Matrix Level ${result.matrixLevel}.`,
    "report",
  );

  if (previous) {
    const change = result.overallScore - previous.overallScore;
    if (Math.abs(change) >= 5) {
      await notify(
        profileId,
        change > 0 ? "Score improved" : "Score declined",
        `${childName}'s overall score moved ${change > 0 ? "up" : "down"} ${Math.abs(change)} points since the last session.`,
        "insight",
      );
    }
  }

  if (result.riskLevel === "elevated") {
    await notify(
      profileId,
      "Worth discussing with a clinician",
      `Several expected behaviours were not observed for ${childName}. Consider sharing this report with your paediatrician or a speech-language pathologist.`,
      "insight",
    );
  }

  await notify(
    profileId,
    "Next screening",
    result.riskLevel === "low"
      ? `Re-screen ${childName} in about three months to track change.`
      : `Re-screen ${childName} in about four weeks, under similar conditions, to see whether these behaviours are emerging.`,
    "reminder",
  );
}

/** Marks any milestone whose behaviour this result evidenced. */
export async function reconcileMilestones(
  childId: string,
  birthDate: string,
  result: AssessmentResult,
): Promise<void> {
  const band: AgeBandId = ageBandForBirthDate(birthDate);
  // Only claim a milestone on strong, age-appropriate evidence — a marginal
  // score should not tick off a developmental achievement.
  if (result.scores.gesture < 75 || band === "0-6m") return;

  const { data } = await supabase
    .from("milestones")
    .select("id, title")
    .eq("child_id", childId)
    .eq("status", "pending");

  const pointing = data?.find((m) => m.title === "Points at things");
  if (!pointing) return;

  await supabase
    .from("milestones")
    .update({
      status: "achieved",
      observed_date: result.completedAt.slice(0, 10),
    })
    .eq("id", pointing.id);
}
