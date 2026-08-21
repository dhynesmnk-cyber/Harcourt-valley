/* ------------------------------------------------------------------ */
/*  BeeSearch — in-house discovery/outreach engine, single-tenant.      */
/*                                                                      */
/*  Handles every fast, synchronous action. "run-discovery" is the      */
/*  exception: that pipeline (multiple AI calls + up to 30 site fetches) */
/*  runs for well past what a normal serverless function is allowed —   */
/*  so this just kicks off beesearch-discover-background and returns    */
/*  immediately; the client polls list-discovery for results the same    */
/*  way it already polls for account enrichment.                        */
/*                                                                      */
/*  Every action requires a real signed-in admin session (see auth.ts)  */
/*  — this function sits directly on the database with a service_role   */
/*  key, unlike the old proxy-to-a-separate-app version, so that check   */
/*  actually matters now.                                               */
/* ------------------------------------------------------------------ */

import { requireAdmin } from "./_beesearch/auth";
import * as db from "./_beesearch/db";
import { generatePitch } from "./_beesearch/ai";
import { normalizeUrl } from "./_beesearch/web";

const CORS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function stockistKind(value: unknown): db.AccountType {
  return value === "referral_partner" ? "referral_partner" : "stockist";
}

/** Target ids are client-authored strings (see src/lib/data.ts uid()). */
function targetId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

interface ProxyRequest {
  action: string;
  [key: string]: unknown;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = await requireAdmin(req);
  if (!admin.ok) return json({ error: admin.error }, admin.status);

  let body: ProxyRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    switch (body.action) {
      case "status": {
        // Cheap, cache-friendly probe — configured and reachable, nothing more.
        void (await db.getStockistCount("stockist"));
        return json({ ok: true });
      }

      case "list-stockists": {
        const list = await db.getStockists(stockistKind(body.kind), targetId(body.targetId));
        return json(list);
      }

      case "add-stockist": {
        const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
        if (!businessName) return json({ error: "businessName is required" }, 400);
        const created = await db.createStockist({
          businessName,
          websiteUrl: typeof body.websiteUrl === "string" ? body.websiteUrl.trim() || null : null,
          location: typeof body.location === "string" ? body.location.trim() || null : null,
          category: typeof body.category === "string" ? body.category.trim() || null : null,
          kind: stockistKind(body.kind),
          targetId: targetId(body.targetId),
        });
        return json(created, 201);
      }

      case "remove-stockist": {
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json({ error: "id must be a number" }, 400);
        await db.deleteStockist(id);
        return new Response(null, { status: 204, headers: CORS });
      }

      case "run-discovery": {
        // Fire the background function and return immediately — see file header.
        // The whole target brief goes with it: name, region, business types and
        // notes are what the search is actually aimed with.
        const brief = {
          targetId: targetId(body.targetId),
          accountType: stockistKind(body.accountType),
          name: str(body.name) || "this target",
          who: str(body.who),
          region: str(body.region),
          businessTypes: Array.isArray(body.businessTypes) ? body.businessTypes.filter((t: unknown) => typeof t === "string") : [],
          notes: str(body.notes),
        };

        // Recorded before the job starts so the client has something to poll
        // even if the background function dies before it can report anything.
        const runId = await db.startDiscoveryRun(brief.targetId, brief.accountType);

        const endpoint = new URL(req.url);
        endpoint.pathname = endpoint.pathname.replace(/\/beesearch$/, "/beesearch-discover-background");
        await fetch(endpoint.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
          body: JSON.stringify({ ...brief, runId }),
        }).catch(async () => {
          await db.finishDiscoveryRun(runId, { status: "failed", error: "The search job couldn't be started." }).catch(() => {});
        });
        return json({ status: "started", runId }, 202);
      }

      case "discovery-status": {
        const run = await db.getLatestDiscoveryRun(targetId(body.targetId));
        return json(run ?? null);
      }

      case "list-discovery": {
        const list = await db.getDiscoverySuggestions(stockistKind(body.accountType), targetId(body.targetId));
        return json(list);
      }

      case "dismiss-suggestion": {
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json({ error: "id must be a number" }, 400);
        // Dismissals aren't just a hide: discovery reads them back as
        // "avoid these patterns" on the next run (see ai.ts buildExclusionSet).
        await db.updateSuggestion(id, { status: "dismissed", dismiss_reason: str(body.reason) || null });
        return new Response(null, { status: 204, headers: CORS });
      }

      case "remove-target": {
        // A target's training list only means anything in the context of that
        // target, so it goes too. Accounts and drafts already in the pipeline
        // are real records and are deliberately left alone.
        const id = targetId(body.id);
        if (!id) return json({ error: "id is required" }, 400);
        await db.deleteStockistsForTarget(id);
        return new Response(null, { status: 204, headers: CORS });
      }

      case "add-suggestion": {
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json({ error: "id must be a number" }, 400);
        const suggestion = await db.getSuggestion(id);
        if (!suggestion) return json({ error: "Suggestion not found" }, 404);
        if (!suggestion.websiteUrl) return json({ error: "This prospect has no website. Add a website URL before adding it to your pipeline." }, 400);

        const normalizedUrl = normalizeUrl(suggestion.websiteUrl);
        const existing = await db.getAccountByUrl(normalizedUrl);
        if (existing) {
          await db.updateSuggestion(id, { status: "added" });
          return json({ account: existing, alreadyExists: true }, 201);
        }

        const account = await db.createAccount({
          accountName: suggestion.accountName, websiteUrl: normalizedUrl,
          accountType: suggestion.accountType, discoverySource: "ai_discovery",
          targetId: suggestion.targetId,
        });
        await db.updateSuggestion(id, { status: "added" });
        return json({ account }, 201);
      }

      case "get-account": {
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json({ error: "id must be a number" }, 400);
        const account = await db.getAccount(id);
        if (!account) return json({ error: "Account not found" }, 404);
        return json(account);
      }

      case "generate-pitch": {
        const id = Number(body.id);
        if (!Number.isFinite(id)) return json({ error: "id must be a number" }, 400);
        const pitch = await generatePitch(id);
        const account = await db.getAccount(id);
        if (account) await db.createPitchLibraryEntry(id, pitch, account.recommendedStrategy || "general");
        return json({ pitch });
      }

      default:
        return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (error: any) {
    return json({ error: error.message || "Something went wrong." }, 500);
  }
};
