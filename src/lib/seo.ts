import { useEffect } from "react";
import { BUSINESS, SITE_LOCALE, SITE_NAME, SITE_URL, SOCIAL_LINKS, absUrl, fullAddress } from "./site";

/* ------------------------------------------------------------------ */
/*  Per-route <head> management.                                       */
/*                                                                     */
/*  index.html carries the defaults so a crawler that never runs JS    */
/*  still gets a title, a description and the organisation schema.     */
/*  useSeo() overwrites those same tags per route and puts them back   */
/*  on unmount, so nothing leaks from one page to the next.            */
/* ------------------------------------------------------------------ */

export type JsonLd = Record<string, unknown>;

export interface SeoInput {
  /** Page title without the brand suffix — the suffix is added for you. */
  title: string;
  description: string;
  /** Site-relative path, e.g. "/weddings". */
  path: string;
  /** Absolute or site-relative image URL for social cards. */
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  /** Keep this page out of the index (admin, thin pages). */
  noindex?: boolean;
  /** Structured data for this route. Rendered as one <script> per entry. */
  jsonLd?: JsonLd[];
  /** ISO dates, articles only. */
  publishedTime?: string;
  modifiedTime?: string;
  /** Extra keyword-ish signals used by some crawlers; kept short and honest. */
  keywords?: string[];
}

const TITLE_SUFFIX = ` | ${SITE_NAME}`;
const DEFAULT_IMAGE = "https://image.qwenlm.ai/generated-images/f6170caa-669e-442a-b93f-6328f8d283dd/_result.png";

/** Full <title> text for a page title, deduped if the brand is already in it. */
export function fullTitle(title: string): string {
  const t = title.trim();
  if (t.toLowerCase().includes(SITE_NAME.toLowerCase())) return t;
  return t + TITLE_SUFFIX;
}

type Undo = () => void;

function upsertTag(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void, undos: Undo[]) {
  const existing = document.head.querySelector<HTMLElement>(selector);
  if (existing) {
    const before = existing.cloneNode(true) as HTMLElement;
    apply(existing);
    undos.push(() => {
      Array.from(existing.attributes).forEach((a) => existing.removeAttribute(a.name));
      Array.from(before.attributes).forEach((a) => existing.setAttribute(a.name, a.value));
    });
    return;
  }
  const el = create();
  apply(el);
  document.head.appendChild(el);
  undos.push(() => el.remove());
}

function meta(name: string, content: string, undos: Undo[], attr: "name" | "property" = "name") {
  upsertTag(
    `meta[${attr}="${name}"]`,
    () => {
      const el = document.createElement("meta");
      el.setAttribute(attr, name);
      return el;
    },
    (el) => el.setAttribute("content", content),
    undos,
  );
}

function link(rel: string, href: string, undos: Undo[]) {
  upsertTag(
    `link[rel="${rel}"]`,
    () => {
      const el = document.createElement("link");
      el.setAttribute("rel", rel);
      return el;
    },
    (el) => el.setAttribute("href", href),
    undos,
  );
}

/**
 * Writes the full set of head tags for a route and cleans up after itself.
 * Call it once, near the top of every public page component.
 */
