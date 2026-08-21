/* ------------------------------------------------------------------ */
/*  BeeSearch AI layer — evaluation, discovery, and pitch generation.   */
/*  Ported from the standalone engine's server/enrichment.ts onto the   */
/*  Supabase-backed db.ts, trimmed to what this single-tenant admin      */
/*  actually uses (no per-user API keys, no RAG-style multi-provider     */
/*  routing — one Anthropic key, one brand).                            */
/* ------------------------------------------------------------------ */

import Anthropic from "@anthropic-ai/sdk";
import * as db from "./db";
import { canonicalUrl, ddgSearch, extractUrlsFromDdgPage, fetchPageContent, isPageContentValid, scanWebsiteForEmails, verifyUrl, BLOCKED_SEARCH_DOMAINS } from "./web";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export function anthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("BeeSearch isn't configured — missing ANTHROPIC_API_KEY.");
  return new Anthropic({ apiKey });
}

function textOf(message: Anthropic.Message): string {
  const block = message.content[0];
  return block && block.type === "text" ? block.text : "";
}

/* ---------------- evaluation ---------------- */

const STOCKIST_EVAL_PROMPT = (content: string, brandContext: string) => `You are a retail account evaluation engine. Analyze the following website content for a potential retail partner and return a JSON object with these exact fields:

- brandAlignment (0-10): How well does this prospect's brand align with the seller's brand positioning and aesthetic?
- valueAlignment (0-10): How aligned are their values with the seller's mission and principles?
- demographicResonance (0-10): How well does their target demographic overlap with the seller's ideal customer?
- salesOpportunity (0-10): How strong is the potential sales opportunity for the seller's products?
- purchasingSize (0-10): Estimated purchasing volume capability for the seller's product category
- communityGravity (0-10): Strength of their community presence and following
- merchandisingReadiness (0-10): How ready are they for merchandising partnerships with the seller?
- compositeScore: Sum of all seven dimensions (0-70)
- recommendedStrategy: A strategy tag like "organic_retailer", "gift_shop", "boutique", "specialty_food", "lifestyle_brand", "wellness_store", "home_goods", "concept_store", etc.
- primaryLanguage: ISO language code detected from the content (e.g., "en", "es", "fr", "de")
${brandContext}
Return ONLY the JSON object, no markdown formatting or explanations.

Website content:
${content.slice(0, 15000)}`;

const REFERRAL_PARTNER_EVAL_PROMPT = (content: string, brandContext: string) => `You are a referral-partner evaluation engine. Analyze the following website content for a potential referral partner — a business (e.g. a wedding or event planner) that could refer its own clients to the seller, not one that buys and resells product. Return a JSON object with these exact fields:

- venueAffinity (0-10): How much do they already work with vineyard, rural estate, or similarly-styled venues?
- guestSizeFit (0-10): How well does the guest-count range they typically plan match the seller's stated capacity?
- bookingVolume (0-10): Estimated volume of events they book per year, judged from the site (portfolio size, testimonials, "as seen" mentions, etc.)
- referralReadiness (0-10): How open do they seem to new venue partnerships — do they name preferred-venue relationships, an affiliate/partner program, or similar?
- styleAlignment (0-10): Aesthetic and tone fit with the seller's brand (rustic/vineyard, formal, modern, etc.)
- compositeScore: Sum of all five dimensions (0-50)
- recommendedStrategy: A strategy tag like "boutique_planner", "destination_specialist", "corporate_events_planner", "full_service_coordinator", "day_of_coordinator", etc.
- primaryLanguage: ISO language code detected from the content (e.g., "en", "es", "fr", "de")
${brandContext}
Return ONLY the JSON object, no markdown formatting or explanations.

Website content:
${content.slice(0, 15000)}`;

function brandContextFor(settings: db.PromptSettings | undefined): string {
  if (settings?.brandProfile) {
    return `\n\nIMPORTANT — The seller's brand profile (use this to calibrate all scores relative to how well this prospect fits THIS specific brand):\n${settings.brandProfile}\n`;
  }
  if (settings?.productDescription) return `\n\nThe seller's product/service: ${settings.productDescription}\n`;
  return "";
}

