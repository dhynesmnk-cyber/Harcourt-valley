/* ------------------------------------------------------------------ */
/*  BeeSearch client — talks to the in-house discovery engine (folded    */
/*  in from the standalone Replit app; the underlying model/prompts      */
/*  still refer to "bee23" in a few places, its original name) through   */
/*  the Netlify Functions at /.netlify/functions/beesearch*. Every call   */
/*  carries the caller's own Supabase session token, since these          */
/*  functions sit directly on the database now — no credential of any     */
/*  kind lives in this file, so it's safe to ship to the browser as-is.   */
/*                                                                        */
/*  When ANTHROPIC_API_KEY / SUPABASE_SERVICE_ROLE_KEY aren't set on the  */
/*  deploy, the function replies with an error and every call here        */
/*  resolves to ok: false — callers fall back to local demo behaviour     */
/*  rather than break.                                                   */
/* ------------------------------------------------------------------ */

import { supabase } from "./supabase";
import type { BeeSearchKind } from "./data";

const ENDPOINT = "/.netlify/functions/beesearch";

export interface BeeSearchStockist {
  id: number;
  businessName: string;
  websiteUrl: string | null;
  location: string | null;
  category: string | null;
}

export interface BeeSearchDiscoverySuggestion {
  id: number;
  accountName: string;
  websiteUrl: string;
  reason: string;
  relevanceScore: number;
  status: string;
}

export interface BeeSearchAccount {
  id: number;
  accountName: string;
  websiteUrl: string;
  enrichmentStatus: "pending" | "processing" | "completed" | "failed" | "blocked" | null;
  compositeScore: number | null;
  recommendedStrategy: string | null;
  errorMessage: string | null;
}

type BeeSearchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; configured: boolean };

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<BeeSearchResult<T>> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  if (!token) return { ok: false, error: "Sign in first.", status: 401, configured: true };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...params }),
    });
  } catch {
    return { ok: false, error: "Could not reach BeeSearch.", status: 0, configured: true };
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error response, or a 204/202 with no body — fall through */
  }

  if (!res.ok) {
    return {
      ok: false,
      error: body?.error || `BeeSearch request failed (${res.status})`,
      status: res.status,
      configured: body?.configured !== false,
    };
  }

  return { ok: true, data: body as T };
}

/** Cheap probe: is the function configured (Anthropic key, service role key) and reachable? */
export async function checkEngineAvailable(): Promise<boolean> {
  const result = await call<{ ok: boolean }>("status");
  return result.ok;
}

export async function listStockists(kind: BeeSearchKind): Promise<BeeSearchStockist[]> {
  const result = await call<BeeSearchStockist[]>("list-stockists", { kind });
  return result.ok ? result.data : [];
}

export async function addStockist(input: {
  businessName: string;
  websiteUrl?: string;
  location?: string;
  category?: string;
  kind: BeeSearchKind;
}): Promise<BeeSearchStockist | null> {
  const result = await call<BeeSearchStockist>("add-stockist", input);
  return result.ok ? result.data : null;
}

export async function removeStockist(id: number): Promise<boolean> {
  const result = await call<null>("remove-stockist", { id });
  return result.ok;
}

export async function listDiscoverySuggestions(accountType: BeeSearchKind): Promise<BeeSearchDiscoverySuggestion[]> {
  const result = await call<BeeSearchDiscoverySuggestion[]>("list-discovery", { accountType });
  return result.ok ? result.data : [];
}

/**
 * Starts discovery and waits for results to land, polling list-discovery.
 * The pipeline (multiple AI calls + up to 30 site fetches) runs for minutes,
 * well past what the function itself can hold a connection open for, so the
 * server kicks off a background job and replies immediately — this just
 * hides that handoff behind one awaitable call, same shape as before.
 */
export async function runDiscoveryAndWait(
  customPrompt: string,
  accountType: BeeSearchKind,
  { intervalMs = 4000, timeoutMs = 120000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<{ ok: true; suggestions: BeeSearchDiscoverySuggestion[] } | { ok: false; error: string }> {
  const started = await call<{ status: string }>("run-discovery", { customPrompt, accountType });
  if (!started.ok) return { ok: false, error: started.error };

  const deadline = Date.now() + timeoutMs;
  // First poll waits a beat — the background job needs a moment to even start.
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
  while (Date.now() < deadline) {
    const suggestions = await listDiscoverySuggestions(accountType);
    if (suggestions.some((s) => s.status === "pending")) return { ok: true, suggestions };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { ok: false, error: "Didn't turn up any matches in time — try again shortly, or add more to the training list." };
}

export async function addSuggestionAsAccount(
  id: number,
): Promise<{ ok: true; account: BeeSearchAccount } | { ok: false; error: string }> {
  const result = await call<{ account: BeeSearchAccount }>("add-suggestion", { id });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, account: result.data.account };
}

export async function getAccount(id: number): Promise<BeeSearchAccount | null> {
  const result = await call<BeeSearchAccount>("get-account", { id });
  return result.ok ? result.data : null;
}

export async function generatePitch(
  id: number,
): Promise<{ ok: true; pitch: string } | { ok: false; error: string }> {
  const result = await call<{ pitch: string }>("generate-pitch", { id });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, pitch: result.data.pitch };
}

/** Splits a generated email into subject + body. The model is asked to return
 *  body text only, but the fallback template (used before 3 pitches exist for
 *  a strategy) leads with "Subject: ...", so handle both shapes. */
export function splitPitch(pitch: string, fallbackSubject: string): { subject: string; body: string } {
  const firstLine = pitch.split("\n", 1)[0] ?? "";
  const match = firstLine.match(/^subject:\s*(.+)$/i);
  if (match) {
    return { subject: match[1].trim(), body: pitch.slice(firstLine.length).replace(/^\n+/, "") };
  }
  return { subject: fallbackSubject, body: pitch };
}

const ENRICHMENT_TERMINAL_STATES = new Set(["completed", "failed", "blocked"]);

/** Waits for account enrichment to finish, polling at a fixed interval.
 *  The scheduled worker sweeps for pending accounts once a minute (see
 *  netlify/functions/beesearch-enrichment-worker.ts), so this needs real
 *  headroom rather than a tight timeout. */
export async function waitForEnrichment(
  id: number,
  { intervalMs = 5000, timeoutMs = 90000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<BeeSearchAccount | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const account = await getAccount(id);
    if (!account) return null;
    if (ENRICHMENT_TERMINAL_STATES.has(account.enrichmentStatus ?? "")) return account;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
