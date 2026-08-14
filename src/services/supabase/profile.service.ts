/**
 * Profile & children data service — Supabase-backed.
 */
import { supabase } from "@/lib/supabase/client";
import type { InsertTables, Tables, UpdateTables } from "@/lib/supabase/types";

// ── Profiles ──────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Tables<"profiles"> | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function upsertProfile(
  profile: InsertTables<"profiles">,
): Promise<Tables<"profiles"> | null> {
  const { data } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();
  return data;
}

export async function updateProfile(
  userId: string,
  updates: UpdateTables<"profiles">,
): Promise<Tables<"profiles"> | null> {
  const { data } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  return data;
}

// ── Children ──────────────────────────────────────────────────────────────

export async function getChildren(parentId: string): Promise<Tables<"children">[]> {
  const { data } = await supabase
    .from("children")
    .select("*")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getChild(childId: string): Promise<Tables<"children"> | null> {
  const { data } = await supabase.from("children").select("*").eq("id", childId).single();
  return data;
}

export async function createChild(
  child: InsertTables<"children">,
): Promise<Tables<"children"> | null> {
  const { data } = await supabase.from("children").insert(child).select().single();
  return data;
}

export async function updateChild(
  childId: string,
  updates: UpdateTables<"children">,
): Promise<Tables<"children"> | null> {
  const { data } = await supabase
    .from("children")
    .update(updates)
    .eq("id", childId)
    .select()
    .single();
  return data;
}
