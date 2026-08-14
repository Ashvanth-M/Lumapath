import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgeBandId, AssessmentResult } from "@/types";

/**
 * App-level UI state (Zustand).
 *
 * IMPORTANT: This store holds ONLY transient UI state and the current
 * assessment draft. Persistent user/child/clinical data comes from Supabase
 * via useAuth() and the service layer — never from this store.
 */

interface AssessmentDraft {
  ageBandId: AgeBandId | null;
  activityIndex: number;
  recordedActivityIds: string[];
  updatedAt: string | null;
}

interface AppState {
  /** In-progress assessment draft. */
  draft: AssessmentDraft;
  /** Locally cached results for instant replay navigation. */
  savedResults: AssessmentResult[];

  startDraft: (ageBandId: AgeBandId) => void;
  advanceDraft: (activityId: string) => void;
  resetDraft: () => void;
  saveResult: (result: AssessmentResult) => void;
  clearResults: () => void;
}

const emptyDraft: AssessmentDraft = {
  ageBandId: null,
  activityIndex: 0,
  recordedActivityIds: [],
  updatedAt: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      draft: emptyDraft,
      savedResults: [],
      startDraft: (ageBandId) =>
        set({
          draft: {
            ageBandId,
            activityIndex: 0,
            recordedActivityIds: [],
            updatedAt: new Date().toISOString(),
          },
        }),
      advanceDraft: (activityId) =>
        set((s) => ({
          draft: {
            ...s.draft,
            activityIndex: s.draft.activityIndex + 1,
            recordedActivityIds: [...s.draft.recordedActivityIds, activityId],
            updatedAt: new Date().toISOString(),
          },
        })),
      resetDraft: () => set({ draft: emptyDraft }),
      saveResult: (result) =>
        set((s) => ({
          savedResults: [result, ...s.savedResults.filter((r) => r.id !== result.id)].slice(0, 50),
        })),
      clearResults: () => set({ savedResults: [] }),
    }),
    { name: "lumapath-app" },
  ),
);