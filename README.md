# Harcourt Valley Vineyards — Website

Single-page marketing site + admin command center for Harcourt Valley Vineyards.
Built with **Vite + React + TypeScript + Tailwind CSS v4**. Routing uses real
paths (`/winery`, `/weddings`, `/events`, `/journal`, `/admin`) so every page is
independently indexable; the host needs a single SPA rewrite (already configured
in `netlify.toml`).

Data persists to **Supabase** when `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` are set, and falls back to browser localStorage when
they aren't — see `BACKEND.md`. Product photos are the one exception: they
always live in the browser's IndexedDB regardless of backend, since they're
binary data — see **Product photos** below.

## Local development

```bash
npm install
npm run dev        # → http://localhost:5173
```

## Build

```bash
npm run build      # output in dist/
npm run typecheck  # strict TS check
```

## Commit

```bash
git init                       # skip if the repo already exists
git add .
git commit -m "Harcourt Valley — site + admin command center"
git branch -M main
git remote add origin git@github.com:<you>/harcourt-valley.git
git push -u origin main
```

## Deploy

The publish directory is **`dist`**, build command **`npm run build`**.

| Host | How |
|---|---|
| **Netlify Drop** (30 seconds) | Drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop) — instant live URL. |
| **Netlify via Git** | New site → connect repo → build `npm run build`, publish `dist`. No redirect rules needed (hash routing). |
| **Vercel** | Import repo → framework preset **Vite** (auto-detects build/output). |
| **Cloudflare Pages** | Connect repo → build `npm run build`, output `dist`. |
| **GitHub Pages** | Set `base: '/<repo-name>/'` in `vite.config.js`, add a `404.html` copy of `index.html`, build, publish `dist/`. |

Because routing is path-based, the host must serve `index.html` for unknown
paths. `netlify.toml` already does this; Vercel and Cloudflare Pages detect it
from the Vite preset. Old `/#/weddings`-style links still work — `src/main.tsx`
rewrites them to the path form before React mounts.

## SEO & GEO

Search engines and AI answer engines are treated as a first-class audience.

| Piece | Where |
|---|---|
| Business facts, address, hours, drive times — one source of truth | `src/lib/site.ts` |
| Per-route `<title>`, description, canonical, Open Graph, Twitter, JSON-LD | `src/lib/seo.ts` (`useSeo`) |
| FAQ copy, rendered on the page *and* emitted as `FAQPage` schema | `src/lib/faqs.ts` |
| Baseline `Winery` / `WebSite` schema for crawlers that don't run JS | `index.html` |
| `robots.txt` — allows the major AI crawlers by name, blocks `/admin` | `public/robots.txt` |
| `sitemap.xml` and `llms.txt` — generated from the journal seed | `scripts/generate-seo-assets.mjs` |

The generator runs automatically on `npm run build` (via `prebuild`). Run it on
its own with `npm run seo`. Set `VITE_SITE_URL` at build time to change the
canonical origin — it feeds the meta tags, the schema and the generated files
together.

**When you add or rename a journal post in the seed**, re-run `npm run seo` so
the sitemap and `llms.txt` follow. Posts written in the admin persist per
`BACKEND.md` (Supabase if configured, otherwise that browser's localStorage) and
won't appear in the generated files either way — they're only crawlable once
they're folded back into the seed.

## The journal

Blog posts live at `/journal` and `/journal/<slug>`, with the three most recent
shown on the home page. Each post carries exactly one image plus its alt text,
which keeps the cards even and gives every post an unambiguous social card and
`BlogPosting` image.

Write and edit them at `/admin` → **The journal**. The editor takes markdown-lite
body copy (blank line between paragraphs, `## ` for a sub-heading, `- ` for a
bullet, `> ` for a pull quote), a photo picked from the library or pasted in, and
shows a plain-English readiness checklist — headline length, summary length, alt
text, word count, sub-headings, topics. Drafts stay private until **Published**
is ticked.

Seed posts are in `src/content/journal.json`, shared with the SEO generator so
the two can't drift.

## Product photos

Each product in the shop takes up to **4 photos**, managed at `/admin` →
**Shop & stock** → **Photos** on any product row. Pick files, or drag them onto
the panel; the first photo is the one shown on the shelf and in social/search
previews, and can be changed with **Make cover** or the reorder arrows on each
thumbnail. Every photo needs a short description (alt text) — the panel flags
any that don't have one.

Uploads are downscaled and re-encoded to WebP in the browser (longest edge
1600px, `src/lib/media.ts`) before being stored, so a 6MB phone photo lands
around 100–200KB. The encoded bytes live in the browser's **IndexedDB**, not
localStorage: localStorage holds the whole app state as one string against a
~5MB quota, and four photos per product across the catalogue would blow that
instantly — with `setItem()` throwing and taking leads, orders and everything
else in the store down with it. Only each photo's metadata (an id, alt text,
dimensions) goes into the state that persists to localStorage.

This means **product photos are local to the browser that uploaded them** —
they don't sync across devices and, unlike the rest of the demo persistence
layer, they can never be crawled by a search engine, because there's no server
to serve them from. Moving to Supabase (per `ARCHITECTURE.md`) means swapping
`putImage`/`getImageBlob` in `src/lib/media.ts` for calls to Supabase Storage,
after which product photos become real, indexable URLs like everything else.
"Reset demo data" clears stored photos along with the rest of the seed data.

## Admin access

`/admin` → type the passcode.

With a backend configured the code is checked server-side and exchanged for a
Supabase session; **9876** is the default, set as a function secret. With no
backend configured the app is in demo mode and any code opens the office —
changes then live in that browser only, and "Reset demo data" reseeds them
(including any uploaded product photos).

See **`BACKEND.md`** for how persistence works, how to set it up, and what the
design deliberately doesn't do.
