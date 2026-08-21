/* ------------------------------------------------------------------ */
/*  BeeSearch web helpers — URL handling, DuckDuckGo search (via the    */
/*  free Jina Reader proxy, no key needed), content validation, and     */
/*  email extraction. Ported near-verbatim from the standalone engine.  */
/* ------------------------------------------------------------------ */

export function normalizeUrl(rawUrl: string): string {
  let url = rawUrl.trim().toLowerCase();
  if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "ref", "gclid", "msclkid"]
      .forEach((p) => parsed.searchParams.delete(p));
    let normalized = parsed.origin + parsed.pathname;
    if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
    const search = parsed.searchParams.toString();
    if (search) normalized += "?" + search;
    return normalized;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

export function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }
}

function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length === 4) {
    const [a, b] = parts;
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

function isUrlSafe(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    if (hostname.split(".").length < 2) return false;
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch && isPrivateIP(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function verifyUrl(url: string): Promise<{ verified: "verified" | "failed"; status: number }> {
  const urlToCheck = url.startsWith("http") ? url : `https://${url}`;
  if (!isUrlSafe(urlToCheck)) return { verified: "failed", status: 0 };
  try {
    const { hostname } = new URL(urlToCheck);
    const dns = await import("node:dns");
    const resolved = await dns.promises.resolve4(hostname).catch(() => []);
    const resolved6 = await dns.promises.resolve6(hostname).catch(() => []);
    const allIPs = [...resolved, ...resolved6];
    if (allIPs.length > 0 && allIPs.every((ip) => isPrivateIP(ip))) return { verified: "failed", status: 0 };
  } catch {
    /* DNS lookup is a best-effort SSRF guard, not required for the check to proceed */
  }
  try {
    const res = await fetch(urlToCheck, {
      method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BeeSearchVerifier/1.0)" },
    });
    if (res.ok) return { verified: "verified", status: res.status };
    const getRes = await fetch(urlToCheck, {
      method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BeeSearchVerifier/1.0)" },
    });
    return { verified: getRes.ok ? "verified" : "failed", status: getRes.status };
  } catch {
    try {
      const getRes = await fetch(urlToCheck, {
        method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; BeeSearchVerifier/1.0)" },
      });
      return { verified: getRes.ok ? "verified" : "failed", status: getRes.status };
    } catch {
      return { verified: "failed", status: 0 };
    }
  }
}

