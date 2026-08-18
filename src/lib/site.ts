/* ------------------------------------------------------------------ */
/*  Single source of truth for everything a search engine, an AI       */
/*  answer engine, or a human on the phone needs to know about us.     */
/*  Change it here and it changes in the <head>, the JSON-LD, the      */
/*  sitemap, llms.txt and the footer at the same time.                 */
/* ------------------------------------------------------------------ */

/** Production origin, no trailing slash. Override at build time with VITE_SITE_URL. */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, "") ?? "https://www.harcourtvalley.com.au";

export const SITE_NAME = "Harcourt Valley Vineyards";
export const SITE_TAGLINE = "Wine, weddings & events on granite country";
export const SITE_LOCALE = "en_AU";

export const BUSINESS = {
  legalName: "Harcourt Valley Vineyards Pty Ltd",
  abn: "64 118 220 941",
  founded: "1975",
  vineyardPlanted: "1975",
  streetAddress: "41 Schoolhouse Rd",
  suburb: "Harcourt",
  state: "VIC",
  stateFull: "Victoria",
  postcode: "3453",
  country: "AU",
  countryName: "Australia",
  region: "Bendigo wine region, Central Victoria",
  phone: "+61 3 5474 2210",
  phoneDisplay: "(03) 5474 2210",
  email: "hello@harcourtvalley.example",
  /* Harcourt, Victoria — used for geo meta tags and LocalBusiness schema. */
  latitude: -36.9986,
  longitude: 144.2517,
  priceRange: "$$",
  openingHours: [{ days: ["Friday", "Saturday", "Sunday"], opens: "11:00", closes: "17:00" }],
  openingHoursText: "Friday to Sunday, 11am–5pm (functions by arrangement)",
} as const;

/** Drive times are the single most-asked question, and the thing AI engines quote. */
export const DISTANCES = [
  { from: "Bendigo", minutes: 30, km: 35 },
  { from: "Castlemaine", minutes: 15, km: 12 },
  { from: "Melbourne", minutes: 90, km: 120 },
  { from: "Ballarat", minutes: 75, km: 90 },
] as const;

/** Short, checkable claims. Written to be quotable verbatim by an answer engine. */
export const KEY_FACTS = [
  { label: "Show medals won", value: "500+", detail: "Across Australian and international wine shows." },
  { label: "Halliday Wine Companion", value: "5 stars", detail: "Rated a 5-star winery in the Halliday Wine Companion." },
  { label: "Vines planted", value: "1975", detail: "The oldest vines in the Mount Alexander Shire, planted by Ray and Barbara Broughton." },
  { label: "Weddings per day", value: "One", detail: "Only ever one wedding a day — the property is yours 10am to midnight." },
  { label: "Seated capacity", value: "120", detail: "120 seated in the function room, or 180 standing." },
  { label: "Drive from Bendigo", value: "30 min", detail: "Ninety minutes from Melbourne, fifteen from Castlemaine." },
] as const;

export const SOCIAL_LINKS = [
  "https://www.facebook.com/harcourtvalleyvineyards",
  "https://www.instagram.com/harcourtvalleyvineyards",
] as const;

/** Absolute URL for a site-relative path. */
export function absUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}

export const fullAddress = `${BUSINESS.streetAddress}, ${BUSINESS.suburb} ${BUSINESS.state} ${BUSINESS.postcode}`;
