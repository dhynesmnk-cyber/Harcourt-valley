# BeeSearch — live business discovery

BeeSearch (the outreach tool in the admin, under **Behind the scenes**) runs
in one of two modes, same shape as the rest of the backend:

| | No `GOOGLE_PLACES_API_KEY` | Key set |
|---|---|---|
| Match source | 10 example businesses kept in `src/lib/data.ts` | A real Google Places search |
| Costs money | No | Yes, a small amount per search |
| Needs a backend | No | Yes — [BACKEND.md](./BACKEND.md) first |

Without the key, BeeSearch still works end to end — draft, approve, send,
reply, convert — against the sample directory, so the admin is usable before
you've set anything up here. This document is only for turning on the real
search.

## What it actually does

Two separate, narrow pieces — see `supabase/functions/beesearch-discover` and
`supabase/functions/beesearch-enrich`:

1. **Discovery.** On "Run the analysis" or "Find matches", the app calls
   `beesearch-discover`, which asks the Google Places API for businesses
   (bottle shops/wine bars, or wedding & event planners) within roughly 90
   minutes of the vineyard. Results are cached in the `beesearch_candidates`
   table so a repeat search doesn't re-spend money on the same businesses,
   and so "already dismissed" or "already contacted" survives a reload.
2. **Contact lookup.** Only when you click "Find contact details" on one
   specific business, `beesearch-enrich` fetches that business's own
   homepage — nothing else, no bulk crawl — checks their `robots.txt` first,
   and looks for a public email address. It never invents one; if it finds
   nothing, or the site disallows automated checks, you're prompted to enter
   an email you found yourself.

Both functions require a signed-in admin session (unlike `admin-login`,
they're deployed with JWT verification **on**), and every database write they
make happens under that admin's own session — the functions never use a
service-role key.

## Setting it up

### 1. Google Cloud project + Places API

1. Create or pick a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **billing** on it — required even to stay within any free tier.
3. Enable the **Places API** (the legacy one; this uses the Text Search and
   Place Details endpoints, not the newer Places API (New)).
4. Create an API key under **APIs & Services → Credentials**, then restrict
   it to the Places API only. There's no browser to restrict-by-referrer
   against here — this key lives only in a server-side secret, never in the
   app bundle — so an API restriction is the main protection.
5. Set a budget alert on the project. Check
   [Google's current Places API pricing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
   yourself before relying on any number here — it changes, and Text Search
   plus a handful of Place Details calls per search is the shape of what
   each "Run the analysis" costs.

### 2. Give the key to the function

```bash
supabase secrets set GOOGLE_PLACES_API_KEY=your-key-here
```

### 3. Run the new migration

In the Supabase SQL Editor, run `supabase/migrations/0003_beesearch_discovery.sql`
(after `0001` and `0002`, if you haven't already).

### 4. Deploy the functions

```bash
supabase functions deploy beesearch-discover
supabase functions deploy beesearch-enrich
```

Deliberately **no** `--no-verify-jwt` here — unlike `admin-login`, these cost
money per call and must only run for a signed-in admin.

## Before you turn on contact lookup

`beesearch-enrich` visits a real business's real website. Two things worth
knowing, not glossing over:

- **It only ever looks, on request, at one business you've already chosen** —
  never a bulk sweep of everything a search returns. That's a deliberate
  design choice to keep this closer to "a person looked something up" than
  "a scraper ran."
- **Sending unsolicited commercial email in Australia is governed by the
  [Spam Act 2003](https://www.legislation.gov.au/Details/C2016C00614).**
  Low-volume, individually-reviewed B2B outreach like this is generally at
  the lower-risk end of that spectrum, and there are relevant exemptions
  (e.g. an address conspicuously published for exactly this kind of
  contact) — but that's a legal question about your situation, not something
  this tool determines for you. If you're unsure, ask your own advice before
  relying on any exemption.

## What this doesn't do

- It doesn't discover email addresses beyond what a business's own homepage
  publishes — no third-party contact databases, no guessing common patterns
  like `info@`.
- It doesn't re-run automatically. Every search and every contact lookup is
  a button a human pressed.
- It doesn't replace your own judgement about whether a match is actually
  worth approaching — "Not a fit" on any candidate is there for exactly that.
