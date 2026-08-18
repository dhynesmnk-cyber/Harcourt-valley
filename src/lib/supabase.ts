import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

/*
 * Null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set (e.g. a
 * fresh clone before setup, or a preview deploy without env vars yet).
 * Every call site treats a null client as "backend unavailable" rather
 * than crashing the app.
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // Magic-link callbacks land as a "?code=..." query param instead of
        // a "#access_token=..." fragment, which would otherwise collide
        // with this app's hash-based routing.
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

if (!supabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "Supabase isn't configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
      "The admin will be unavailable until these are set — see .env.example.",
  );
}
