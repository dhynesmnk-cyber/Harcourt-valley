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
/*  deploy, every call resolves to ok: false and getEngineStatus() says    */
/*  why. There is no demo fallback: the screen either has a live engine    */
/*  behind it or says plainly that it doesn't.                            */
/* ------------------------------------------------------------------ */

import { supabase } from "./supabase";
import type { BeeSearchKind } from "./data";

const ENDPOINT = "/.netlify/functions/beesearch";

export interface BeeSearchStockist {
  id: number;
  targetId: string | null;
  businessName: string;
  websiteUrl: string | null;
  location: string | null;
  category: string | null;
}

export interface BeeSearchDiscoverySuggestion {
  id: number;
  targetId: string | null;
  accountName: string;
  websiteUrl: string;
  reason: string;
  relevanceScore: number;
  status: string;
  /** Addresses scraped from the prospect's own site. Nothing is ever sent to
   *  them from here — they're shown so a draft can be copied to a real inbox. */
  emails: string[] | null;
  createdAt: string;
}

export interface BeeSearchAccount {
  id: number;
  accountName: string;
  websiteUrl: string;
  enrichmentStatus: "pending" | "processing" | "completed" | "failed" | "blocked" | null;
  compositeScore: number | null;
  recommendedStrategy: string | null;
  emails: string[] | null;
  errorMessage: string | null;
}

export interface BeeSearchRun {
  id: number;
  targetId: string | null;
  status: "running" | "done" | "failed";
  error: string | null;
  found: number;
  startedAt: string;
  finishedAt: string | null;
}

/** What a target needs to tell the engine to aim a search. */
export interface DiscoveryBrief {
  targetId: string;
  accountType: BeeSearchKind;
  name: string;
  who: string;
  region: string;
  businessTypes: string[];
  notes: string;
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

/**
 * Why the engine isn't available matters — "sign in again" and "nobody set the
 * API keys" need different words on screen. Collapsing every failure to false
 * is what left the old UI with nothing useful to say.
 */
export type EngineStatus = "connected" | "signed-out" | "not-configured" | "unreachable";

export async function getEngineStatus(): Promise<EngineStatus> {
  // No Supabase client at all means this build has no backend configured —
  // that's a setup state, not an expired session, and saying "sign in again"
  // would send someone chasing a problem they don't have.
  if (!supabase) return "not-configured";

  const result = await call<{ ok: boolean }>("status");
  if (result.ok) return "connected";
  if (result.status === 401) return "signed-out";
  if (!result.configured || result.status === 500) return "not-configured";
  return "unreachable";
}

export async function listStockists(kind: BeeSearchKind, targetId?: string): Promise<BeeSearchStockist[]> {
  const result = await call<BeeSearchStockist[]>("list-stockists", { kind, targetId });
  return result.ok ? result.data : [];
}

export async function addStockist(input: {
  businessName: string;
  websiteUrl?: string;
  location?: string;
  category?: string;
  kind: BeeSearchKind;
  targetId?: string;
}): Promise<BeeSearchStockist | null> {
  const result = await call<BeeSearchStockist>("add-stockist", input);
  return result.ok ? result.data : null;
}

export async function removeStockist(id: number): Promise<boolean> {
  const result = await call<null>("remove-stockist", { id });
  return result.ok;
}

/** Clears a target's training list — used when the target itself is deleted. */
export async function removeTargetTraining(targetId: string): Promise<boolean> {
  const result = await call<null>("remove-target", { id: targetId });
  return result.ok;
}

export async function listDiscoverySuggestions(accountType: BeeSearchKind, targetId?: string): Promise<BeeSearchDiscoverySuggestion[]> {
  const result = await call<BeeSearchDiscoverySuggestion[]>("list-discovery", { accountType, targetId });
  return result.ok ? result.data : [];
}

/** Marks a suggestion as not-a-fit. The engine reads dismissals back on the
 *  next run as patterns to avoid, so this genuinely teaches it something. */
export async function dismissSuggestion(id: number, reason?: string): Promise<boolean> {
  const result = await call<null>("dismiss-suggestion", { id, reason });
  return result.ok;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Starts discovery and waits for it to finish.
 *
 * The pipeline (six AI calls plus up to thirty site fetches) runs for minutes,
 * far past what a function can hold a connection open for, so the server kicks
 * off a background job and replies immediately. This hides that handoff behind
 * one awaitable call.
 *
 * Two things it has to get right, both learned the hard way:
 *
 * - **Don't hand back the last run's results.** The server clears the previous
 *   pending rows from *inside* the background job, so for the first few seconds
 *   they're still in the table. Waiting on "any pending row exists" returns
 *   whatever the previous search found. Rows are therefore filtered to those
 *   created after this run started.
 * - **Report the real failure.** The background function can't answer its
 *   caller, so it writes the outcome to a run row instead. Polling that is what
 *   turns "didn't turn up any matches in time" into the actual reason — an
 *   under-trained target, a search that found nothing, an API error.
 */
export async function runDiscoveryAndWait(
  brief: DiscoveryBrief,
  {
    intervalMs = 4000,
    timeoutMs = 300000,
    onTick,
  }: { intervalMs?: number; timeoutMs?: number; onTick?: (s: { elapsedMs: number; found: number }) => void } = {},
): Promise<{ ok: true; suggestions: BeeSearchDiscoverySuggestion[] } | { ok: false; error: string }> {
  // A little slack for clock skew between this browser and the database.
  const startedAt = Date.now() - 5000;
  const started = await call<{ status: string; runId: number }>("run-discovery", { ...brief });
  if (!started.ok) return { ok: false, error: started.error };

  const isFresh = (s: BeeSearchDiscoverySuggestion) =>
    s.status === "pending" && new Date(s.createdAt).getTime() >= startedAt;

  const deadline = Date.now() + timeoutMs;
  await sleep(intervalMs);

  while (Date.now() < deadline) {
    const [run, suggestions] = await Promise.all([
      call<BeeSearchRun | null>("discovery-status", { targetId: brief.targetId }),
      listDiscoverySuggestions(brief.accountType, brief.targetId),
    ]);
    const fresh = suggestions.filter(isFresh);
    onTick?.({ elapsedMs: Date.now() - startedAt, found: fresh.length });

    const state = run.ok ? run.data : null;
    if (state && new Date(state.startedAt).getTime() >= startedAt) {
      if (state.status === "failed") {
        return { ok: false, error: state.error || "The search didn't finish. Try again shortly." };
      }
      if (state.status === "done") {
        return fresh.length > 0
          ? { ok: true, suggestions: fresh }
          : { ok: false, error: "The search ran but nothing new came back. Try widening the region, adding another business type, or adding more training accounts." };
      }
    }

    await sleep(intervalMs);
  }

  // Timed out with the job still running. Anything that did land is real, so
  // show it rather than throwing the work away.
  const landed = (await listDiscoverySuggestions(brief.accountType, brief.targetId)).filter(isFresh);
  if (landed.length > 0) return { ok: true, suggestions: landed };
  return { ok: false, error: "The search is taking longer than expected. Leave it a minute and press Find matches again — results keep saving in the background." };
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