export async function evaluateAccount(accountId: number, content: string): Promise<void> {
  try {
    await db.updateAccount(accountId, { enrichment_status: "processing" });
    const account = await db.getAccount(accountId);
    const accountType: db.AccountType = account?.accountType === "referral_partner" ? "referral_partner" : "stockist";
    const settings = await db.getPromptSettings();

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const confidence = wordCount < 200 ? "low" : wordCount <= 600 ? "medium" : "high";
    const brandContext = brandContextFor(settings);

    const message = await anthropicClient().messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: accountType === "referral_partner" ? REFERRAL_PARTNER_EVAL_PROMPT(content, brandContext) : STOCKIST_EVAL_PROMPT(content, brandContext) }],
    });

    const jsonMatch = textOf(message).match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in AI response");
    const parsed = JSON.parse(jsonMatch[0]);

    const scoreColumns = accountType === "referral_partner"
      ? { venue_affinity: parsed.venueAffinity, guest_size_fit: parsed.guestSizeFit, booking_volume: parsed.bookingVolume, referral_readiness: parsed.referralReadiness, style_alignment: parsed.styleAlignment }
      : { brand_alignment: parsed.brandAlignment, value_alignment: parsed.valueAlignment, demographic_resonance: parsed.demographicResonance, sales_opportunity: parsed.salesOpportunity, purchasing_size: parsed.purchasingSize, community_gravity: parsed.communityGravity, merchandising_readiness: parsed.merchandisingReadiness };

    await db.updateAccount(accountId, {
      ...scoreColumns,
      composite_score: parsed.compositeScore,
      recommended_strategy: parsed.recommendedStrategy,
      primary_language: parsed.primaryLanguage,
      enriched_content: content,
      enriched_content_word_count: wordCount,
      scoring_confidence: confidence,
      enrichment_status: "completed",
      pipeline_stage: "enriching",
      error_message: null,
    });

    let emails: string[] = [];
    try { emails = await scanWebsiteForEmails(account!.websiteUrl, content); } catch { /* bonus, not required */ }
    if (emails.length > 0) await db.updateAccount(accountId, { emails });
  } catch (error: any) {
    await db.updateAccount(accountId, { enrichment_status: "failed", error_message: error.message });
  }
}

/* ---------------- pitch generation ---------------- */

