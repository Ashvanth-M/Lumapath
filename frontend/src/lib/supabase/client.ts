/**
 * Browser-side Supabase client.
 *
 * Uses only the publishable anon key (VITE_SUPABASE_ANON_KEY) which is safe
 * to expose in the browser bundle. All data access is governed by RLS policies.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the app has been given credentials to talk to Supabase. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Throwing here would run at module load and blank the whole app, including
  // the landing page, with no clue as to why. Warn instead — requests fail with
  // a readable error, and the setup steps are in .env.example.
  console.warn(
    "[LumaPath] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.local and add your Supabase project credentials. " +
      "Sign-in and all data loading will fail until you do.",
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
