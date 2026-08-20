/**
 * beesearch-enrich — looks at ONE candidate's own website, on request, for a
 * public contact email. This is the only part of BeeSearch that visits a
 * third party's site, so it's deliberately narrow:
 *
 *   - one business at a time, triggered by an admin clicking "Find contact
 *     details" — never run automatically over a whole search's results
 *   - checks robots.txt first and honours a Disallow for this path
 *   - reads only the homepage, capped at 500 KB, with an 8s timeout
 *   - never guesses or fabricates an email — returns null if it finds none
 *
 * Whether reaching out to what it finds needs consent under Australia's
 * Spam Act depends on your situation — that's a call for you (or your own
 * advice), not something this function decides. See BEESEARCH.md.
 *
 * Requires a real signed-in session, same as beesearch-discover.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const USER_AGENT = "HarcourtValleyBeeSearch/1.0 (+contact: hello@harcourtvalley.example)";
const MAX_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 8000;

async function fetchCapped(url: string): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
    if (!res.ok || !res.body) return "";
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    await reader.cancel().catch(() => {});
    return new TextDecoder().decode(new Uint8Array(chunks.flatMap((c) => Array.from(c))));
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

/** Minimal robots.txt check: honours Disallow rules under a matching User-agent (our own, or *). */
function isAllowed(robotsTxt: string, path: string): boolean {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim());
  let relevant = false;
  const disallows: string[] = [];
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") relevant = value === "*" || value.toLowerCase().includes("beesearch");
    else if (relevant && key === "disallow" && value) disallows.push(value);
  }
  return !disallows.some((d) => path.startsWith(d));
}

function extractEmail(html: string): string | null {
  const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");

  const mailto = stripped.match(/mailto:([^"'>\s?]+)/i);
  if (mailto) return decodeURIComponent(mailto[1]);

  const generic = stripped.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (generic && !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(generic[0])) return generic[0];

  return null;
}

const SNIPPET_KEYWORDS = ["wine list", "cellar door", "wedding", "corporate event", "function", "retreat", "regional"];

function extractSnippet(html: string): string | null {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = text.toLowerCase();
  for (const kw of SNIPPET_KEYWORDS) {
    const i = lower.indexOf(kw);
    if (i === -1) continue;
    const start = Math.max(0, i - 60);
    return text.slice(start, start + 160).trim();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return json({ error: "The office isn't configured yet." }, 500);

  let candidateId: string | null = null;
  let website: string | null = null;
  try {
    const body = await req.json();
    candidateId = typeof body?.candidateId === "string" ? body.candidateId : null;
    website = typeof body?.website === "string" ? body.website : null;
  } catch {
    /* handled below */
  }
  if (!candidateId || !website) return json({ error: "Send { candidateId, website }." }, 400);

  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sign in first." }, 401);

  let origin: URL;
  try {
    origin = new URL(website);
  } catch {
    return json({ error: "That website address doesn't look valid." }, 400);
  }

  const robotsTxt = await fetchCapped(`${origin.origin}/robots.txt`);
  if (robotsTxt && !isAllowed(robotsTxt, origin.pathname || "/")) {
    return json({ email: null, snippet: null, blocked: true });
  }

  const html = await fetchCapped(origin.toString());
  const email = extractEmail(html);
  const snippet = extractSnippet(html);

  const { error: updateError } = await supabase
    .from("beesearch_candidates")
    .update({ email: email ?? "", enriched_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (updateError) console.error("Failed to save enrichment:", updateError.message);

  return json({ email, snippet, blocked: false });
});
