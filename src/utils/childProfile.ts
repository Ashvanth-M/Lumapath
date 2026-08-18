import type { Tables } from "@/lib/supabase/types";
import type { ChildProfile } from "@/types";
import { ageBandForBirthDate } from "@/utils/age";

/**
 * Maps a Supabase `children` row to the app-level ChildProfile shape.
 *
 * The database stores only what the parent entered; the age band is always
 * derived from the birth date so it can never drift out of date, and the two
 * history lists have no table yet — they default to empty rather than being
 * faked, so a page showing "no entries" is telling the truth.
 */
export function toChildProfile(row: Tables<"children">): ChildProfile {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    gender: row.gender,
    medicalNotes: row.medical_notes ?? undefined,
    ageBandId: ageBandForBirthDate(row.birth_date),
    developmentHistory: [],
    communicationHistory: [],
  };
}
