/* ------------------------------------------------------------------ */
/*  Runs the actual discovery pipeline — 6 search queries, up to 30      */
/*  site fetches, batched AI evaluation. Minutes, not seconds, hence a   */
/*  Netlify Background Function (the "-background" filename suffix is   */
/*  what Netlify keys off): the caller (beesearch.ts) gets a 202 the      */
/*  moment this starts, not when it finishes.                            */
/*                                                                       */
/*  Results land as rows in beesearch_discovery_suggestions. The outcome  */
/*  — including the reason for a failure — lands on the run row the       */
/*  caller already created, which is the only channel back to the user:   */
/*  throwing here would otherwise be silent, and the UI could do nothing  */
/*  but time out and guess.                                              */
/* ------------------------------------------------------------------ */

import { requireAdmin } from "./_beesearch/auth";
import { discoverSimilarAccounts, type DiscoveryTarget } from "./_beesearch/ai";
import * as db from "./_beesearch/db";

export default async (req: Request): Promise<Response> => {
  const admin = await requireAdmin(req);
  if (!admin.ok) return new Response(null, { status: admin.status });

  let runId: number | null = null;
  try {
    const body = await req.json();
    runId = Number.isFinite(Number(body?.runId)) ? Number(body.runId) : null;

    const target: DiscoveryTarget = {
      targetId: typeof body?.targetId === "string" && body.targetId ? body.targetId : null,
      accountType: body?.accountType === "referral_partner" ? "referral_partner" : "stockist",
      name: typeof body?.name === "string" ? body.name : "this target",
      who: typeof body?.who === "string" ? body.who : "",
      region: typeof body?.region === "string" ? body.region : "",
      businessTypes: Array.isArray(body?.businessTypes) ? body.businessTypes.filter((t: unknown) => typeof t === "string") : [],
      notes: typeof body?.notes === "string" ? body.notes : "",
    };

    const { count } = await discoverSimilarAccounts(target);
    if (runId !== null) await db.finishDiscoveryRun(runId, { status: "done", found: count });
  } catch (error: any) {
    if (runId !== null) {
      // Best effort: if even this write fails there's nothing left to tell.
      await db.finishDiscoveryRun(runId, {
        status: "failed",
        error: error?.message || "The search didn't finish. Try again shortly.",
      }).catch(() => {});
    }
  }

  return new Response(null, { status: 200 });
};