export async function generatePitch(accountId: number): Promise<string> {
  const account = await db.getAccount(accountId);
  if (!account) throw new Error("Account not found");
  const settings = await db.getPromptSettings();
  const isReferralPartner = account.accountType === "referral_partner";
  const brandName = settings?.companyName || "[Your Brand]";

  const strategy = account.recommendedStrategy || "general";
  const pitchCount = await db.getPitchCountByStrategy(strategy);
  let referenceContext: string;
  if (pitchCount >= 3) {
    const recent = await db.getPitchesByStrategy(strategy, 3);
    referenceContext = `Here are ${recent.length} successful past pitch emails for similar "${strategy}" accounts. Use these as style and structure references:\n\n${recent.map((p, i) => `--- Past Pitch ${i + 1} ---\n${p.finalEmailText}`).join("\n\n")}`;
  } else {
    referenceContext = `No past pitches are available yet for this strategy type. Use this structural template as a guide:\n\nSubject: Partnership Opportunity - ${brandName} x ${account.accountName}\n\nDear ${account.accountName} Team,\n\nI've been following your work and I'm impressed by [specific observation about their brand/values].\n\n${brandName} specializes in ${settings?.productDescription || "[product description]"}, and I believe there's a natural synergy between our brands because [specific reason based on their positioning].\n\nI'd love to explore how we might work together. Would you be open to a brief conversation?\n\nBest regards${settings?.senderName ? `,\n${settings.senderName}` : ""}`;
  }

  let sellerContext = "";
  if (settings?.companyName || settings?.productDescription || settings?.senderName || settings?.additionalContext || settings?.brandProfile) {
    sellerContext = "\nSeller details:";
    if (settings.companyName) sellerContext += `\n- Company: ${settings.companyName}`;
    if (settings.senderName) sellerContext += `\n- Sender name: ${settings.senderName}`;
    if (settings.productDescription) sellerContext += `\n- Product/service: ${settings.productDescription}`;
    if (settings.additionalContext) sellerContext += `\n- Additional context: ${settings.additionalContext}`;
    if (settings.brandProfile) sellerContext += `\n\nSeller's Brand Profile:\n${settings.brandProfile}`;
    sellerContext += "\n";
  }

  const toneInstruction = settings?.pitchTone ? `Use a ${settings.pitchTone} tone throughout the email.` : "Use a warm, professional tone.";
  const rulesSection = settings?.customRules ? `\nIMPORTANT RULES — you must follow these:\n${settings.customRules}\n` : "";

  const scoresBlock = isReferralPartner
    ? `Evaluation scores (each out of 10):\n- Venue Affinity: ${account.venueAffinity}/10\n- Guest Size Fit: ${account.guestSizeFit}/10\n- Booking Volume: ${account.bookingVolume}/10\n- Referral Readiness: ${account.referralReadiness}/10\n- Style Alignment: ${account.styleAlignment}/10`
    : `Evaluation scores (each out of 10):\n- Brand Alignment: ${account.brandAlignment}/10\n- Value Alignment: ${account.valueAlignment}/10\n- Demographic Resonance: ${account.demographicResonance}/10\n- Sales Opportunity: ${account.salesOpportunity}/10\n- Purchasing Size: ${account.purchasingSize}/10\n- Community Gravity: ${account.communityGravity}/10\n- Merchandising Readiness: ${account.merchandisingReadiness}/10`;

  const scoreGuidance = isReferralPartner
    ? `IMPORTANT: Study the evaluation scores above carefully. Identify the account's top 2-3 highest-scoring dimensions and use them to craft a specific, compelling reason why we should work together. Weave these score-driven insights naturally into the email — do NOT list scores or mention numbers.`
    : `IMPORTANT: Study the evaluation scores above carefully. Identify the account's top 2-3 highest-scoring dimensions and use them to craft a specific, compelling reason why we should work together. Weave these score-driven insights naturally into the email — do NOT list scores or mention numbers.`;

  const message = await anthropicClient().messages.create({
    model: MODEL,
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: `Generate a personalized sales pitch email for the following ${isReferralPartner ? "referral partner" : "retail account"}.

IMPORTANT: Write the entire email in ${account.primaryLanguage || "en"} language.
${toneInstruction}

Account details:
- Name: ${account.accountName}
- Website: ${account.websiteUrl}
- Strategy: ${account.recommendedStrategy || "general"}
- Composite Score: ${account.compositeScore}/${isReferralPartner ? 50 : 70}

${scoresBlock}
${sellerContext}
${referenceContext}
${rulesSection}
${scoreGuidance}

Generate a personalized pitch email. Make it specific to this account based on their evaluation scores and strategy type. The email should feel authentic, not templated.${settings?.senderName ? ` Sign off as ${settings.senderName}.` : ""} Do not use emojis.

Return ONLY the email text, no additional commentary.`,
    }],
  });

  return textOf(message);
}

/* ---------------- discovery ---------------- */

function buildExclusionSet(allAccounts: db.Account[], dismissed: db.DiscoverySuggestion[], stockists: db.Stockist[]): Set<string> {
  const names = new Set<string>();
  for (const a of allAccounts) names.add(a.accountName.toLowerCase().trim());
  for (const d of dismissed) names.add(d.accountName.toLowerCase().trim());
  for (const s of stockists) names.add(s.businessName.toLowerCase().trim());
  return names;
}

/** What the user told us to go and look for. The engine used to receive one
 *  sentence of free text; these are the fields the admin actually fills in. */
export interface DiscoveryTarget {
  targetId: string | null;
  accountType: db.AccountType;
  name: string;
  who: string;
  region: string;
  businessTypes: string[];
  notes: string;
}

