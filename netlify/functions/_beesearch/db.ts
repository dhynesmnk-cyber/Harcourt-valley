/* ------------------------------------------------------------------ */
/*  BeeSearch data layer — Supabase-backed, single-tenant.             */
/*                                                                      */
/*  Uses the service_role key: these functions only ever run after      */
/*  auth.ts has confirmed the caller holds a real Harcourt Valley admin  */
/*  session, so this is the same trust tier as any other server-side     */
/*  code in this repo (e.g. the admin-login Supabase function) — never    */
/*  reachable from, or shipped to, the browser.                          */
/* ------------------------------------------------------------------ */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function db() {
  if (!url || !serviceKey) {
    throw new Error("BeeSearch isn't configured — missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export type AccountType = "stockist" | "referral_partner";

export interface Stockist {
  id: number;
  kind: AccountType;
  targetId: string | null;
  businessName: string;
  websiteUrl: string | null;
  location: string | null;
  category: string | null;
  createdAt: string;
}

export interface Account {
  id: number;
  accountName: string;
  websiteUrl: string;
  accountType: AccountType;
  primaryLanguage: string;
  pipelineStage: string;
  enrichmentStatus: string | null;
  enrichedContent: string | null;
  enrichedContentWordCount: number | null;
  scoringConfidence: string | null;
  brandAlignment: number | null;
  valueAlignment: number | null;
  demographicResonance: number | null;
  salesOpportunity: number | null;
  purchasingSize: number | null;
  communityGravity: number | null;
  merchandisingReadiness: number | null;
  venueAffinity: number | null;
  guestSizeFit: number | null;
  bookingVolume: number | null;
  referralReadiness: number | null;
  styleAlignment: number | null;
  compositeScore: number | null;
  recommendedStrategy: string | null;
  discoverySource: string | null;
  emails: string[] | null;
  finalPitch: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface DiscoverySuggestion {
  id: number;
  targetId: string | null;
  accountType: AccountType;
  accountName: string;
  websiteUrl: string;
  reason: string;
  basedOnStrategy: string;
  relevanceScore: number;
  status: "pending" | "added" | "dismissed";
  urlVerified: string;
  urlSource: string | null;
  emails: string[] | null;
  dismissReason: string | null;
  createdAt: string;
}

export interface PromptSettings {
  companyName: string;
  senderName: string;
  productDescription: string;
  pitchTone: string;
  customRules: string;
  additionalContext: string;
  brandWebsiteUrl: string;
  brandProfile: string;
}

const toStockist = (r: any): Stockist => ({
  id: r.id, kind: r.kind, targetId: r.target_id ?? null, businessName: r.business_name, websiteUrl: r.website_url,
  location: r.location, category: r.category, createdAt: r.created_at,
});

const toAccount = (r: any): Account => ({
  id: r.id, accountName: r.account_name, websiteUrl: r.website_url, accountType: r.account_type,
  primaryLanguage: r.primary_language, pipelineStage: r.pipeline_stage, enrichmentStatus: r.enrichment_status,
  enrichedContent: r.enriched_content, enrichedContentWordCount: r.enriched_content_word_count,
  scoringConfidence: r.scoring_confidence, brandAlignment: r.brand_alignment, valueAlignment: r.value_alignment,
  demographicResonance: r.demographic_resonance, salesOpportunity: r.sales_opportunity, purchasingSize: r.purchasing_size,
  communityGravity: r.community_gravity, merchandisingReadiness: r.merchandising_readiness,
  venueAffinity: r.venue_affinity, guestSizeFit: r.guest_size_fit, bookingVolume: r.booking_volume,
  referralReadiness: r.referral_readiness, styleAlignment: r.style_alignment,
  compositeScore: r.composite_score, recommendedStrategy: r.recommended_strategy, discoverySource: r.discovery_source,
  emails: r.emails, finalPitch: r.final_pitch, errorMessage: r.error_message, createdAt: r.created_at,
});

const toSuggestion = (r: any): DiscoverySuggestion => ({
  id: r.id, targetId: r.target_id ?? null, accountType: r.account_type, accountName: r.account_name, websiteUrl: r.website_url,
  reason: r.reason, basedOnStrategy: r.based_on_strategy, relevanceScore: r.relevance_score, status: r.status,
  urlVerified: r.url_verified, urlSource: r.url_source, emails: r.emails, dismissReason: r.dismiss_reason,
  createdAt: r.created_at,
});

/** Training accounts for one target. Falls back to the whole rubric when no
 *  target is given, which is only how pre-target rows are reached. */
export async function getStockists(kind: AccountType, targetId?: string | null): Promise<Stockist[]> {
  let q = db().from("beesearch_stockists").select("*").eq("kind", kind);
  if (targetId) q = q.eq("target_id", targetId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toStockist);
}

export async function getStockistCount(kind: AccountType, targetId?: string | null): Promise<number> {
  let q = db().from("beesearch_stockists").select("id", { count: "exact", head: true }).eq("kind", kind);
  if (targetId) q = q.eq("target_id", targetId);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createStockist(input: { businessName: string; websiteUrl?: string | null; location?: string | null; category?: string | null; kind: AccountType; targetId?: string | null }): Promise<Stockist> {
  const { data, error } = await db().from("beesearch_stockists").insert({
    business_name: input.businessName, website_url: input.websiteUrl ?? null,
    location: input.location ?? null, category: input.category ?? null, kind: input.kind,
    target_id: input.targetId ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return toStockist(data);
}

/** Used to check a training row belongs to the target before removing it. */
export async function getStockist(id: number): Promise<Stockist | undefined> {
  const { data, error } = await db().from("beesearch_stockists").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toStockist(data) : undefined;
}

/** Removing a target takes its training list with it — that data is only
 *  meaningful in the context of the target it was taught for. */
export async function deleteStockistsForTarget(targetId: string): Promise<void> {
  const { error } = await db().from("beesearch_stockists").delete().eq("target_id", targetId);
  if (error) throw new Error(error.message);
}

export async function deleteStockist(id: number): Promise<void> {
  const { error } = await db().from("beesearch_stockists").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await db().from("beesearch_accounts").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toAccount);
}

export async function getAccount(id: number): Promise<Account | undefined> {
  const { data, error } = await db().from("beesearch_accounts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toAccount(data) : undefined;
}

export async function getAccountByUrl(websiteUrl: string): Promise<Account | undefined> {
  const { data, error } = await db().from("beesearch_accounts").select("*").eq("website_url", websiteUrl).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toAccount(data) : undefined;
}

export async function createAccount(input: { accountName: string; websiteUrl: string; accountType: AccountType; discoverySource?: string; targetId?: string | null }): Promise<Account> {
  const { data, error } = await db().from("beesearch_accounts").insert({
    account_name: input.accountName, website_url: input.websiteUrl, account_type: input.accountType,
    target_id: input.targetId ?? null,
    discovery_source: input.discoverySource ?? "manual", pipeline_stage: "pending", enrichment_status: "pending", primary_language: "en",
  }).select().single();
  if (error) throw new Error(error.message);
  return toAccount(data);
}

export async function updateAccount(id: number, patch: Record<string, unknown>): Promise<Account> {
  const { data, error } = await db().from("beesearch_accounts").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return toAccount(data);
}

export async function getTopAccountsByScore(accountType: AccountType, limit: number): Promise<Account[]> {
  const threshold = accountType === "referral_partner" ? 25 : 35;
  const { data, error } = await db().from("beesearch_accounts").select("*")
    .eq("account_type", accountType).eq("enrichment_status", "completed").gte("composite_score", threshold)
    .order("composite_score", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toAccount);
}

export async function getPendingEnrichments(limit: number): Promise<Account[]> {
  const { data, error } = await db().from("beesearch_accounts").select("*").eq("enrichment_status", "pending").limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toAccount);
}

export async function getDiscoverySuggestions(accountType: AccountType, targetId?: string | null): Promise<DiscoverySuggestion[]> {
  let q = db().from("beesearch_discovery_suggestions").select("*").eq("account_type", accountType);
  if (targetId) q = q.eq("target_id", targetId);
  const { data, error } = await q.order("relevance_score", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSuggestion);
}

export async function getSuggestion(id: number): Promise<DiscoverySuggestion | undefined> {
  const { data, error } = await db().from("beesearch_discovery_suggestions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSuggestion(data) : undefined;
}

export async function getDismissedSuggestions(accountType: AccountType, targetId?: string | null): Promise<DiscoverySuggestion[]> {
  let q = db().from("beesearch_discovery_suggestions").select("*").eq("account_type", accountType).eq("status", "dismissed");
  if (targetId) q = q.eq("target_id", targetId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSuggestion);
}

export async function createDiscoverySuggestion(input: {
  accountType: AccountType; accountName: string; websiteUrl: string; reason: string; basedOnStrategy: string;
  relevanceScore: number; urlVerified: string; urlSource?: string; emails?: string[]; targetId?: string | null;
}): Promise<void> {
  const { error } = await db().from("beesearch_discovery_suggestions").insert({
    target_id: input.targetId ?? null,
    account_type: input.accountType, account_name: input.accountName, website_url: input.websiteUrl,
    reason: input.reason, based_on_strategy: input.basedOnStrategy, relevance_score: input.relevanceScore,
    status: "pending", url_verified: input.urlVerified, url_source: input.urlSource ?? null,
    emails: input.emails && input.emails.length > 0 ? input.emails : null,
  });
  if (error) throw new Error(error.message);
}

export async function updateSuggestion(id: number, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db().from("beesearch_discovery_suggestions").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Clears the last run's results before a new one. MUST be scoped to the
 *  target: several targets can share a rubric, and without the target filter a
 *  run on one of them wipes the fresh results of every other. */
export async function clearPendingDiscoverySuggestions(accountType: AccountType, targetId?: string | null): Promise<void> {
  let q = db().from("beesearch_discovery_suggestions").delete().eq("account_type", accountType).neq("status", "dismissed");
  if (targetId) q = q.eq("target_id", targetId);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function getPromptSettings(): Promise<PromptSettings | undefined> {
  const { data, error } = await db().from("beesearch_prompt_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return {
    companyName: data.company_name, senderName: data.sender_name, productDescription: data.product_description,
    pitchTone: data.pitch_tone, customRules: data.custom_rules, additionalContext: data.additional_context,
    brandWebsiteUrl: data.brand_website_url, brandProfile: data.brand_profile,
  };
}

export async function getPitchCountByStrategy(strategy: string): Promise<number> {
  const { count, error } = await db().from("beesearch_pitch_library").select("id", { count: "exact", head: true }).eq("primary_strategy_tag", strategy);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getPitchesByStrategy(strategy: string, limit: number): Promise<{ finalEmailText: string }[]> {
  const { data, error } = await db().from("beesearch_pitch_library").select("final_email_text")
    .eq("primary_strategy_tag", strategy).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ finalEmailText: r.final_email_text }));
}

export async function createPitchLibraryEntry(accountId: number, finalEmailText: string, primaryStrategyTag: string): Promise<void> {
  const { error } = await db().from("beesearch_pitch_library").insert({
    account_id: accountId, final_email_text: finalEmailText, primary_strategy_tag: primaryStrategyTag,
  });
  if (error) throw new Error(error.message);
}

/* ---------------- discovery runs ---------------- */

/**
 * Discovery runs for minutes inside a background function, which has no way to
 * answer the caller — it already got its 202. Without a record of the attempt,
 * a genuine failure (no search results, an Anthropic error, a target under the
 * training minimum) is indistinguishable from "still working", and the only
 * thing the UI can do is time out and shrug. These rows are what let it say
 * what actually went wrong.
 */
export interface DiscoveryRun {
  id: number;
  targetId: string | null;
  status: "running" | "done" | "failed";
  error: string | null;
  found: number;
  startedAt: string;
  finishedAt: string | null;
}

const toRun = (r: any): DiscoveryRun => ({
  id: r.id, targetId: r.target_id ?? null, status: r.status,
  error: r.error ?? null, found: r.found ?? 0,
  startedAt: r.started_at, finishedAt: r.finished_at ?? null,
});

export async function startDiscoveryRun(targetId: string | null, accountType: AccountType): Promise<number> {
  const { data, error } = await db().from("beesearch_discovery_runs")
    .insert({ target_id: targetId, account_type: accountType, status: "running" })
    .select("id").single();
  if (error) throw new Error(error.message);
  return data.id as number;
}

export async function finishDiscoveryRun(id: number, patch: { status: "done" | "failed"; error?: string | null; found?: number }): Promise<void> {
  const { error } = await db().from("beesearch_discovery_runs").update({
    status: patch.status, error: patch.error ?? null, found: patch.found ?? 0, finished_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getLatestDiscoveryRun(targetId: string | null): Promise<DiscoveryRun | undefined> {
  let q = db().from("beesearch_discovery_runs").select("*");
  q = targetId ? q.eq("target_id", targetId) : q.is("target_id", null);
  const { data, error } = await q.order("started_at", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? toRun(data[0]) : undefined;
}
