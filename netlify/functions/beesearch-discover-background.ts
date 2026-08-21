/* ------------------------------------------------------------------ */
/*  Runs the actual discovery pipeline — 6 search queries, up to 30      */
/*  site fetches, batched AI evaluation. Minutes, not seconds, hence a   */
/*  Netlify Background Function (the "-background" filename suffix is   */
/*  what Netlify keys off): the caller (beesearch.ts) gets a 202 the      */
/*  moment this starts, not when it finishes. Results land as rows in    */
/*  beesearch_discovery_suggestions; the client polls list-discovery.    */
/* ------------------------------------------------------------------ */

import { requireAdmin } from "./_beesearch/auth";
import { discoverSimilarAccounts } from "./_beesearch/ai";
import type { AccountType } from "./_beesearch/db";

export default async (req: Request): Promise<Response> => {
  const admin = await requireAdmin(req);
  if (!admin.ok) return new Response(null, { status: admin.status });

  try {
    const body = await req.json();
    const customPrompt = typeof body?.customPrompt === "string" ? body.customPrompt : "";
    const accountType: AccountType = body?.accountType === "referral_partner" ? "referral_partner" : "stockist";
    await discoverSimilarAccounts(customPrompt, accountType);
  } catch {
    // Nothing to report to — the caller already got its 202. A failure here
    // just means list-discovery comes back with fewer (or zero) new rows;
    // the UI already handles "nothing turned up" as a normal outcome.
  }

  return new Response(null, { status: 200 });
};
