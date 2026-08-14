/**
 * Server-side Supabase client (TanStack Start server functions only).
 *
 * Uses the service-role key to bypass RLS when needed for admin operations.
 * NEVER import this file from browser-side code.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createServerClient() {
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error(
      "Missing server-side Supabase environment variables (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
