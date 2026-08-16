import { AGE_BANDS } from "@/constants";
import type { AgeBandId } from "@/types";

export function ageInMonths(birthDate: string): number {
  const dob = new Date(birthDate);
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - dob.getFullYear()) * 12 +
      (now.getMonth() - dob.getMonth()) -
      (now.getDate() < dob.getDate() ? 1 : 0),
  );
}

export function formatAge(birthDate: string): string {
  const months = ageInMonths(birthDate);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} yr ${rest} mo` : `${years} years`;
}

export function ageBandForBirthDate(birthDate: string): AgeBandId {
  const months = ageInMonths(birthDate);
  const band = AGE_BANDS.find((b) => months >= b.monthsMin && months < b.monthsMax);
  return band?.id ?? "4-6y";
}

export function formatLatency(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}