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
