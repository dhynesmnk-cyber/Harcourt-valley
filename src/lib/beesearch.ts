import type { ProspectKind } from "./data";
import { anonKeyValue, functionsBase, isRemote, supabase } from "./supabase";

/**
 * Client for the two BeeSearch edge functions — real business discovery
 * (beesearch-discover) and per-business contact lookup (beesearch-enrich).
 * Both require a signed-in admin session; both cost real money per call, so
 * neither is ever triggered automatically. See BEESEARCH.md.
 */

export interface DiscoveredCandidate {
  id: string;
  kind: ProspectKind;
  business: string;
  address: string;
  town: string;
  phone: string;
  website: string;
  email: string | null;
  distance_km: number | null;
  reasons: string[];
  status: "new" | "dismissed" | "contacted";
  discovered_at: string;
  enriched_at: string | null;
}

/** True once a live backend is configured — live search is unavailable in demo mode, same as the rest of the admin. */
export const liveDiscoveryAvailable = isRemote;

async function callFunction<T>(name: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  if (!isRemote || !supabase) return { ok: false, message: "Live search needs a connected backend — see BACKEND.md." };
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, message: "Sign in again and try once more." };

  let res: Response;
  try {
    res = await fetch(`${functionsBase}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: anonKeyValue },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: "Couldn't reach the search. Check your connection and try again." };
  }

  let payload: any = {};
  try {
    payload = await res.json();
  } catch {
    /* fall through to the status check */
  }
  if (!res.ok) return { ok: false, message: payload?.error ?? "That didn't work." };
  return { ok: true, data: payload as T };
}

export async function discoverProspects(kind: ProspectKind): Promise<{ ok: true; candidates: DiscoveredCandidate[] } | { ok: false; message: string }> {
  const r = await callFunction<{ candidates: DiscoveredCandidate[] }>("beesearch-discover", { kind });
  if (!r.ok) return r;
  return { ok: true, candidates: r.data.candidates };
}

export async function enrichCandidate(
  candidateId: string,
  website: string,
): Promise<{ ok: true; email: string | null; snippet: string | null; blocked: boolean } | { ok: false; message: string }> {
  const r = await callFunction<{ email: string | null; snippet: string | null; blocked: boolean }>("beesearch-enrich", { candidateId, website });
  if (!r.ok) return r;
  return { ok: true, ...r.data };
}

/** For an email found by hand after a site turned out to block automatic checks, or after visiting it yourself. */
export async function saveManualEmail(candidateId: string, email: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("beesearch_candidates").update({ email, enriched_at: new Date().toISOString() }).eq("id", candidateId);
}

export async function dismissCandidate(candidateId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("beesearch_candidates").update({ status: "dismissed" }).eq("id", candidateId);
}
