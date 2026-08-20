/**
 * beesearch-discover — finds real, nearby businesses via the Google Places
 * API, so BeeSearch's suggestions are actual local stockists and planners
 * instead of a hand-typed sample list.
 *
 * Unlike admin-login, this function requires a real signed-in session (no
 * --no-verify-jwt at deploy time) — it spends real money per call, so only an
 * authenticated admin may trigger it. The caller's own JWT is forwarded to
 * Postgres, so every write here happens as that admin under the normal RLS
 * policy, not as a privileged service role.
 *
 * Secrets (supabase secrets set ...):
 *   GOOGLE_PLACES_API_KEY   a Places API key, billing enabled, restricted to
 *                           the Places API in the Google Cloud Console
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are injected by the platform.
 *
 * See BEESEARCH.md for how to obtain the key and what this costs.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/**
 * Harcourt Valley Vineyards' own coordinates — kept in sync by hand with
 * BUSINESS.latitude/longitude in src/lib/site.ts, since this function is
 * deployed separately from the app bundle and can't import from it.
 */
const ORIGIN_LAT = -36.9986;
const ORIGIN_LNG = 144.2517;

/** ~90 minutes' drive, approximated as a straight-line radius — see BEESEARCH.md. */
const RADIUS_METRES = 90_000;

type ProspectKind = "stockist" | "planner";

const QUERY_BY_KIND: Record<ProspectKind, string> = {
  stockist: "independent bottle shops and wine bars",
  planner: "wedding and event planners",
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  business_status?: string;
}

interface PlaceDetails {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
}

async function textSearch(query: string, apiKey: string): Promise<PlaceResult[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", `${query} near Harcourt, Victoria, Australia`);
  url.searchParams.set("location", `${ORIGIN_LAT},${ORIGIN_LNG}`);
  url.searchParams.set("radius", String(RADIUS_METRES));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  const body = await res.json();
  if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
    throw new Error(`Places text search failed: ${body.status} ${body.error_message ?? ""}`.trim());
  }
  return (body.results ?? []) as PlaceResult[];
}

/** Contact data (phone, website) is a separate, extra-cost lookup — kept to the top few results only. */
async function placeDetails(placeId: string, apiKey: string): Promise<PlaceDetails> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "formatted_phone_number,international_phone_number,website");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  const body = await res.json();
  if (body.status !== "OK") return {};
  return (body.result ?? {}) as PlaceDetails;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    console.error("beesearch-discover is missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return json({ error: "The office isn't configured yet." }, 500);
  }
  if (!apiKey) {
    return json({ error: "Live search isn't set up yet — no GOOGLE_PLACES_API_KEY secret. See BEESEARCH.md." }, 501);
  }

  let kind: ProspectKind | null = null;
  try {
    const body = await req.json();
    kind = body?.kind === "stockist" || body?.kind === "planner" ? body.kind : null;
  } catch {
    /* handled by the null check below */
  }
  if (!kind) return json({ error: 'Send { "kind": "stockist" | "planner" }.' }, 400);

  // Forward the caller's own session, so every write below happens as that
  // signed-in admin, under the same RLS policy as everything else — not as a
  // privileged service role.
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Sign in first." }, 401);

  let places: PlaceResult[];
  try {
    places = await textSearch(QUERY_BY_KIND[kind], apiKey);
  } catch (e) {
    console.error("Places text search error:", e);
    return json({ error: "The search failed. Try again in a moment." }, 502);
  }

  const open = places.filter((p) => p.business_status !== "CLOSED_PERMANENTLY" && p.geometry?.location);

  const withDistance = open
    .map((p) => ({
      place: p,
      distanceKm: haversineKm(ORIGIN_LAT, ORIGIN_LNG, p.geometry!.location!.lat, p.geometry!.location!.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8); // Contact-data lookups cost extra — keep to a sane page size.

  const candidates = await Promise.all(
    withDistance.map(async ({ place, distanceKm }) => {
      const details = await placeDetails(place.place_id, apiKey).catch(() => ({}) as PlaceDetails);
      const reasons = [
        `${Math.round(distanceKm)} km from the valley — inside the ~90 minute search radius (straight-line, not drive time)`,
      ];
      return {
        id: place.place_id,
        kind,
        business: place.name,
        address: place.formatted_address ?? "",
        town: (place.formatted_address ?? "").split(",").slice(-3, -2).join("").trim(),
        phone: details.formatted_phone_number ?? details.international_phone_number ?? "",
        website: details.website ?? "",
        distance_km: Math.round(distanceKm * 10) / 10,
        reasons,
        // Deliberately no `status` or `email` here: on a fresh row the table
        // default ('new' / null) applies, and on a repeat search for a
        // business already seen, upsert only overwrites the columns present
        // in this object — so a candidate already dismissed or contacted
        // doesn't silently reset to "new", and a found email isn't wiped.
      };
    }),
  );

  const { error: upsertError } = await supabase.from("beesearch_candidates").upsert(candidates, { onConflict: "id" });
  if (upsertError) console.error("Failed to cache candidates:", upsertError.message);

  // Read back with status/email included, so the UI sees the real current
  // state (e.g. "already contacted") rather than the bare search payload.
  const { data: withState } = await supabase
    .from("beesearch_candidates")
    .select("*")
    .in("id", candidates.map((c) => c.id));

  return json({ candidates: withState ?? candidates });
});
