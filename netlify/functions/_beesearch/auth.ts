/* ------------------------------------------------------------------ */
/*  Confirms the caller holds a real Harcourt Valley admin session      */
/*  before anything in this module runs. Uses the anon key + the        */
/*  caller's own forwarded access token — the same session the browser  */
/*  already got from admin-login — never the service_role key, since    */
/*  the point here is verifying *who the caller is*, not what they can   */
/*  do (db.ts's service_role client handles that once this passes).      */
/* ------------------------------------------------------------------ */

import { createClient } from "@supabase/supabase-js";

export async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, status: 500, error: "BeeSearch isn't configured." };

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Sign in first." };

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Sign in again and try once more." };

  return { ok: true };
}
