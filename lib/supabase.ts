import { createClient } from "@supabase/supabase-js";

// Actual Supabase project credentials provided by the user
const SUPABASE_URL: string = "https://sdcfaatgwowadknxusta.supabase.co";
const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkY2ZhYXRnd293YWRrbnh1c3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDU0NDksImV4cCI6MjA5NTMyMTQ0OX0.idd5hJwaFQ9w_0pGC9Yvrpn_o_RLnXZkCM_XMUgBINk";

export const isSupabaseConfigured =
  SUPABASE_URL !== "https://your-project.supabase.co" &&
  SUPABASE_ANON_KEY !== "your-anon-key";

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "[Supabase] Local fallback activated. Please configure your actual SUPABASE_URL and SUPABASE_ANON_KEY in lib/supabase.ts to sync and share data."
  );
}
