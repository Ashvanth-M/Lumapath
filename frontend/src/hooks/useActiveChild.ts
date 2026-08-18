import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toChildProfile } from "@/utils/childProfile";
import type { ChildProfile } from "@/types";

export interface ActiveChildState {
  /** The selected child, mapped to the app-level shape. Null until one loads. */
  child: ChildProfile | null;
  /** True while the auth session and child list are still being fetched. */
  loading: boolean;
  /** True once loading finished and the parent has no children on record. */
  needsOnboarding: boolean;
}

/**
 * The single source of truth for "which child is this page about".
 *
 * Replaces the old `useAppStore(s => s.child)`, which held a full profile in
 * client state. Child data now lives in Supabase behind RLS, so pages read it
 * through here instead of the store.
 */
export function useActiveChild(): ActiveChildState {
  const { activeChild, loading, children } = useAuth();

  const child = useMemo(
    () => (activeChild ? toChildProfile(activeChild) : null),
    [activeChild],
  );

  return {
    child,
    loading,
    needsOnboarding: !loading && children.length === 0,
  };
}
