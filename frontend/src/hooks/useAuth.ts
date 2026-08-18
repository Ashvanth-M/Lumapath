/**
 * Supabase Auth hook — manages authentication state across the app.
 *
 * Listens to auth state changes, fetches the profile and children from the
 * database, and provides helpers for sign-in, sign-up, and sign-out.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthState {
  /** True while the initial session check is in progress. */
  loading: boolean;
  /** Supabase auth session. */
  session: Session | null;
  /** Supabase auth user. */
  user: User | null;
  /** The user's profile from the `profiles` table. */
  profile: Tables<"profiles"> | null;
  /** All children belonging to this parent. */
  children: Tables<"children">[];
  /** Currently selected child (first by default). */
  activeChild: Tables<"children"> | null;

  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshChildren: () => Promise<void>;
  setActiveChild: (child: Tables<"children">) => void;
}

export function useAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [children, setChildren] = useState<Tables<"children">[]>([]);
  const [activeChild, setActiveChild] = useState<Tables<"children"> | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    return data;
  }, []);

  const fetchChildren = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", userId)
      .order("created_at", { ascending: true });
    const kids = data ?? [];
    setChildren(kids);
    setActiveChild((prev) => {
      if (prev && kids.some((c) => c.id === prev.id)) return prev;
      return kids[0] ?? null;
    });
    return kids;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const refreshChildren = useCallback(async () => {
    if (user) await fetchChildren(user.id);
  }, [user, fetchChildren]);

  // Listen to auth state changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        Promise.all([fetchProfile(s.user.id), fetchChildren(s.user.id)]).finally(() =>
          setLoading(false),
        );
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
        fetchChildren(s.user.id);
      } else {
        setProfile(null);
        setChildren([]);
        setActiveChild(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchChildren]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setChildren([]);
    setActiveChild(null);
  }, []);

  return {
    loading,
    session,
    user,
    profile,
    children,
    activeChild,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    refreshChildren,
    setActiveChild,
  };
}
