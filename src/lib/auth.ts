import { anonKeyValue, functionsBase, isRemote, supabase } from "./supabase";

/**
 * Admin sign-in.
 *
 * The passcode is posted to an Edge Function and checked there against a
 * secret — it is never compiled into this bundle, and it is not what protects
 * the data. What protects the data is the Supabase session the function hands
 * back: every table's RLS policy demands `authenticated`, so a request without
 * that session reads and writes nothing, whatever passcode its sender knows.
 */

export type SignInResult = { ok: true } | { ok: false; message: string };

export async function signInWithPasscode(passcode: string): Promise<SignInResult> {
  if (!isRemote || !supabase) {
    return { ok: false, message: "No backend is configured, so there's nothing to sign in to." };
  }

  let res: Response;
  try {
    res = await fetch(`${functionsBase}/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKeyValue}`, apikey: anonKeyValue },
      body: JSON.stringify({ passcode }),
    });
  } catch {
    return { ok: false, message: "Couldn't reach the office. Check your connection and try again." };
  }

  let body: { access_token?: string; refresh_token?: string; error?: string } = {};
  try {
    body = await res.json();
  } catch {
    /* fall through to the status check */
  }

  if (!res.ok || !body.access_token || !body.refresh_token) {
    return { ok: false, message: body.error ?? "That didn't work. Try the code again." };
  }

  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
  if (error) return { ok: false, message: "Signed in, but the session wouldn't stick. Try once more." };

  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** True when a real, unexpired admin session is already in hand. */
export async function hasAdminSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}