export async function discoverSimilarAccounts(target: DiscoveryTarget): Promise<{ count: number; basedOn: number }> {
  const { targetId, accountType } = target;
  const isReferralPartner = accountType === "referral_partner";
  const trainingNoun = isReferralPartner ? "referral partners" : "stockists";
  const businessNoun = isReferralPartner ? "wedding & event planners" : "retail businesses";
  const businessKind = isReferralPartner ? "wedding or event planning business" : "retail business";

  const stockistsList = await db.getStockists(accountType, targetId);
  if (stockistsList.length < 5) {
    throw new Error(`"${target.name}" needs at least 5 training accounts before it can search — it has ${stockistsList.length}. Add the rest on the target and try again.`);
  }

  const topAccounts = await db.getTopAccountsByScore(accountType, 10);
  const settings = await db.getPromptSettings();
  const allAccounts = await db.getAccounts();
  const existingUrls = new Set(allAccounts.map((a) => canonicalUrl(a.websiteUrl)));
  const dismissed = await db.getDismissedSuggestions(accountType, targetId);
  const excludedNames = buildExclusionSet(allAccounts, dismissed, stockistsList);

  await db.clearPendingDiscoverySuggestions(accountType, targetId);

  const strategyCounts: Record<string, number> = {};
  for (const a of topAccounts) {
    const s = a.recommendedStrategy || "general";
    strategyCounts[s] = (strategyCounts[s] || 0) + 1;
  }
  const topStrategies = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1]).map(([s]) => s);

  const categoryCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};
  for (const s of stockistsList) {
    if (s.category) categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    if (s.location) locationCounts[s.location] = (locationCounts[s.location] || 0) + 1;
  }
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const topLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
  const stockistSummary = stockistsList.map((s) => `- ${s.businessName}${s.category ? ` [${s.category}]` : ""}${s.location ? ` (${s.location})` : ""}`).join("\n");

  let productContext = "";
  if (settings?.brandProfile) {
    productContext = `\nSELLER BRAND PROFILE:\n${settings.brandProfile}`;
    if (settings.companyName) productContext += `\nCompany: ${settings.companyName}`;
  } else if (settings?.productDescription) {
    productContext = `\nSeller product/service: ${settings.productDescription}`;
    if (settings.companyName) productContext += `\nSeller company: ${settings.companyName}`;
  }

  const dismissedContext = dismissed.length > 0 ? `\nPREVIOUSLY REJECTED (avoid these patterns):\n${dismissed.map((d) => `- ${d.accountName}${d.dismissReason ? ` — ${d.dismissReason}` : ""}`).join("\n")}` : "";
  // The target's own settings, stated plainly. This is what the admin fills in
  // on the target card, and it goes into every prompt below — previously all
  // the engine got was a single "Find businesses similar to: <sentence>" line.
  const typeList = target.businessTypes.map((t) => t.trim()).filter(Boolean);
  const typesLine = typeList.length > 0 ? typeList.join(", ") : "(not set — infer from the training list below)";
  const regionLine = target.region.trim() || "(not set — infer from the training list below)";
  const targetBrief = [
    `TARGET: ${target.name}`,
    target.who.trim() ? `WHO THEY ARE: ${target.who.trim()}` : "",
    `BUSINESS TYPES TO FIND: ${typesLine}`,
    `WHERE TO LOOK: ${regionLine}`,
    target.notes.trim() ? `OWNER'S NOTES (treat as binding): ${target.notes.trim()}` : "",
  ].filter(Boolean).join("\n");

  const patternContext = `${targetBrief}\n\nCURRENT ${trainingNoun.toUpperCase()} FOR THIS TARGET (${stockistsList.length}):\n${stockistSummary}\nPATTERNS: Categories: ${topCategories.map(([c, n]) => `${c}(${n})`).join(", ")} | Locations: ${topLocations.map(([l, n]) => `${l}(${n})`).join(", ")}${dismissedContext}`;
  const profileSummary = topAccounts.map((a) => `- ${a.accountName} (${a.websiteUrl}) — Strategy: ${a.recommendedStrategy}, Score: ${a.compositeScore}`).join("\n");

  const anthropic = anthropicClient();

  // STEP 1: generate targeted search queries
  const queryGen = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `You are helping find new prospects for a brand by generating web search queries.

${patternContext}
${productContext}
${topAccounts.length > 0 ? `\nTOP PERFORMING ACCOUNTS:\n${profileSummary}` : ""}

Generate 6 specific, targeted web search queries that would find the websites of real ${businessNoun} similar to the ${trainingNoun} above. Each query should be short and search-engine-ready.

Rules:
- Target a specific business type AND location from the patterns in the ${trainingNoun.slice(0, -1)} list
- Vary the queries to cover different business types and areas represented in the ${trainingNoun}
- Queries should find individual business websites, not directories, Yelp, TripAdvisor, or social media
- Every query must pair one of the BUSINESS TYPES with a specific town, suburb or shire inside WHERE TO LOOK
- Between them, the 6 queries should cover every listed business type at least once

Return a JSON array of 6 query strings only. Return ONLY the JSON array, no markdown.`,
    }],
  });

  let searchQueries: string[] = [];
  try {
    const m = textOf(queryGen).match(/\[[\s\S]*\]/);
    searchQueries = m ? JSON.parse(m[0]) : [];
  } catch { /* handled below */ }
  if (searchQueries.length === 0) throw new Error("Could not generate search queries for discovery. Please try again.");

  // STEP 2: execute searches
  const batches = await Promise.allSettled(searchQueries.map((q) => ddgSearch(q)));
  const allSearchResults: Array<{ url: string }> = [];
  for (const b of batches) if (b.status === "fulfilled") allSearchResults.push(...b.value);

  // STEP 3: filter candidate URLs
  const seenCanonicals = new Set<string>();
  const stockistUrls = new Set(stockistsList.map((s) => canonicalUrl(s.websiteUrl || "")));
  const candidateUrls: string[] = [];
  const junkPathPattern = isReferralPartner
    ? /\/(listing|directory|business|places|location|profile)\//i
    : /\/(listing|directory|business|places|location|venue|profile)\//i;

  for (const result of allSearchResults) {
    if (!result.url) continue;
    try {
      const parsed = new URL(result.url);
      const hostname = parsed.hostname.replace(/^www\./, "");
      if (BLOCKED_SEARCH_DOMAINS.has(hostname)) continue;
      if (junkPathPattern.test(result.url)) continue;
      const canonical = canonicalUrl(result.url);
      if (seenCanonicals.has(canonical) || existingUrls.has(canonical) || stockistUrls.has(canonical)) continue;
      seenCanonicals.add(canonical);
      candidateUrls.push(result.url);
    } catch { /* skip unparseable URL */ }
  }

  // STEP 3b: fallback if search returned nothing
  if (candidateUrls.length === 0) {
    const fallback = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `You are a sales intelligence assistant. Suggest 12 real, currently-operating ${businessNoun} that would be strong prospects for this brand.

${patternContext}
${productContext}

Rules:
- Only suggest businesses you are confident actually exist and are currently open
- Each must be a specific named business at a specific location — not generic descriptions
- Do NOT include any of these: ${[...excludedNames].slice(0, 30).join(", ")}
- Match the same types, locations, and positioning as the ${trainingNoun} list
${target.region.trim() ? `- Every business must be inside: ${target.region.trim()}` : ""}
${typeList.length > 0 ? `- Every business must be one of: ${typeList.join(", ")}` : ""}

For each, provide: name, location, reason (1-2 sentences referencing a specific ${trainingNoun.slice(0, -1)} pattern).

Return a JSON array. Return ONLY the JSON array.`,
      }],
    });

    let suggestions: Array<{ name: string; location?: string; reason?: string }> = [];
    try {
      const m = textOf(fallback).match(/\[[\s\S]*\]/);
      suggestions = m ? JSON.parse(m[0]) : [];
    } catch { /* leave empty */ }

    let saved = 0;
    for (const s of suggestions) {
      if (!s.name || excludedNames.has(s.name.toLowerCase().trim())) continue;
      // No URL to verify here — the AI only named a business, not a site.
      // Saved as unverified; the admin fills in a URL by hand if they draft it.
      await db.createDiscoverySuggestion({
        targetId, accountType, accountName: s.name, websiteUrl: "", reason: s.reason || "",
        basedOnStrategy: topStrategies[0] || "general", relevanceScore: 50, urlVerified: "unknown", urlSource: "ai_guess",
      });
      saved++;
    }
    return { count: saved, basedOn: topAccounts.length };
  }

  // STEP 4: validate URLs
  const validationResults = await Promise.allSettled(
    candidateUrls.slice(0, 30).map(async (url) => {
      const check = await verifyUrl(url);
      if (check.verified !== "verified") return null;
      const content = await fetchPageContent(url);
      if (!content) return null;
      const validation = isPageContentValid(content);
      if (!validation.valid) return null;
      return { url, content };
    }),
  );
  const validPages: Array<{ url: string; content: string }> = [];
  for (const r of validationResults) if (r.status === "fulfilled" && r.value) validPages.push(r.value);
  if (validPages.length === 0) return { count: 0, basedOn: topAccounts.length };

  // STEP 5: batch AI evaluation
  const stockistExclusionList = stockistsList.map((s) => s.businessName).join(", ");
  const accountExclusionList = allAccounts.map((a) => a.accountName).join(", ");
  const defaultStrategies = isReferralPartner
    ? "boutique_planner, destination_specialist, corporate_events_planner, full_service_coordinator, day_of_coordinator"
    : "wine_bar, bottle_shop, restaurant, cafe, boutique, specialty_food, deli, gift_shop";

  type EvalResult = { pageIndex: number; url: string; businessName: string; relevanceScore: number; strategy: string; reason: string; include: boolean };

  const buildEvalPrompt = (pages: Array<{ url: string; content: string }>, offset: number) => {
    const snippets = pages.map((p, i) => `--- PAGE ${offset + i + 1} ---\nURL: ${p.url}\n${p.content.slice(0, 2000)}`).join("\n\n");
    return `You are evaluating ${businessNoun} websites to find good prospects for a brand.

${patternContext}
${productContext}

Existing ${trainingNoun} (DO NOT include): ${stockistExclusionList}
Existing pipeline accounts (DO NOT include): ${accountExclusionList}

Below are ${pages.length} business website pages found via live web search. For each page, evaluate whether it is a genuine, currently-operating ${businessKind} that matches the ${trainingNoun} patterns above.

For each page return a JSON object with: pageIndex (1-based), url, businessName, relevanceScore (0-100), strategy (use from: ${topStrategies.length > 0 ? topStrategies.join(", ") : defaultStrategies}), reason (1-2 sentences), include (true if relevanceScore >= 40 and not excluded).

Also set include: false if the page does not appear to be a real, operating ${businessKind}, or if the business is outside ${target.region.trim() || "the region implied by the training list"}, or is not one of: ${typeList.length > 0 ? typeList.join(", ") : "the business types implied by the training list"}.

Return a JSON array of objects for ALL ${pages.length} pages. Return ONLY the JSON array.

PAGES TO EVALUATE:

${snippets}`;
  };

  const runEvalBatch = async (pages: Array<{ url: string; content: string }>, offset: number): Promise<EvalResult[]> => {
    try {
      const resp = await anthropic.messages.create({ model: MODEL, max_tokens: 8192, messages: [{ role: "user", content: buildEvalPrompt(pages, offset) }] });
      const m = textOf(resp).match(/\[[\s\S]*\]/);
      const parsed = m ? JSON.parse(m[0]) : [];
      if (parsed.length === 0 && pages.length > 1) {
        const mid = Math.ceil(pages.length / 2);
        return [...(await runEvalBatch(pages.slice(0, mid), offset)), ...(await runEvalBatch(pages.slice(mid), offset + mid))];
      }
      return parsed;
    } catch {
      return [];
    }
  };

  let evaluations: EvalResult[] = [];
  for (let i = 0; i < validPages.length; i += 10) {
    evaluations.push(...(await runEvalBatch(validPages.slice(i, i + 10), i)));
  }
  const passing = evaluations.filter((e) => e.include && e.relevanceScore >= 40 && e.businessName);

  const seenSaveCanonicals = new Set<string>();
  const seenSaveNames = new Set<string>();
  const deduped = passing.filter((e) => {
    const nameKey = e.businessName.toLowerCase().trim();
    const canonical = canonicalUrl(e.url);
    if (excludedNames.has(nameKey) || existingUrls.has(canonical) || seenSaveCanonicals.has(canonical) || seenSaveNames.has(nameKey)) return false;
    seenSaveCanonicals.add(canonical);
    seenSaveNames.add(nameKey);
    return true;
  });

  let savedCount = 0;
  await Promise.allSettled(deduped.map(async (evaluation) => {
    const page = validPages.find((p) => p.url === evaluation.url);
    if (!page) return;
    let emails: string[] = [];
    try { emails = await scanWebsiteForEmails(page.url, page.content); } catch { /* bonus */ }
    await db.createDiscoverySuggestion({
      targetId, accountType, accountName: evaluation.businessName, websiteUrl: page.url, reason: evaluation.reason || "",
      basedOnStrategy: evaluation.strategy || topStrategies[0] || "general",
      relevanceScore: Math.min(100, Math.max(0, evaluation.relevanceScore)), urlVerified: "verified", urlSource: "search", emails,
    });
    savedCount++;
  }));

  return { count: savedCount, basedOn: topAccounts.length };
}

export async function processEnrichmentQueue(limit = 1): Promise<void> {
  const pending = await db.getPendingEnrichments(limit);
  for (const account of pending) {
    try {
      const content = await fetchPageContent(account.websiteUrl, 15000);
      if (!content || content.length < 50) {
        await db.updateAccount(account.id, { enrichment_status: "blocked", error_message: "Insufficient content retrieved from the site." });
        continue;
      }
      await evaluateAccount(account.id, content);
    } catch (error: any) {
      await db.updateAccount(account.id, { enrichment_status: "failed", error_message: error.message });
    }
  }
}