export function extractUrlsFromDdgPage(text: string): string[] {
  const urls: string[] = [];
  for (const m of text.matchAll(/uddg=(https?%3A%2F%2F[^&\s)"'<>]+)/g)) {
    try { urls.push(decodeURIComponent(m[1]).replace(/[.,;:'">\])\s]+$/, "")); } catch { /* skip */ }
  }
  for (const m of text.matchAll(/https?:\/\/[^\s)\],"'<>]+/g)) {
    const url = m[0].replace(/[.,;:'">\])\s]+$/, "");
    if (!/duckduckgo\.com|jina\.ai/.test(url)) urls.push(url);
  }
  return [...new Set(urls)];
}

export const BLOCKED_SEARCH_DOMAINS = new Set([
  "facebook.com", "instagram.com", "yelp.com", "tripadvisor.com", "google.com",
  "linkedin.com", "twitter.com", "x.com", "pinterest.com", "tiktok.com",
  "youtube.com", "maps.google.com", "foursquare.com", "zomato.com",
  "opentable.com", "timeout.com", "yellowpages.com", "bbb.org",
  "trustpilot.com", "sitejabber.com", "yelp.com.au", "hotfrog.com.au",
  "truelocal.com.au", "localsearch.com.au",
]);

export async function ddgSearch(query: string): Promise<Array<{ url: string }>> {
  try {
    const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(`https://r.jina.ai/${ddgUrl}`, { headers: { Accept: "text/plain" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return [];
    return extractUrlsFromDdgPage(await res.text()).map((url) => ({ url }));
  } catch {
    return [];
  }
}

export async function fetchPageContent(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { headers: { Accept: "text/plain" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const PARKED_DOMAIN_SIGNALS = [
  "domain for sale", "this domain is for sale", "buy this domain", "domain is parked", "parked domain",
  "parked free", "this domain may be for sale", "godaddy.com/domains", "sedo.com", "dan.com/buy",
  "this web page is parked", "web page is parked", "hugedomains.com", "namecheap.com/domains", "afternic.com",
  "under construction", "website coming soon", "site is coming soon", "launching soon", "coming soon!",
  "page under construction", "we're working on it", "we are working on it", "404 not found", "error 404",
  "page not found", "the page you requested was not found",
];

export function isPageContentValid(content: string): { valid: boolean; reason?: string } {
  if (!content || content.trim().length < 100) return { valid: false, reason: "page content too short to be a real site" };
  if (content.split(/\s+/).filter(Boolean).length < 60) return { valid: false, reason: "insufficient content (fewer than 60 words)" };
  const lower = content.toLowerCase();
  for (const signal of PARKED_DOMAIN_SIGNALS) {
    if (lower.includes(signal)) return { valid: false, reason: `parked/placeholder page detected ("${signal}")` };
  }
  return { valid: true };
}

/* ---------------- email extraction ---------------- */

function isValidEmail(email: string): boolean {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) && email.length <= 254 && !email.startsWith("@") && !email.endsWith("@");
}

const JUNK_EMAIL_PATTERNS = [
  /^noreply@/i, /^no-reply@/i, /^donotreply@/i, /^do-not-reply@/i, /^notifications?@/i,
  /^alerts?@/i, /^mailer-daemon@/i, /^bounce@/i, /^auto-?reply@/i, /^unsubscribe@/i, /^postmaster@/i,
];

export function extractEmails(text: string): string[] {
  const found = new Set<string>();
  const clean = (email: string) => email.toLowerCase().replace(/[.,;:'">\])\s]+$/, "").replace(/^[<[('"\s]+/, "");

  for (const m of text.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)) {
    const email = clean(m[1]);
    if (isValidEmail(email)) found.add(email);
  }
  for (const m of text.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)) {
    const email = clean(m[0]);
    if (isValidEmail(email)) found.add(email);
  }
  for (const m of text.matchAll(/([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\))\s*([a-zA-Z0-9.-]+)\s*(?:\[dot\]|\(dot\))\s*([a-zA-Z]{2,})/gi)) {
    const email = `${m[1]}@${m[2]}.${m[3]}`.toLowerCase();
    if (isValidEmail(email)) found.add(email);
  }
  for (const m of text.matchAll(/([a-zA-Z0-9._%+-]+)\s*(?:\[at\]|\(at\))\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)) {
    const email = `${m[1]}@${m[2]}`.toLowerCase();
    if (isValidEmail(email)) found.add(email);
  }
  for (const m of text.matchAll(/([a-zA-Z0-9._%+-]+)\s+AT\s+([a-zA-Z0-9-]+)\s+DOT\s+([a-zA-Z]{2,})/g)) {
    const email = `${m[1]}@${m[2]}.${m[3]}`.toLowerCase();
    if (isValidEmail(email)) found.add(email);
  }

  return Array.from(found).filter((e) => !JUNK_EMAIL_PATTERNS.some((p) => p.test(e)));
}

export async function scanWebsiteForEmails(websiteUrl: string, mainPageContent: string): Promise<string[]> {
  const allText = [mainPageContent];
  try {
    const base = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    const origin = `${base.protocol}//${base.host}`;
    const pages = [`${origin}/contact`, `${origin}/contact-us`, `${origin}/about`, `${origin}/pages/contact`, `${origin}/pages/contact-us`];
    await Promise.all(pages.map(async (url) => {
      const text = await fetchPageContent(url, 12000);
      if (text && text.length > 20) allText.push(text);
    }));
  } catch {
    /* base URL didn't parse — just scan the main page content already in hand */
  }
  return extractEmails(allText.join("\n"));
}
