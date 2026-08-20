import React, { useEffect, useState } from "react";
import { fmtDate, timeAgo, type BeeSearchProfile, type OutboxItem } from "../../lib/data";
import { useStore } from "../../lib/store";
import { ArrowRight, CloseIcon, FactGrid, PlusIcon, SearchIcon, SendIcon, Tick } from "../../components/ui";
import {
  checkEngineAvailable,
  listStockists,
  addStockist,
  removeStockist,
  runDiscovery,
  listDiscoverySuggestions,
  addSuggestionAsAccount,
  waitForEnrichment,
  generatePitch,
  splitPitch,
  type BeeSearchStockist,
} from "../../lib/beesearchEngine";
import type { Tab } from "./Admin";

interface Suggestion {
  business: string;
  contact: string;
  town: string;
  /** Present only for a suggestion sourced from the live engine. */
  discoveryId?: number;
  reason?: string;
  relevanceScore?: number;
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  bp1: [
    { business: "Rangeview Cellars", contact: "Owen", town: "Kyneton" },
    { business: "The Post Office Bar", contact: "Priya", town: "Daylesford" },
    { business: "Maldon Bottle Shop", contact: "Geoff", town: "Maldon" },
  ],
  bp2: [
    { business: "Aisle & Oak Planning", contact: "Grace", town: "Bendigo" },
    { business: "Gather Events Co.", contact: "Mitch", town: "Ballarat" },
    { business: "Northstar Retreats", contact: "Eve", town: "Melbourne" },
  ],
};

function draftCopy(profileId: string, s: Suggestion): { subject: string; body: string } {
  if (profileId === "bp2") {
    return {
      subject: `A vineyard your couples haven't seen yet`,
      body: `Hi ${s.contact} — quick one. Harcourt Valley is a working vineyard 30 minutes from Bendigo: ceremony in the vines, dinner in the old shearing shed, up to 120 guests. We host one wedding a day, ever, and the ballparks are published — no pricing games.\n\nIf you have couples circling ${s.town} and surrounds, I'd love to show you around. Tasting's on us.\n\n— Tom`,
    };
  }
  return {
    subject: `A Shiraz for ${s.business}'s top shelf?`,
    body: `Hi ${s.contact} — we're Harcourt Valley Vineyards, Bendigo's most-awarded winery (500+ medals, if the cabinet's to be believed). Our Granite Face Shiraz is pouring well at shops your size around the region, and it's margin-friendly at your by-the-glass price point.\n\nI'm through ${s.town} next week — happy to drop a sample by. Worth ten minutes?\n\n— Tom`,
  };
}

/* The engine's discovery matrix scores brand/purchasing/merchandising fit — a shape
 * built for retail stockists, not wedding planners. "Regional stockists" maps
 * onto Harcourt's own trade orders (real businesses already on the books), so
 * that's the one profile wired to the live engine. "Wedding & event planners"
 * has no equivalent structured list in this app, and seeding one with guesses
 * would be worse than the demo data it already shows — so it stays on that. */
const LIVE_DISCOVERY_PROFILE_ID = "bp1";
const MIN_STOCKISTS_FOR_DISCOVERY = 5;

/* ---------------- transparency panel ---------------- */