export function useSeo(input: SeoInput) {
  const {
    title, description, path, image, imageAlt, type = "website",
    noindex = false, jsonLd = [], publishedTime, modifiedTime, keywords,
  } = input;

  /* jsonLd is usually an inline literal, so compare by value not identity. */
  const jsonLdKey = JSON.stringify(jsonLd);
  const keywordsKey = keywords?.join(",") ?? "";

  useEffect(() => {
    const undos: Undo[] = [];
    const canonical = absUrl(path);
    const img = absUrl(image ?? DEFAULT_IMAGE);
    const heading = fullTitle(title);

    const prevTitle = document.title;
    document.title = heading;
    undos.push(() => {
      document.title = prevTitle;
    });

    meta("description", description, undos);
    meta("robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", undos);
    if (keywordsKey) meta("keywords", keywordsKey, undos);
    link("canonical", canonical, undos);

    meta("og:site_name", SITE_NAME, undos, "property");
    meta("og:locale", SITE_LOCALE, undos, "property");
    meta("og:type", type, undos, "property");
    meta("og:title", heading, undos, "property");
    meta("og:description", description, undos, "property");
    meta("og:url", canonical, undos, "property");
    meta("og:image", img, undos, "property");
    if (imageAlt) meta("og:image:alt", imageAlt, undos, "property");
    if (publishedTime) meta("article:published_time", publishedTime, undos, "property");
    if (modifiedTime) meta("article:modified_time", modifiedTime, undos, "property");

    meta("twitter:card", "summary_large_image", undos);
    meta("twitter:title", heading, undos);
    meta("twitter:description", description, undos);
    meta("twitter:image", img, undos);
    if (imageAlt) meta("twitter:image:alt", imageAlt, undos);

    const blocks: JsonLd[] = JSON.parse(jsonLdKey);
    blocks.forEach((block) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seo = "route";
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
      undos.push(() => script.remove());
    });

    return () => undos.reverse().forEach((u) => u());
  }, [title, description, path, image, imageAlt, type, noindex, jsonLdKey, publishedTime, modifiedTime, keywordsKey]);
}

/* ------------------------------------------------------------------ */
/*  Schema.org builders                                                */
/* ------------------------------------------------------------------ */

export const ORG_ID = `${SITE_URL}/#winery`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** The Winery node everything else points at with @id. Kept in one place. */
export function winerySchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": ["Winery", "LocalBusiness", "TouristAttraction"],
    "@id": ORG_ID,
    name: SITE_NAME,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    foundingDate: BUSINESS.founded,
    priceRange: BUSINESS.priceRange,
    currenciesAccepted: "AUD",
    image: DEFAULT_IMAGE,
    logo: absUrl("/favicon.svg"),
    description:
      "Harcourt Valley Vineyards is a family-run winery in Harcourt, Victoria, in the Bendigo wine region. It has won more than 500 show medals, holds a 5-star Halliday Wine Companion rating, and hosts weddings and events among the oldest vines in the Mount Alexander Shire.",
    slogan: "Award-winning wine, grown on granite.",
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.suburb,
      addressRegion: BUSINESS.state,
      postalCode: BUSINESS.postcode,
      addressCountry: BUSINESS.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: BUSINESS.latitude, longitude: BUSINESS.longitude },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${BUSINESS.latitude},${BUSINESS.longitude}`,
    openingHoursSpecification: BUSINESS.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => `https://schema.org/${d}`),
      opens: h.opens,
      closes: h.closes,
    })),
    areaServed: [
      { "@type": "City", name: "Bendigo" },
      { "@type": "City", name: "Castlemaine" },
      { "@type": "City", name: "Melbourne" },
      { "@type": "AdministrativeArea", name: "Central Victoria" },
    ],
    sameAs: [...SOCIAL_LINKS],
    award: [
      "500+ Australian and international wine show medals",
      "5-star winery, Halliday Wine Companion",
      "Trophy — Central Victorian Shiraz",
    ],
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Cellar door tastings", value: true },
      { "@type": "LocationFeatureSpecification", name: "Wedding venue", value: true },
      { "@type": "LocationFeatureSpecification", name: "Function room (120 seated, 180 standing)", value: true },
      { "@type": "LocationFeatureSpecification", name: "Wheelchair accessible cellar door", value: true },
      { "@type": "LocationFeatureSpecification", name: "On-site parking for 60 cars", value: true },
    ],
  };
}

export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "en-AU",
    publisher: { "@id": ORG_ID },
  };
}

/** WebPage node — ties a route to the winery and marks it read-aloud friendly. */
export function webPageSchema(opts: { path: string; name: string; description: string; primaryImage?: string }): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${absUrl(opts.path)}#webpage`,
    url: absUrl(opts.path),
    name: fullTitle(opts.name),
    description: opts.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "en-AU",
    primaryImageOfPage: absUrl(opts.primaryImage ?? DEFAULT_IMAGE),
    speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", "[data-speakable]"] },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absUrl(t.path),
    })),
  };
}

export interface Faq {
  q: string;
  a: string;
}

export function faqSchema(faqs: Faq[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export { DEFAULT_IMAGE, fullAddress };
