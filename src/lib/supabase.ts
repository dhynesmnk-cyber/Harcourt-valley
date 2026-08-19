import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The backend is optional. With no env vars the app runs exactly as it always
 * has — seeded demo data in localStorage — so the deploy preview and anyone
 * poking at a checkout keep working. Set both vars and the same UI is talking
 * to Postgres instead.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isRemote = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isRemote
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "hv-auth",
      },
    })
  : null;

export const functionsBase = url ? `${url.replace(/\/$/, "")}/functions/v1` : "";
export const anonKeyValue = anonKey ?? "";