function HowItWorks({ engineConnected }: { engineConnected: boolean | null }) {
  return (
    <div className="mt-6 border-2 border-granite-300 bg-granite-100/40 p-5 sm:p-6">
      <p className="kicker text-granite-500">How BeeSearch actually works</p>
      <ul className="mt-3 space-y-2 text-sm text-granite-700 leading-relaxed">
        <li>
          <span className="font-label font-semibold text-granite-900">It reads your own bookings.</span> "Teach it from your bookings"
          looks at leads you've marked Booked — nothing else — to work out the guest counts and event shapes that already say yes to you.
        </li>
        {engineConnected ? (
          <li>
            <span className="font-label font-semibold text-granite-900">Regional stockists uses a real, live search.</span> It learns
            from a training list of stockists you keep (seeded from your actual trade accounts), then searches for similar businesses,
            visits each one's own website to score the fit, and drafts the email itself. That's genuinely happening, not simulated.
          </li>
        ) : (
          <li>
            <span className="font-label font-semibold text-granite-900">The live engine isn't reachable right now.</span> Every
            suggestion you see is a small, fixed demo sample kept in the code, clearly marked as such — not a live search.
          </li>
        )}
        <li>
          <span className="font-label font-semibold text-granite-900">Wedding & event planners stays on demo data, on purpose.</span> The
          live engine's matching is built for retail stockists (brand fit, purchasing patterns), not event planners — there's no
          equivalent structured search for that yet, so guessing would be worse than being upfront that it's a sample.
        </li>
        <li>
          <span className="font-label font-semibold text-granite-900">Every match shows its reasons.</span> A live suggestion carries the
          engine's actual reason and relevance score; a converted account's composite score and recommended strategy carry through to the
          outbox too — nothing here is a hidden number.
        </li>
        <li>
          <span className="font-label font-semibold text-granite-900">Nothing leaves on its own.</span> Draft → Approve → Send is two
          separate presses, both yours. A reply gets logged by you, and converting one to an enquiry is one more press, whenever you're
          ready.
        </li>
      </ul>
    </div>
  );
}

