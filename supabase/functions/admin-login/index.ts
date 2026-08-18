/**
 * admin-login — turns the passcode into a real Supabase session.
 *
 * The passcode itself never leaves this function. The browser posts a code,
 * this compares it against a secret, and on a match signs in the one fixed
 * admin account and hands back that session. Every table is then guarded by
 * RLS against `authenticated`, so a forged request without a session gets
 * nothing — the passcode is not the security boundary, the session is.
 *
 * Secrets (supabase secrets set ...):
 *   ADMIN_PASSCODE  the code the two of you type
 *   ADMIN_EMAIL     the fixed admin account's email
 *   ADMIN_PASSWORD  that account's real password — long and random
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are injected by the platform.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** Compares without leaking the answer through how long it took. */
function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Compare a fixed number of bytes so length alone reveals nothing.
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const passcode = Deno.env.get("ADMIN_PASSCODE");
  const email = Deno.env.get("ADMIN_EMAIL");
  const password = Deno.env.get("ADMIN_PASSWORD");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!passcode || !email || !password || !url || !anonKey) {
    console.error("admin-login is missing one or more secrets");
    return json({ error: "The office isn't configured yet. Check the function secrets." }, 500);
  }

  let submitted = "";
  try {
    const body = await req.json();
    submitted = typeof body?.passcode === "string" ? body.passcode : "";
  } catch {
    return json({ error: "Send a JSON body with a passcode." }, 400);
  }

  // A deliberate pause on every attempt, right or wrong, so this endpoint is a
  // poor thing to sit and guess against. Supabase Auth rate-limits the sign-in
  // underneath as well.
  await new Promise((r) => setTimeout(r, 400));

  if (!constantTimeEqual(submitted.trim(), passcode)) {
    return json({ error: "That code doesn't match. Try again." }, 401);
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    console.error("passcode matched but the admin sign-in failed:", error?.message);
    return json({ error: "The code was right but sign-in failed. Check the admin account exists." }, 500);
  }

  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  });
});
