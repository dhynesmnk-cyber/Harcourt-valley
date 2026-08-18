# Harcourt Valley Vineyards — Website

Single-page marketing site + admin command center for Harcourt Valley Vineyards.
Built with **Vite + React + TypeScript + Tailwind CSS v4**. Routing is hash-based
(`/#/winery`, `/#/weddings`, `/#/events`, `/#/admin`), so it deploys to any static
host with zero server configuration. Admin/site content (products, leads, CMS
copy, etc.) is stored in Supabase and shared across every browser and device;
only the shopping cart stays local to each visitor.

## Backend setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard: **SQL Editor** → paste the contents of `supabase/schema.sql`
   → **Run**. This creates the `admins` allowlist (seeded with one admin email —
   edit the file first, or run an extra `insert into admins (email) values (...)`
   afterwards) and the `site_state` table that holds all admin/site content.
3. In **Authentication → URL Configuration**, set the **Site URL** to your
   deployed URL (and add `http://localhost:3000` under **Redirect URLs** for
   local dev).
4. In **Project Settings → API**, copy the **Project URL** and **anon public**
   key (never the `service_role` key) into a `.env` file:

   ```bash
   cp .env.example .env
   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

5. On your hosting provider (e.g. Netlify), set the same two env vars for the
   build. Without them, the admin shows a "not connected yet" screen but the
   public site still works.

The first allowlisted admin to sign in and make any change (or click "Reset
demo data") seeds `site_state` with the sample content automatically — no
manual data entry needed.

## Local development

```bash
npm install
npm run dev        # → http://localhost:3000
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
pipeline. Remember to set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
build environment variables on whichever host you use (see "Backend setup"
above), and to add its content-security-policy `connect-src` entry for your
Supabase project if you're not using Netlify's `netlify.toml`.

## Admin access

`/#/admin` → enter an allowlisted email → a real Supabase magic link is
emailed to you → open it on the same device to sign in. Emails not in the
`admins` table (see `supabase/schema.sql`) are shown an access-denied screen
even after clicking a valid link. Use "Reset demo data" in the sidebar to
reseed sample leads, orders and emails for everyone.