export function BeeSearchView({ go, openLead }: { go?: (t: Tab) => void; openLead?: (id: string) => void }) {
  const { profiles, addProfile, addOutbox, outbox, setOutboxState, convertOutboxToLead, leads, tradeOrders, toast } = useStore();
  const [newName, setNewName] = useState("");
  const [newWho, setNewWho] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [results, setResults] = useState<{ criteria: string[]; suggestions: Suggestion[]; profileName: string; live: boolean } | null>(null);
  const [review, setReview] = useState<OutboxItem | null>(null);
  const [engineConnected, setEngineConnected] = useState<boolean | null>(null);
  const [findingProfileId, setFindingProfileId] = useState<string | null>(null);
  const [writingKey, setWritingKey] = useState<string | null>(null);
  const [stockists, setStockists] = useState<BeeSearchStockist[]>([]);
  const [stockistsLoaded, setStockistsLoaded] = useState(false);
  const [newStockistName, setNewStockistName] = useState("");
  const [stockistErr, setStockistErr] = useState("");
  const [addingStockist, setAddingStockist] = useState(false);
  const [removingStockistId, setRemovingStockistId] = useState<number | null>(null);
  const [seedingFromTrade, setSeedingFromTrade] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkEngineAvailable().then((ok) => {
      if (!cancelled) setEngineConnected(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshStockists = async () => {
    const list = await listStockists();
    setStockists(list);
    setStockistsLoaded(true);
  };

  useEffect(() => {
    if (engineConnected) void refreshStockists();
  }, [engineConnected]);

  const booked = leads.filter((l) => l.status === "booked");

  const runAnalysis = () => {
    setAnalyzing(true);
    setResults(null);
    setAnalysisStage(0);
    const stages = [500, 1100, 1700];
    stages.forEach((ms, i) => window.setTimeout(() => setAnalysisStage(i + 1), ms));
    window.setTimeout(() => {
      const weddings = booked.filter((l) => l.type === "wedding").length;
      const guests = booked.map((l) => l.guestCount ?? 0).filter((g) => g > 0);
      const lo = guests.length ? Math.min(...guests) : 60;
      const hi = guests.length ? Math.max(...guests) : 120;
      setResults({
        profileName: "Based on your best bookings",
        criteria: [
          `${booked.length} bookings to learn from (${weddings} weddings)`,
          `Guest counts between ${lo} and ${hi}`,
          "Regional Victoria, within a 90-minute drive",
        ],
        live: false,
        suggestions: SUGGESTIONS.bp2,
      });
      setAnalyzing(false);
    }, 2100);
  };

  const addCustomProfile = () => {
    if (newName.trim().length < 2 || newWho.trim().length < 5) {
      setProfileErr("Give the target a name and a sentence about who it's for.");
      return;
    }
    setProfileErr("");
    addProfile({ name: newName.trim(), who: newWho.trim(), criteria: ["Custom target — criteria to refine together"] });
    toast(`Target "${newName.trim()}" added.`);
    setNewName("");
    setNewWho("");
  };

  /** Adds Harcourt's own trade orders as stockists — real businesses already
   *  on the books, not fabricated ones — up to `cap` new additions, or all of
   *  them if `cap` is omitted. Used both to auto-train enough for discovery to
   *  run at all, and by the explicit "Seed from my trade accounts" button. */
  const seedStockistsFromTradeOrders = async (cap?: number): Promise<{ added: number; count: number }> => {
    const existing = await listStockists();
    const known = new Set(existing.map((s) => s.businessName.toLowerCase()));
    let added = 0;
    for (const t of tradeOrders) {
      if (cap != null && known.size >= cap) break;
      if (known.has(t.business.toLowerCase())) continue;
      const result = await addStockist({ businessName: t.business });
      if (result) {
        known.add(t.business.toLowerCase());
        added++;
      }
    }
    return { added, count: known.size };
  };

  /** Makes sure the engine has enough training data before discovery can run. */
  const ensureStockistsTrained = async (): Promise<{ trained: boolean; added: number }> => {
    const { added, count } = await seedStockistsFromTradeOrders(MIN_STOCKISTS_FOR_DISCOVERY);
    return { trained: count >= MIN_STOCKISTS_FOR_DISCOVERY, added };
  };

  const handleAddStockist = async () => {
    const name = newStockistName.trim();
    if (name.length < 2) {
      setStockistErr("Give it a business name.");
      return;
    }
    setStockistErr("");
    setAddingStockist(true);
    try {
      const created = await addStockist({ businessName: name });
      if (!created) {
        toast("Couldn't add that stockist — try again shortly.");
        return;
      }
      setStockists((prev) => [created, ...prev]);
      setNewStockistName("");
      toast(`Added ${created.businessName} to the training list.`);
    } finally {
      setAddingStockist(false);
    }
  };

  const handleRemoveStockist = async (s: BeeSearchStockist) => {
    setRemovingStockistId(s.id);
    try {
      const ok = await removeStockist(s.id);
      if (!ok) {
        toast(`Couldn't remove ${s.businessName} — try again shortly.`);
        return;
      }
      setStockists((prev) => prev.filter((x) => x.id !== s.id));
      toast(`Removed ${s.businessName} from the training list.`);
    } finally {
      setRemovingStockistId(null);
    }
  };

  const handleSeedFromTrade = async () => {
    setSeedingFromTrade(true);
    try {
      const { added } = await seedStockistsFromTradeOrders();
      await refreshStockists();
      toast(added > 0 ? `Added ${added} trade account${added === 1 ? "" : "s"} to the training list.` : "Every trade account is already in the training list.");
    } catch {
      toast("Couldn't reach BeeSearch — try again shortly.");
    } finally {
      setSeedingFromTrade(false);
    }
  };

  const findMatchesLive = async (profile: BeeSearchProfile) => {
    setFindingProfileId(profile.id);
    setResults(null);
    try {
      const { trained, added } = await ensureStockistsTrained();
      if (added > 0) {
        await refreshStockists();
        toast(`Trained BeeSearch on ${added} of your existing trade accounts.`);
      }
      if (!trained) {
        toast(`BeeSearch needs at least ${MIN_STOCKISTS_FOR_DISCOVERY} stockists to learn from — add more in Stockist Training first.`);
        return;
      }

      const discovery = await runDiscovery(`Find businesses similar to: ${profile.who}`);
      if (!discovery.ok) {
        toast(discovery.error);
        return;
      }

      const suggestions = await listDiscoverySuggestions();
      const pending = suggestions.filter((s) => s.status === "pending");
      if (pending.length === 0) {
        toast("BeeSearch didn't turn up any new matches this time — try again shortly, or add more stockists to learn from.");
        return;
      }

      setResults({
        profileName: `Matches for "${profile.name}"`,
        criteria: profile.criteria,
        live: true,
        suggestions: pending.map((s) => ({
          business: s.accountName,
          contact: "",
          town: "",
          discoveryId: s.id,
          reason: s.reason,
          relevanceScore: s.relevanceScore,
        })),
      });
    } catch {
      toast("BeeSearch couldn't complete the search — try again shortly.");
    } finally {
      setFindingProfileId(null);
    }
  };

  const findMatches = (profile: BeeSearchProfile) => {
    if (engineConnected && profile.id === LIVE_DISCOVERY_PROFILE_ID) {
      void findMatchesLive(profile);
      return;
    }
    setResults({
      profileName: `Matches for "${profile.name}"`,
      criteria: profile.criteria,
      live: false,
      suggestions: SUGGESTIONS[profile.id] ?? SUGGESTIONS.bp1,
    });
  };

  const generateDraftLive = async (s: Suggestion) => {
    if (s.discoveryId == null) return;
    const key = `live-${s.discoveryId}`;
    setWritingKey(key);
    try {
      const added = await addSuggestionAsAccount(s.discoveryId);
      if (!added.ok) {
        toast(added.error);
        return;
      }
      const account = await waitForEnrichment(added.account.id);
      if (!account || account.enrichmentStatus !== "completed") {
        toast(`BeeSearch couldn't read ${s.business}'s website in time. Try again shortly, or add their details by hand.`);
        return;
      }
      const pitch = await generatePitch(account.id);
      if (!pitch.ok) {
        toast(pitch.error);
        return;
      }
      const { subject, body } = splitPitch(pitch.pitch, `A note for ${s.business}`);
      addOutbox([{
        business: s.business, contact: "", subject, body,
        matchedOn: s.reason, compositeScore: account.compositeScore, recommendedStrategy: account.recommendedStrategy,
      }]);
      toast(
        account.compositeScore != null
          ? `Draft written for ${s.business} — fit score ${Math.round(account.compositeScore)}. It's in the outbox, waiting for you.`
          : `Draft written for ${s.business} — it's in the outbox, waiting for you.`,
      );
    } catch {
      toast(`Something went wrong writing to ${s.business} — try again shortly.`);
    } finally {
      setWritingKey(null);
    }
  };

  const generateDraft = (profileId: string, s: Suggestion) => {
    if (s.discoveryId != null) {
      void generateDraftLive(s);
      return;
    }
    const copy = draftCopy(profileId, s);
    addOutbox([{ business: s.business, contact: s.contact, matchedOn: s.reason, ...copy }]);
    toast(`Draft written for ${s.business} — it's in the outbox, waiting for you.`);
  };

  const convert = (o: OutboxItem) => {
    const lead = convertOutboxToLead(o.id);
    if (!lead) return;
    setReview(null);
    toast(`${o.business} is now an enquiry in the pipeline.`);
    if (openLead && go) openLead(lead.id);
  };

  const active = outbox.filter((o) => o.state === "draft" || o.state === "approved" || o.state === "sent" || o.state === "replied");
  const closed = outbox.filter((o) => o.state === "declined" || o.state === "converted");

  const grouped = {
    draft: active.filter((o) => o.state === "draft"),
    approved: active.filter((o) => o.state === "approved"),
    sent: active.filter((o) => o.state === "sent"),
    replied: active.filter((o) => o.state === "replied"),
  };

  const sentCount = outbox.filter((o) => o.sentAt !== null).length;
  const loggedCount = outbox.filter((o) => o.state === "replied" || o.state === "declined" || o.state === "converted").length;
  const convertedCount = outbox.filter((o) => o.state === "converted").length;

  const facts = [
    { label: "Stockists trained", value: stockistsLoaded ? String(stockists.length) : "—", detail: `${MIN_STOCKISTS_FOR_DISCOVERY} needed for live discovery` },
    { label: "In the outbox", value: String(grouped.draft.length + grouped.approved.length), detail: `${grouped.draft.length} draft · ${grouped.approved.length} approved` },
    { label: "Sent", value: String(sentCount), detail: sentCount === 0 ? "None yet" : "Emails that have gone out" },
    { label: "Reply rate", value: sentCount ? `${Math.round((loggedCount / sentCount) * 100)}%` : "—", detail: sentCount ? `${loggedCount} of ${sentCount} logged` : "Send some to start tracking" },
    { label: "Converted to enquiries", value: String(convertedCount), detail: "Now tracked in the pipeline" },
  ] as const;

  return (
    <div>
      <p className="kicker text-granite-500">Outreach · BeeSearch</p>
      <div className="flex flex-wrap items-center gap-3 mt-1.5">
        <h1 className="font-display text-3xl sm:text-4xl font-medium">Go and find the next ones.</h1>
        {engineConnected === true ? (
          <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-label font-semibold uppercase tracking-[0.06em] border border-ochre text-ochre px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ochre" /> Live engine connected
          </span>
        ) : engineConnected === false ? (
          <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-label font-semibold uppercase tracking-[0.06em] border border-granite-300 text-granite-500 px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-granite-300" /> Demo data — engine not connected
          </span>
        ) : null}
      </div>
      <p className="text-sm text-granite-500 mt-2 max-w-2xl">
        BeeSearch looks for businesses like your best customers and writes the first email in the family voice. Nothing sends without you
        pressing Approve, then Send. Two presses, on purpose.
      </p>

      <HowItWorks engineConnected={engineConnected} />

      <div className="mt-8">
        <FactGrid facts={facts} />
      </div>

      {/* Seed from best customers */}
      <div className="mt-8 border-2 border-granite-900 bg-granite-900 text-bone p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <p className="kicker text-granite-300">Find leads like my best customers</p>
            <p className="font-display text-2xl font-medium mt-1.5">Teach it from your bookings.</p>
          </div>
          <button type="button" className="btn bg-bone text-granite-900" onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? "Thinking…" : "Run the analysis"}
            {!analyzing ? <ArrowRight className="w-4 h-4" /> : null}
          </button>
        </div>
        {analyzing ? (
          <ul className="mt-5 space-y-2 text-sm text-granite-300" aria-live="polite">
            {["Reading your last bookings and enquiries…", "Finding the pattern in who said yes…", "Matching businesses nearby…"].map((s, i) => (
              <li key={s} className={`flex items-center gap-3 transition-opacity ${analysisStage > i ? "opacity-100" : "opacity-30"}`}>
                <span className={`w-2 h-2 ${analysisStage > i ? "bg-ochre" : "bg-granite-500"}`} /> {s}
              </li>
            ))}
          </ul>
        ) : null}
        {results ? (
          <div className="mt-6 rise-in">
            <p className="kicker text-granite-300">
              {results.profileName}
              {results.live ? <span className="text-ochre"> · live matches</span> : <span className="text-granite-500"> · demo sample</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {results.criteria.map((c) => (
                <span key={c} className="border border-granite-500 px-3 py-1.5 text-xs font-label font-semibold">
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {results.suggestions.map((s) => {
                const key = s.discoveryId != null ? `live-${s.discoveryId}` : s.business;
                const writing = writingKey === key;
                return (
                  <div key={key} className="border border-granite-500 p-4 bg-granite-700/40">
                    <p className="font-label font-semibold text-sm">{s.business}</p>
                    <p className="text-xs text-granite-300 mt-0.5">{s.reason ? s.reason : `${s.town} · ask for ${s.contact}`}</p>
                    {s.relevanceScore != null ? (
                      <p className="text-[0.68rem] text-ochre mt-1 font-label font-semibold">Relevance {Math.round(s.relevanceScore)}</p>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-sm bg-bone text-granite-900 mt-3 w-full disabled:opacity-60"
                      disabled={writing}
                      onClick={() => generateDraft("bp2", s)}
                    >
                      {writing ? "Writing…" : "Write the email"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Stockist training */}
      {engineConnected ? (
        <div className="mt-8 border-2 border-granite-900 bg-bone p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div>
              <p className="kicker text-granite-500">Stockist training</p>
              <p className="font-display text-2xl font-medium mt-1.5">What BeeSearch learns from.</p>
              <p className="text-sm text-granite-500 mt-1.5 max-w-xl">
                Discovery for Regional stockists needs at least {MIN_STOCKISTS_FOR_DISCOVERY} of these to learn from — you have {stockistsLoaded ? stockists.length : "…"}.
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm disabled:opacity-60" onClick={handleSeedFromTrade} disabled={seedingFromTrade}>
              {seedingFromTrade ? "Adding…" : "Seed from my trade accounts"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {stockists.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 border border-granite-300 pl-3 pr-1.5 py-1 text-xs font-label font-semibold text-granite-700">
                {s.businessName}
                <button
                  type="button"
                  aria-label={`Remove ${s.businessName}`}
                  className="text-granite-400 hover:text-granite-900 disabled:opacity-40"
                  disabled={removingStockistId === s.id}
                  onClick={() => handleRemoveStockist(s)}
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            {stockistsLoaded && stockists.length === 0 ? (
              <p className="text-xs text-granite-500">None yet — add one below, or seed from your trade accounts.</p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-start gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="sr-only" htmlFor="stockist-name">
                Business name
              </label>
              <input
                id="stockist-name"
                className="field-input"
                placeholder="e.g. The Local Cellar"
                value={newStockistName}
                onChange={(e) => setNewStockistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddStockist();
                }}
              />
              {stockistErr ? <p className="field-error mt-1">{stockistErr}</p> : null}
            </div>
            <button type="button" className="btn btn-dark btn-sm disabled:opacity-60" onClick={handleAddStockist} disabled={addingStockist}>
              <PlusIcon className="w-3.5 h-3.5" /> {addingStockist ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Target profiles */}
      <div className="mt-8">
        <p className="kicker text-granite-500">Who we're looking for</p>
        <div className="mt-3 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <div key={p.id} className="border-2 border-granite-900 bg-bone p-5">
              <p className="font-display text-xl font-medium">{p.name}</p>
              <p className="text-sm text-granite-700 mt-1.5 leading-relaxed">{p.who}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.criteria.map((c) => (
                  <span key={c} className="text-[0.66rem] font-label font-semibold uppercase tracking-[0.06em] border border-granite-300 px-2 py-1 text-granite-700">
                    {c}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-4 disabled:opacity-60"
                disabled={findingProfileId === p.id}
                onClick={() => findMatches(p)}
              >
                <SearchIcon className="w-3.5 h-3.5" /> {findingProfileId === p.id ? "Searching…" : "Find matches"}
              </button>
            </div>
          ))}
          <div className="border-2 border-dashed border-granite-300 p-5">
            <p className="kicker text-granite-500">Add a target</p>
            <div className="mt-3 space-y-2.5">
              <label className="sr-only" htmlFor="np-name">
                Target name
              </label>
              <input id="np-name" className="field-input" placeholder="e.g. Festival organisers" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <label className="sr-only" htmlFor="np-who">
                Who it's for
              </label>
              <input id="np-who" className="field-input" placeholder="One sentence: who are they?" value={newWho} onChange={(e) => setNewWho(e.target.value)} />
              {profileErr ? <p className="field-error">{profileErr}</p> : null}
              <button type="button" className="btn btn-dark btn-sm w-full" onClick={addCustomProfile}>
                <PlusIcon className="w-3.5 h-3.5" /> Add this target
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Outbox */}
      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="kicker text-granite-500">The outbox</p>
            <h2 className="font-display text-2xl font-medium mt-1">Draft → Approved → Sent → Replied. You hold every key.</h2>
          </div>
          <p className="text-xs text-granite-500">Nothing leaves the building on its own.</p>
        </div>
        <div className="mt-5 grid lg:grid-cols-4 gap-5 items-start">
          {(
            [
              { key: "draft", label: "Drafts", hint: "Written by BeeSearch, waiting for your read." },
              { key: "approved", label: "Approved", hint: "You've read it. Send when you're ready." },
              { key: "sent", label: "Sent", hint: "Out the door. Log what happens next." },
              { key: "replied", label: "Replied", hint: "They wrote back. Convert when you're ready." },
            ] as const
          ).map((col) => (
            <div key={col.key} className="border-2 border-granite-900 bg-granite-100/60">
              <div className="px-4 py-3 border-b-2 border-granite-900 bg-bone">
                <p className="font-label font-semibold text-[0.82rem]">
                  {col.label} <span className="text-granite-500">· {grouped[col.key].length}</span>
                </p>
                <p className="text-[0.7rem] text-granite-500 mt-0.5">{col.hint}</p>
              </div>
              <div className="p-3 space-y-3 min-h-[120px]">
                {grouped[col.key].length === 0 ? <p className="text-xs text-granite-500 text-center pt-6">Empty for now.</p> : null}
                {grouped[col.key].map((o) => (
                  <article key={o.id} className="kb-card bg-bone border-2 border-granite-900 p-4">
                    <p className="font-label font-semibold text-sm">{o.business}</p>
                    <p className="text-xs text-granite-500 mt-0.5">
                      To {o.contact || "—"} · {fmtDate(o.updatedAt.slice(0, 10))}
                    </p>
                    {o.compositeScore != null ? (
                      <p className="text-[0.68rem] text-garnet mt-1 font-label font-semibold">Fit score {Math.round(o.compositeScore)}</p>
                    ) : null}
                    <p className="text-sm mt-2 line-clamp-2 text-granite-700">{o.subject}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="btn btn-sm btn-ghost flex-1" onClick={() => setReview(o)}>
                        Read it
                      </button>
                      {o.state === "draft" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-dark flex-1"
                          onClick={() => {
                            setOutboxState(o.id, "approved");
                            toast(`Approved. Press Send when you're ready.`);
                          }}
                        >
                          Approve
                        </button>
                      ) : null}
                      {o.state === "approved" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary flex-1"
                          onClick={() => {
                            setOutboxState(o.id, "sent");
                            toast(`Sent to ${o.business}. Reply-watch is on you now.`);
                          }}
                        >
                          <SendIcon className="w-3.5 h-3.5" /> Send now
                        </button>
                      ) : null}
                      {o.state === "sent" ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary flex-1"
                            onClick={() => {
                              setOutboxState(o.id, "replied");
                              toast(`Marked as replied. Convert it whenever you're ready.`);
                            }}
                          >
                            They replied
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost flex-1"
                            onClick={() => {
                              setOutboxState(o.id, "declined");
                              toast(`Marked declined. It's tucked away in Closed out.`);
                            }}
                          >
                            No thanks
                          </button>
                        </>
                      ) : null}
                      {o.state === "replied" ? (
                        <button type="button" className="btn btn-sm btn-primary flex-1" onClick={() => convert(o)}>
                          <Tick className="w-3.5 h-3.5" /> Convert to enquiry
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>

        {closed.length > 0 ? (
          <div className="mt-5">
            <button
              type="button"
              className="text-xs font-label font-semibold text-granite-600 hover:text-granite-900 inline-flex items-center gap-1.5"
              onClick={() => setShowClosed((v) => !v)}
              aria-expanded={showClosed}
            >
              {showClosed ? "Hide" : "Show"} closed out ({closed.length})
            </button>
            {showClosed ? (
              <ul className="mt-3 divide-y divide-granite-300 border-2 border-granite-300">
                {closed.map((o) => (
                  <li key={o.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                    <span className="font-label font-semibold text-sm">{o.business}</span>
                    <span className={`text-[0.65rem] font-label font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 border ${o.state === "converted" ? "border-vine text-vine" : "border-granite-300 text-granite-500"}`}>
                      {o.state === "converted" ? "Converted to enquiry" : "Declined"}
                    </span>
                    <span className="text-xs text-granite-500 ml-auto">{timeAgo(o.updatedAt)}</span>
                    {o.state === "converted" && o.convertedLeadId && openLead && go ? (
                      <button
                        type="button"
                        className="text-xs font-label font-semibold text-garnet hover:underline underline-offset-4"
                        onClick={() => openLead(o.convertedLeadId!)}
                      >
                        View enquiry →
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Review modal */}
      {review ? (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-granite-900/60 fade-in cursor-default" onClick={() => setReview(null)} />
          <div className="rise-in relative bg-bone border-2 border-granite-900 shadow-hard w-full max-w-xl max-h-[85svh] overflow-y-auto thin-scroll" role="dialog" aria-modal="true">
            <div className="px-6 py-4 border-b-2 border-granite-900 flex items-center justify-between bg-granite-100/50">
              <p className="kicker text-granite-500">
                To {review.contact || "—"} · {review.business}
              </p>
              <button type="button" className="btn btn-sm btn-ghost px-3" onClick={() => setReview(null)} aria-label="Close">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              {review.matchedOn || review.compositeScore != null || review.recommendedStrategy ? (
                <div className="mb-5 border border-granite-300 bg-granite-100/50 p-3.5 space-y-1.5">
                  <p className="kicker text-granite-500 text-[0.62rem]">Why this match</p>
                  {review.matchedOn ? <p className="text-xs text-granite-700">{review.matchedOn}</p> : null}
                  {review.compositeScore != null ? (
                    <p className="text-xs text-granite-700">
                      <span className="font-label font-semibold">Fit score:</span> {Math.round(review.compositeScore)}
                    </p>
                  ) : null}
                  {review.recommendedStrategy ? (
                    <p className="text-xs text-granite-700">
                      <span className="font-label font-semibold">Engine's recommended approach:</span> {review.recommendedStrategy}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="font-label font-semibold">{review.subject}</p>
              <div className="mt-4 pt-4 border-t border-granite-300 text-sm text-granite-700 leading-relaxed whitespace-pre-line">{review.body}</div>
              <div className="mt-6 flex flex-wrap gap-3">
                {review.state === "draft" ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setOutboxState(review.id, "approved");
                      setReview(null);
                      toast("Approved. It's waiting in the Approved column.");
                    }}
                  >
                    Approve this email
                  </button>
                ) : null}
                {review.state === "approved" ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setOutboxState(review.id, "sent");
                      setReview(null);
                      toast(`Sent to ${review.business}.`);
                    }}
                  >
                    <SendIcon className="w-3.5 h-3.5" /> Send now
                  </button>
                ) : null}
                {review.state === "sent" ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setOutboxState(review.id, "replied");
                        setReview(null);
                        toast("Marked as replied. Convert it whenever you're ready.");
                      }}
                    >
                      They replied
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setOutboxState(review.id, "declined");
                        setReview(null);
                        toast("Marked declined.");
                      }}
                    >
                      No thanks
                    </button>
                  </>
                ) : null}
                {review.state === "replied" ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => convert(review)}>
                    <Tick className="w-3.5 h-3.5" /> Convert to enquiry
                  </button>
                ) : null}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReview(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
