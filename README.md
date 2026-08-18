# Harcourt Valley Vineyards — Website

Single-page marketing site + admin command center for Harcourt Valley Vineyards.
Built with **Vite + React + TypeScript + Tailwind CSS v4**. Routing is hash-based
(`/#/winery`, `/#/weddings`, `/#/events`, `/#/admin`), so it deploys to any static
host with zero server configuration. All data persists in the browser via
localStorage (demo persistence layer — swap for Supabase per `ARCHITECTURE.md`).

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
| **GitHub Pages** | Set `base: '/<repo-name>/'` in `vite.config.js`, build, publish `dist/`. |

Because routing is hash-based and images are served from remote URLs, deep links
and assets work out of the box on every option above — no rewrites, no asset
pipeline.

## Admin access

`/#/admin` → "Email me a sign-in link" → any email address signs you in
(demo auth; production wiring is Supabase magic links per `ARCHITECTURE.md`).
Use "Reset demo data" in the sidebar to reseed sample leads, orders and emails.

## Bee23 outreach engine

The Outreach tab (`/#/admin` → Outreach) can run on a real
[bee23](https://github.com/dhynesmnk-cyber/BeeSearch) engine instead of its
built-in demo data. It's optional — with nothing configured, Outreach behaves
exactly as it does today.

To connect one, set two environment variables on the Netlify site (Site
configuration → Environment variables), not in this repo:

| Variable | Value |
|---|---|
| `BEE23_ENGINE_URL` | The deployed engine's base URL, e.g. `https://bee23.example.com` |
| `BEE23_API_TOKEN` | A token minted from that engine — see its README's "Using bee23 from another site" |

Both are read only by `netlify/functions/bee23.ts`, a server-side proxy — the
token never reaches the browser bundle. This requires a Netlify deploy that
runs Functions (Git-connected or `netlify deploy`); **Netlify Drop does not
support Functions or environment variables**, so the drag-and-drop option above
always runs Outreach in demo mode.

Once connected, the "Regional stockists" target profile searches for real
prospects, seeded from Harcourt's own trade accounts (`src/lib/data.ts` →
`seedTradeOrders`) the first time it runs. "Wedding & event planners" stays on
demo data — there's no equivalent structured list of existing planner
relationships in this app to train it on.
