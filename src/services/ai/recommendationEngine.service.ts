import { DEMO_RECOMMENDATIONS } from "@/services/mockData";
import type { Recommendation } from "@/types";

/** Placeholder recommendation engine. */
export async function generateRecommendations(assessmentId: string): Promise<Recommendation[]> {
  await new Promise((r) => setTimeout(r, 60));
  void assessmentId;
  return DEMO_RECOMMENDATIONS;
}