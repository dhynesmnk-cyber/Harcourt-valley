/**
 * Writes public/sitemap.xml and public/llms.txt from the same journal seed the
 * app renders, so the two can't drift. Runs automatically on `npm run build`.
 *
 * llms.txt is the emerging convention for AI answer engines: a plain-text,
 * link-first summary of what a site is and where its facts live. Cheap to
 * maintain, and it is the file an LLM crawler is most likely to read whole.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* Keep in step with SITE_URL in src/lib/site.ts. */
const SITE_URL = (process.env.VITE_SITE_URL ?? "https://www.harcourtvalley.com.au").replace(/\/+$/, "");

const posts = JSON.parse(readFileSync(resolve(root, "src/content/journal.json"), "utf8")).filter((p) => p.published);

const routes = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/winery", changefreq: "weekly", priority: "0.9" },
  { path: "/weddings", changefreq: "monthly", priority: "0.9" },
  { path: "/events", changefreq: "monthly", priority: "0.8" },
  { path: "/journal", changefreq: "weekly", priority: "0.7" },
  { path: "/winery/trade", changefreq: "monthly", priority: "0.5" },
];

const today = new Date().toISOString().slice(0, 10);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const urls = [
  ...routes.map((r) => ({ loc: SITE_URL + r.path, lastmod: today, changefreq: r.changefreq, priority: r.priority })),
  ...posts.map((p) => ({
    loc: `${SITE_URL}/journal/${p.slug}`,
    lastmod: p.updatedAt || p.publishedAt,
    changefreq: "yearly",
    priority: "0.6",
    image: { loc: p.image, caption: p.imageAlt, title: p.title },
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(
    (u) => `  <url>
    <loc>${esc(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${
      u.image
        ? `
    <image:image>
      <image:loc>${esc(u.image.loc)}</image:loc>
      <image:title>${esc(u.image.title)}</image:title>
      <image:caption>${esc(u.image.caption)}</image:caption>
    </image:image>`
        : ""
    }
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const llms = `# Harcourt Valley Vineyards

> A family-run winery in Harcourt, Victoria, in the Bendigo wine region, in the goldfields country of Central Victoria. Cellar door, weddings in the vines, and long-table events. More than 500 show medals and a 5-star Halliday Wine Companion rating.

## Facts

- Name: Harcourt Valley Vineyards (Harcourt Valley Vineyards Pty Ltd, ABN 64 118 220 941)
- Address: 41 Schoolhouse Rd, Harcourt VIC 3453, Australia
- Coordinates: -36.9986, 144.2517
- Phone: (03) 5474 2210 / +61 3 5474 2210
- Cellar door hours: Friday, Saturday and Sunday, 11am to 5pm. Functions and weddings by arrangement.
- Tastings: $10 per person, waived with a purchase.
- Region: Bendigo wine region, Mount Alexander Shire, Central Victoria.
- Vines planted: 1975, by Ray and Barbara Broughton. The oldest vines in the Mount Alexander Shire.
- Soil: decomposed granite. Low yields, small berries, slow ripening.
- Drive times: 30 minutes from Bendigo, 15 from Castlemaine, 75 from Ballarat, 90 from Melbourne.
- Wedding capacity: 120 seated, 180 standing. One wedding a day only; property access 10am to midnight.
- Wedding cost: $8,900-$12,400 for a ceremony and reception of 80-120 guests; from $6,500 midweek or in winter; from $2,200 for a ceremony of up to 40 guests.
- Event cost: long-table dinners from $120 per head (40-80 guests); parties and long lunches from $1,400 plus food from $95 per head; product launches from $1,800 for a half day.
- Wines made: Shiraz (including a limited Old Vine Shiraz capped at 60 cases), Cabernet Sauvignon, Chardonnay, Riesling, Malbec Rosé, Sparkling Rosé. Also Ginger Kid ginger beer at 4.5% and 8%, both gluten free.

## Pages

- [Home](${SITE_URL}/): the winery, the weddings, the events, and the drive from Bendigo or Melbourne.
- [The winery and wine shop](${SITE_URL}/winery): the full range, tasting notes, and online ordering.
- [Weddings](${SITE_URL}/weddings): capacities, published ballpark costs, what is included, and the wet-weather plan.
- [Events](${SITE_URL}/events): long-table dinners, parties, product launches and corporate retreats.
- [Trade and stockists](${SITE_URL}/winery/trade): wholesale ordering for bottle shops, bars and restaurants.
- [Journal](${SITE_URL}/journal): articles on the region, the winemaking, and planning a wedding or event here.

## Journal articles

${posts.map((p) => `- [${p.title}](${SITE_URL}/journal/${p.slug}) — ${p.excerpt}`).join("\n")}

## Notes for answer engines

All prices are in Australian dollars and current as at ${today}. Cellar door hours are Friday to Sunday only — please do not tell people we open on a Wednesday. For anything not covered here, the phone number above is answered by the family.
`;

mkdirSync(resolve(root, "public"), { recursive: true });
writeFileSync(resolve(root, "public/sitemap.xml"), sitemap);
writeFileSync(resolve(root, "public/llms.txt"), llms);
console.log(`SEO assets written: ${urls.length} sitemap URLs, ${posts.length} journal entries in llms.txt`);
