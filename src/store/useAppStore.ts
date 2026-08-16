import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgeBandId, AssessmentResult, ChildProfile, ParentProfile } from "@/types";
import { DEMO_CHILD, DEMO_PARENT } from "@/services/mockData";

interface AssessmentDraft {
  ageBandId: AgeBandId | null;
  activityIndex: number;
  recordedActivityIds: string[];
  updatedAt: string | null;
}

interface AppState {
  isAuthenticated: boolean;
  parent: ParentProfile | null;
  child: ChildProfile | null;
  draft: AssessmentDraft;
  savedResults: AssessmentResult[];
  login: (email: string) => void;
  loginWithGoogle: () => void;
  logout: () => void;
  saveParent: (parent: ParentProfile) => void;
  saveChild: (child: ChildProfile) => void;
  startDraft: (ageBandId: AgeBandId) => void;
  advanceDraft: (activityId: string) => void;
  resetDraft: () => void;
  saveResult: (result: AssessmentResult) => void;
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
      isAuthenticated: false,
      parent: null,
      child: null,
      draft: emptyDraft,
      savedResults: [],
      login: (email) =>
        set((s) => ({
          isAuthenticated: true,
          parent: s.parent ? { ...s.parent, email } : { ...DEMO_PARENT, email },
        })),
      loginWithGoogle: () =>
        set((s) => ({
          isAuthenticated: true,
          parent: s.parent ?? DEMO_PARENT,
          child: s.child ?? DEMO_CHILD,
        })),
      logout: () =>
        set({ isAuthenticated: false, draft: emptyDraft }),
      saveParent: (parent) => set({ parent }),
      saveChild: (child) => set({ child }),
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
        set((s) => ({ savedResults: [result, ...s.savedResults.filter((r) => r.id !== result.id)] })),
    }),
    { name: "lumapath-app" },
  ),
);