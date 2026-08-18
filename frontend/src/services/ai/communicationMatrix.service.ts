import { COMMUNICATION_MATRIX_LEVELS } from "@/constants";

/** Placeholder Communication Matrix mapping engine. */
export interface MatrixMapping {
  level: number;
  name: string;
  detail: string;
  nextLevelTargets: string[];
}

export async function mapToCommunicationMatrix(
  scores: Record<string, number>,
): Promise<MatrixMapping> {
  await new Promise((r) => setTimeout(r, 350));
  const values = Object.values(scores);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const level = Math.min(7, Math.max(1, Math.round(avg / 14)));
  const entry = COMMUNICATION_MATRIX_LEVELS.find((l) => l.level === level)!;
  return {
    ...entry,
    nextLevelTargets: [
      "Increase spontaneous communicative initiations",
      "Expand consistent symbol or word use",
      "Generalise signals across new partners",
    ],
  };
}