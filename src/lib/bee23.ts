/* ------------------------------------------------------------------ */
/*  bee23 client — talks to the standalone bee23 engine through the    */
/*  Netlify Function proxy at /.netlify/functions/bee23. The engine's  */
/*  API token lives only in that function's environment; nothing here  */
/*  ever holds a credential, so this file is safe to ship to the       */
/*  browser as-is.                                                     */
/*                                                                      */
/*  When BEE23_ENGINE_URL / BEE23_API_TOKEN aren't set on the deploy,   */
/*  the proxy replies 503 and every call here resolves to ok: false —   */
/*  callers fall back to local demo behaviour rather than break.        */
/* ------------------------------------------------------------------ */

const ENDPOINT = "/.netlify/functions/bee23";

export interface Bee23Stockist {
  id: number;
  businessName: string;
  websiteUrl: string | null;
  location: string | null;
  category: string | null;
}

export interface Bee23DiscoverySuggestion {
  id: number;
  accountName: string;
  websiteUrl: string;
  reason: string;
  relevanceScore: number;
  status: string;
}

export interface Bee23Account {
  id: number;
  accountName: string;
  websiteUrl: string;
  enrichmentStatus: "pending" | "processing" | "completed" | "failed" | "blocked" | null;
  compositeScore: number | null;
  recommendedStrategy: string | null;
  errorMessage: string | null;
}

type Bee23Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; configured: boolean };

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<Bee23Result<T>> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
  } catch {
    return { ok: false, error: "Could not reach bee23.", status: 0, configured: true };
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error response — fall through with body null */
  }

  if (!res.ok) {
    return {
      ok: false,
      error: body?.error || `bee23 request failed (${res.status})`,
      status: res.status,
      configured: body?.configured !== false,
    };
  }

  return { ok: true, data: body as T };
}

/** Cheap probe: is the proxy configured and does the token work? */
export async function checkBee23Available(): Promise<boolean> {
  const result = await call<{ count: number }>("status");
  return result.ok;
}

export async function listStockists(): Promise<Bee23Stockist[]> {
  const result = await call<Bee23Stockist[]>("list-stockists");
  return result.ok ? result.data : [];
}

export async function addStockist(input: {
  businessName: string;
  websiteUrl?: string;
  location?: string;
  category?: string;
}): Promise<Bee23Stockist | null> {
  const result = await call<Bee23Stockist>("add-stockist", input);
  return result.ok ? result.data : null;
}

export async function runDiscovery(
  customPrompt: string,
): Promise<{ ok: true; count: number; basedOn: number } | { ok: false; error: string }> {
  const result = await call<{ status: string; count: number; basedOn: number }>("run-discovery", { customPrompt });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, count: result.data.count, basedOn: result.data.basedOn };
}

export async function listDiscoverySuggestions(): Promise<Bee23DiscoverySuggestion[]> {
  const result = await call<Bee23DiscoverySuggestion[]>("list-discovery");
  return result.ok ? result.data : [];
}

export async function addSuggestionAsAccount(
  id: number,
): Promise<{ ok: true; account: Bee23Account } | { ok: false; error: string }> {
  const result = await call<{ account: Bee23Account }>("add-suggestion", { id });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, account: result.data.account };
}

export async function getAccount(id: number): Promise<Bee23Account | null> {
  const result = await call<Bee23Account>("get-account", { id });
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
 *  The engine's background worker only sweeps for pending accounts every 15s
 *  (see server/enrichment.ts startEnrichmentWorker), so this needs real
 *  headroom rather than a tight timeout. */
export async function waitForEnrichment(
  id: number,
  { intervalMs = 3000, timeoutMs = 60000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<Bee23Account | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const account = await getAccount(id);
    if (!account) return null;
    if (ENRICHMENT_TERMINAL_STATES.has(account.enrichmentStatus ?? "")) return account;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
