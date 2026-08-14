/**
 * Real recommendation engine — generates recommendations from actual metrics.
 *
 * Each recommendation includes the reason it was generated.
 */
import type { AssessmentResult, Recommendation } from "@/types";

/**
 * Generates recommendations based on actual domain scores from an assessment.
 */
export function generateRecommendationsFromResult(result: AssessmentResult): Recommendation[] {
  const recs: Recommendation[] = [];
  const { scores } = result;

  // Eye Contact / Social Engagement
  if (scores.eyeContact < 50) {
    recs.push({
      id: `rec-eye-${result.id}`,
      category: "daily",
      title: "Eye contact practice during meals",
      description:
        `Eye contact score was ${scores.eyeContact}/100. Hold preferred foods at your eye level before offering. ` +
        "Praise and smile when the child makes brief eye contact. Keep sessions short (2–3 minutes) and positive.",
      durationMinutes: 3,
      frequency: "3× daily",
    });
  } else if (scores.eyeContact < 70) {
    recs.push({
      id: `rec-eye-${result.id}`,
      category: "game",
      title: "Peek-a-boo with variations",
      description:
        `Eye contact score was ${scores.eyeContact}/100. Use a scarf, a book and your hands. ` +
        "Vary the timing so the child must anticipate and signal for the reveal, encouraging gaze and shared attention.",
      durationMinutes: 5,
      frequency: "4× weekly",
    });
  }

  // Speech / Vocal Activity
  if (scores.speech < 50) {
    recs.push({
      id: `rec-speech-${result.id}`,
      category: "speech",
      title: "Consonant expansion practice",
      description:
        `Vocal activity score was ${scores.speech}/100. Model /b/, /m/ and /d/ sounds in playful repetition: ` +
        "ba-ba-ball, mmm-milk. Exaggerate lip movement so the child can watch your mouth.",
      durationMinutes: 8,
      frequency: "Daily",
    });
  } else if (scores.speech < 70) {
    recs.push({
      id: `rec-speech-${result.id}`,
      category: "daily",
      title: "Narrate the routine",
      description:
        `Vocal activity score was ${scores.speech}/100. Describe every step of nappy changes, meals and bath time ` +
        "using short three-word phrases. Pause after each phrase to invite a vocal turn.",
      durationMinutes: 10,
      frequency: "3× daily",
    });
  }

  // Gesture
  if (scores.gesture < 50) {
    recs.push({
      id: `rec-gesture-${result.id}`,
      category: "game",
      title: "Two-choice offering for pointing practice",
      description:
        `Gesture score was ${scores.gesture}/100. Hold two toys apart at eye level and ask which one the child wants. ` +
        "Only hand over the toy after a point, reach or vocalisation.",
      durationMinutes: 5,
      frequency: "Daily",
    });
  }

  // Attention
  if (scores.attention < 50) {
    recs.push({
      id: `rec-attention-${result.id}`,
      category: "exercise",
      title: "Sustained attention games",
      description:
        `Attention score was ${scores.attention}/100. Use bubbles, spinning tops, or cause-and-effect toys. ` +
        "Extend the activity slightly longer each day. Celebrate moments of focused engagement.",
      durationMinutes: 5,
      frequency: "Daily",
    });
  }

  // Response Latency
  if (result.responseLatencyMs > 2000) {
    recs.push({
      id: `rec-latency-${result.id}`,
      category: "exercise",
      title: "Response-to-name practice in quiet conditions",
      description:
        `Response latency was ${(result.responseLatencyMs / 1000).toFixed(1)}s. ` +
        "Repeat the standardized response-to-name activity under quieter conditions. " +
        "Call the child's name from different positions and wait 5 seconds before repeating.",
      durationMinutes: 5,
      frequency: "5× weekly",
    });
  }

  // Auditory Response
  if (scores.auditoryResponse < 60) {
    recs.push({
      id: `rec-auditory-${result.id}`,
      category: "exercise",
      title: "Sound localisation practice",
      description:
        `Auditory response score was ${scores.auditoryResponse}/100. ` +
        "Shake a rattle quietly from behind the left, then the right shoulder. " +
        "Reward the head turn with praise and eye contact.",
      durationMinutes: 5,
      frequency: "5× weekly",
    });
  }

  // Always include the "wait" tip
  recs.push({
    id: `rec-wait-${result.id}`,
    category: "tip",
    title: "Wait five seconds",
    description:
      "After every question, count silently to five. Extended wait time is the single strongest " +
      "driver of communicative initiation at this stage.",
    durationMinutes: 0,
    frequency: "Always",
  });

  // Video quality advice
  if (result.analysis?.video?.quality === "poor" || result.analysis?.video?.quality === "acceptable") {
    recs.push({
      id: `rec-quality-${result.id}`,
      category: "tip",
      title: "Improve video recording quality",
      description:
        `Video quality was "${result.analysis.video.quality}". ` +
        "Record again with both faces clearly visible and adequate lighting. " +
        "Use a stable surface for the camera at the child's eye level.",
      durationMinutes: 0,
      frequency: "Next session",
    });
  }

  return recs;
}