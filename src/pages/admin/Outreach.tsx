import React, { useEffect, useState } from "react";
import { fmtDate, type Bee23Profile, type OutboxItem } from "../../lib/data";
import { useStore } from "../../lib/store";
import { ArrowRight, CloseIcon, PlusIcon, SearchIcon, SendIcon } from "../../components/ui";
import {
  checkBee23Available,
  listStockists,
  addStockist,
  runDiscovery,
  listDiscoverySuggestions,
  addSuggestionAsAccount,
  waitForEnrichment,
  generatePitch,
  splitPitch,
} from "../../lib/bee23";

interface Suggestion {
  business: string;
  contact: string;
  town: string;
  /** Present only for a suggestion sourced from the live bee23 engine. */
  discoveryId?: number;
  reason?: string;
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

/* bee23's discovery matrix scores brand/purchasing/merchandising fit — a shape
 * built for retail stockists, not wedding planners. "Regional stockists" maps
 * onto Harcourt's own trade orders (real businesses already on the books), so
 * that's the one profile wired to the live engine. "Wedding & event planners"
 * has no equivalent structured list in this app, and seeding one with guesses
 * would be worse than the demo data it already shows — so it stays on that. */
const LIVE_DISCOVERY_PROFILE_ID = "bp1";
const MIN_STOCKISTS_FOR_DISCOVERY = 5;

export function OutreachView() {
  const { profiles, addProfile, addOutbox, outbox, setOutboxState, leads, tradeOrders, toast } = useStore();
  const [newName, setNewName] = useState("");
  const [newWho, setNewWho] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [results, setResults] = useState<{ criteria: string[]; suggestions: Suggestion[]; profileName: string; live: boolean } | null>(null);
  const [review, setReview] = useState<OutboxItem | null>(null);
  const [bee23Connected, setBee23Connected] = useState<boolean | null>(null);
  const [findingProfileId, setFindingProfileId] = useState<string | null>(null);
  const [writingKey, setWritingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkBee23Available().then((ok) => {
      if (!cancelled) setBee23Connected(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
          "Booked within months of first enquiry",
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

  /** Makes sure the engine has enough training data before discovery can run,
   *  seeding it from Harcourt's own trade orders — real stockists already on
   *  the books, not fabricated ones. */
  const ensureStockistsTrained = async (): Promise<{ trained: boolean; added: number }> => {
    const existing = await listStockists();
    const known = new Set(existing.map((s) => s.businessName.toLowerCase()));
    if (known.size >= MIN_STOCKISTS_FOR_DISCOVERY) return { trained: true, added: 0 };

    let added = 0;
    for (const t of tradeOrders) {
      if (known.size >= MIN_STOCKISTS_FOR_DISCOVERY) break;
      if (known.has(t.business.toLowerCase())) continue;
      const result = await addStockist({ businessName: t.business });
      if (result) {
        known.add(t.business.toLowerCase());
        added++;
      }
    }
    return { trained: known.size >= MIN_STOCKISTS_FOR_DISCOVERY, added };
  };

  const findMatchesLive = async (profile: Bee23Profile) => {
    setFindingProfileId(profile.id);
    setResults(null);
    try {
      const { trained, added } = await ensureStockistsTrained();
      if (added > 0) toast(`Trained bee23 on ${added} of your existing trade accounts.`);
      if (!trained) {
        toast(`Bee23 needs at least ${MIN_STOCKISTS_FOR_DISCOVERY} stockists to learn from — add more in Stockist Training first.`);
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
        toast("Bee23 didn't turn up any new matches this time — try again shortly, or add more stockists to learn from.");
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
        })),
      });
    } catch {
      toast("Bee23 couldn't complete the search — try again shortly.");
    } finally {
      setFindingProfileId(null);
    }
  };

  const findMatches = (profile: Bee23Profile) => {
    if (bee23Connected && profile.id === LIVE_DISCOVERY_PROFILE_ID) {
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
        toast(`Bee23 couldn't read ${s.business}'s website in time. Open Bee23 directly to paste their content in manually, or try again shortly.`);
        return;
      }
      const pitch = await generatePitch(account.id);
      if (!pitch.ok) {
        toast(pitch.error);
        return;
      }
      const { subject, body } = splitPitch(pitch.pitch, `A note for ${s.business}`);
      addOutbox([{ business: s.business, contact: "", subject, body }]);
      toast(`Draft written for ${s.business} — it's in the outbox, waiting for you.`);
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
    addOutbox([{ business: s.business, contact: s.contact, ...copy }]);
    toast(`Draft written for ${s.business} — it's in the outbox, waiting for you.`);
  };

  const grouped = {
    draft: outbox.filter((o) => o.state === "draft"),
    approved: outbox.filter((o) => o.state === "approved"),
    sent: outbox.filter((o) => o.state === "sent"),
  };

  return (
    <div>
      <p className="kicker text-granite-500">Outreach · Bee23</p>
      <div className="flex flex-wrap items-center gap-3 mt-1.5">
        <h1 className="font-display text-3xl sm:text-4xl font-medium">Go and find the next ones.</h1>
        {bee23Connected === true ? (
          <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-label font-semibold uppercase tracking-[0.06em] border border-ochre text-ochre px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ochre" /> Live engine connected
          </span>
        ) : bee23Connected === false ? (
          <span className="inline-flex items-center gap-1.5 text-[0.66rem] font-label font-semibold uppercase tracking-[0.06em] border border-granite-300 text-granite-500 px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-granite-300" /> Demo data — engine not connected
          </span>
        ) : null}
      </div>
      <p className="text-sm text-granite-500 mt-2 max-w-2xl">
        Bee23 looks for businesses like your best customers and writes the first email in the family voice. Nothing sends without you pressing Approve, then Send. Two presses, on
        purpose.
      </p>

      {/* Seed from best customers */}
      <div className="mt-7 border-2 border-granite-900 bg-granite-900 text-bone p-6 sm:p-8">
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
              {results.live ? <span className="text-ochre"> · live matches</span> : null}
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
            <h2 className="font-display text-2xl font-medium mt-1">Draft → Approved → Sent. You hold both keys.</h2>
          </div>
          <p className="text-xs text-granite-500">Nothing leaves the building on its own.</p>
        </div>
        <div className="mt-5 grid lg:grid-cols-3 gap-5 items-start">
          {(
            [
              { key: "draft", label: "Drafts", hint: "Written by Bee23, waiting for your read." },
              { key: "approved", label: "Approved", hint: "You've read it. Send when you're ready." },
              { key: "sent", label: "Sent", hint: "Out the door. Watch for replies." },
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
                    <p className="text-xs text-granite-500 mt-0.5">To {o.contact} · {fmtDate(o.updatedAt.slice(0, 10))}</p>
                    <p className="text-sm mt-2 line-clamp-2 text-granite-700">{o.subject}</p>
                    <div className="mt-3 flex gap-2">
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
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review modal */}
      {review ? (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-granite-900/60 fade-in cursor-default" onClick={() => setReview(null)} />
          <div className="rise-in relative bg-bone border-2 border-granite-900 shadow-hard w-full max-w-xl max-h-[85svh] overflow-y-auto thin-scroll" role="dialog" aria-modal="true">
            <div className="px-6 py-4 border-b-2 border-granite-900 flex items-center justify-between bg-granite-100/50">
              <p className="kicker text-granite-500">
                To {review.contact} · {review.business}
              </p>
              <button type="button" className="btn btn-sm btn-ghost px-3" onClick={() => setReview(null)} aria-label="Close">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
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
