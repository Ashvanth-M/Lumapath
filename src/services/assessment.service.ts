import {
  DEMO_GOALS,
  DEMO_MILESTONES,
  DEMO_NOTIFICATIONS,
  DEMO_RESULTS,
  PROGRESS_SERIES,
} from "@/services/mockData";
import type { AssessmentResult } from "@/types";

const delay = (ms = 40) => new Promise((r) => setTimeout(r, ms));

export async function listAssessments(): Promise<AssessmentResult[]> {
  await delay();
  return DEMO_RESULTS;
}

export async function getAssessment(id: string): Promise<AssessmentResult> {
  await delay();
  return DEMO_RESULTS.find((r) => r.id === id) ?? DEMO_RESULTS[0];
}

export async function getLatestAssessment(): Promise<AssessmentResult> {
  await delay();
  return DEMO_RESULTS[0];
}

export async function getProgressSeries() {
  await delay();
  return PROGRESS_SERIES;
}

export async function getGoals() {
  await delay(30);
  return DEMO_GOALS;
}

export async function getMilestones() {
  await delay(30);
  return DEMO_MILESTONES;
}

export async function getNotifications() {
  await delay(30);
  return DEMO_NOTIFICATIONS;
}