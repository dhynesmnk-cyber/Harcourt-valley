import React, { useMemo, useState } from "react";
import {
  fmtDate, matchProspects, seedProspects, timeAgo,
  type BeeSearchProfile, type OutboxItem, type ProspectKind, type ProspectMatch,
} from "../../lib/data";
import { useStore } from "../../lib/store";
import { ArrowRight, CloseIcon, FactGrid, PlusIcon, SearchIcon, SendIcon, Tick } from "../../components/ui";
import type { Tab } from "./Admin";

const PROSPECTS = seedProspects();

function draftCopy(kind: ProspectKind, m: ProspectMatch): { subject: string; body: string } {
  const { prospect: s } = m;
  if (kind === "planner") {
    return {
      subject: `A vineyard your couples haven't seen yet`,
      body: `Hi ${s.contact.split(" ")[0]} — quick one. Harcourt Valley is a working vineyard 30 minutes from Bendigo: ceremony in the vines, dinner in the old shearing shed, up to 120 guests. We host one wedding a day, ever, and the ballparks are published — no pricing games.\n\nIf you have couples circling ${s.town} and surrounds, I'd love to show you around. Tasting's on us.\n\n— Tom`,
    };
  }
  return {
    subject: `A Shiraz for ${s.business}'s top shelf?`,
    body: `Hi ${s.contact.split(" ")[0]} — we're Harcourt Valley Vineyards, Bendigo's most-awarded winery (500+ medals, if the cabinet's to be believed). Our Granite Face Shiraz is pouring well at shops your size around the region, and it's margin-friendly at your by-the-glass price point.\n\nI'm through ${s.town} next week — happy to drop a sample by. Worth ten minutes?\n\n— Tom`,
  };
}

/* ---------------- transparency panel ---------------- */

function HowItWorks() {
  return (
    <div className="mt-6 border-2 border-granite-300 bg-granite-100/40 p-5 sm:p-6">
      <p className="kicker text-granite-500">How BeeSearch actually works</p>
      <ul className="mt-3 space-y-2 text-sm text-granite-700 leading-relaxed">
        <li>
          <span className="font-label font-semibold text-granite-900">It reads your own bookings.</span> "Teach it from your bookings"
          looks at leads you've marked Booked — nothing else — to learn the guest counts and event shapes that already say yes to you.
        </li>
        <li>
          <span className="font-label font-semibold text-granite-900">It matches against a small, named directory.</span> There's no web
          crawl behind this — matches come from a short list of nearby stockists and planners, kept by hand. Every suggestion is a real
          name in that list, matched against your target's criteria.
        </li>
        <li>
          <span className="font-label font-semibold text-granite-900">Every match shows its reasons.</span> "Matched on" under each
          suggestion is the literal, specific reason it was picked — distance, guest range, or a stated fact about the business. Nothing
          is a hidden score.
        </li>
        <li>
          <span className="font-label font-semibold text-granite-900">Nothing leaves on its own.</span> Draft → Approve → Send is two
          separate presses, both yours. A reply gets logged by you, and converting one to an enquiry is one more press, whenever you're ready.
        </li>
      </ul>
    </div>
  );
}

/* ---------------- match card ---------------- */

function MatchCard({ m, onDraft }: { m: ProspectMatch; onDraft: () => void }) {
  return (
    <div className="border border-granite-500 p-4 bg-granite-700/40">
      <p className="font-label font-semibold text-sm">{m.prospect.business}</p>
      <p className="text-xs text-granite-300 mt-0.5">
        {m.prospect.town} · ask for {m.prospect.contact}
      </p>
      <ul className="mt-2.5 space-y-1">
        {m.reasons.slice(0, 3).map((r) => (
          <li key={r} className="text-[0.7rem] text-granite-300 flex gap-1.5">
            <span className="text-ochre shrink-0">·</span> {r}
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-sm bg-bone text-granite-900 mt-3 w-full" onClick={onDraft}>
        Write the email
      </button>
    </div>
  );
}

export function BeeSearchView({ go, openLead }: { go?: (t: Tab) => void; openLead?: (id: string) => void }) {
  const { profiles, addProfile, addOutbox, outbox, setOutboxState, convertOutboxToLead, leads, toast } = useStore();
  const [newName, setNewName] = useState("");
  const [newWho, setNewWho] = useState("");
  const [newKind, setNewKind] = useState<ProspectKind>("stockist");
  const [profileErr, setProfileErr] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [results, setResults] = useState<{ criteria: string[]; matches: ProspectMatch[]; profileName: string; kind: ProspectKind } | null>(null);
  const [review, setReview] = useState<OutboxItem | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const booked = leads.filter((l) => l.status === "booked");

  const plannerProfile = profiles.find((p) => p.kind === "planner") ?? profiles[0];

  const runAnalysis = () => {
    if (!plannerProfile) return;
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
      const matches = matchProspects(plannerProfile, PROSPECTS, booked).slice(0, 3);
      setResults({
        profileName: "Based on your best bookings",
        kind: "planner",
        criteria: [
          `${booked.length} bookings read (${weddings} weddings)`,
          `Guest counts between ${lo} and ${hi}`,
          "Regional Victoria, within a 90-minute drive",
        ],
        matches,
      });
      setAnalyzing(false);
    }, 2100);
  };

  const findMatches = (p: BeeSearchProfile) => {
    setResults({ profileName: `Matches for "${p.name}"`, kind: p.kind, criteria: p.criteria, matches: matchProspects(p, PROSPECTS, booked) });
  };

  const addCustomProfile = () => {
    if (newName.trim().length < 2 || newWho.trim().length < 5) {
      setProfileErr("Give the target a name and a sentence about who it's for.");
      return;
    }
    setProfileErr("");
    addProfile({ name: newName.trim(), who: newWho.trim(), kind: newKind, criteria: ["Custom target — criteria to refine together"] });
    toast(`Target "${newName.trim()}" added.`);
    setNewName("");
    setNewWho("");
    setNewKind("stockist");
  };

  const generateDraft = (kind: ProspectKind, m: ProspectMatch) => {
    const copy = draftCopy(kind, m);
    addOutbox([{
      business: m.prospect.business, contact: m.prospect.contact, email: m.prospect.email, phone: m.prospect.phone,
      town: m.prospect.town, kind, matchedOn: m.reasons, ...copy,
    }]);
    toast(`Draft written for ${m.prospect.business} — it's in the outbox, waiting for you.`);
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
    {
      label: "Targets tracked", value: String(profiles.length),
      detail: `${profiles.filter((p) => p.kind === "stockist").length} stockist · ${profiles.filter((p) => p.kind === "planner").length} planner`,
    },
    { label: "In the outbox", value: String(grouped.draft.length + grouped.approved.length), detail: `${grouped.draft.length} draft · ${grouped.approved.length} approved` },
    { label: "Sent", value: String(sentCount), detail: sentCount === 0 ? "None yet" : "Emails that have gone out" },
    { label: "Reply rate", value: sentCount ? `${Math.round((loggedCount / sentCount) * 100)}%` : "—", detail: sentCount ? `${loggedCount} of ${sentCount} logged` : "Send some to start tracking" },
    { label: "Converted to enquiries", value: String(convertedCount), detail: "Now tracked in the pipeline" },
  ] as const;

  return (
    <div>
      <p className="kicker text-granite-500">Outreach · BeeSearch</p>
      <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Go and find the next ones.</h1>
      <p className="text-sm text-granite-500 mt-2 max-w-2xl">
        BeeSearch looks for businesses like your best customers and writes the first email in the family voice. Nothing sends without you
        pressing Approve, then Send. Two presses, on purpose.
      </p>

      <HowItWorks />

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
          <button type="button" className="btn bg-bone text-granite-900" onClick={runAnalysis} disabled={analyzing || !plannerProfile}>
            {analyzing ? "Reading your bookings…" : "Run the analysis"}
            {!analyzing ? <ArrowRight className="w-4 h-4" /> : null}
          </button>
        </div>
        {analyzing ? (
          <ul className="mt-5 space-y-2 text-sm text-granite-300" aria-live="polite">
            {["Reading your booked leads…", "Working out the guest-count range that says yes…", "Checking the directory for businesses that fit…"].map((s, i) => (
              <li key={s} className={`flex items-center gap-3 transition-opacity ${analysisStage > i ? "opacity-100" : "opacity-30"}`}>
                <span className={`w-2 h-2 ${analysisStage > i ? "bg-ochre" : "bg-granite-500"}`} /> {s}
              </li>
            ))}
          </ul>
        ) : null}
        {results ? (
          <div className="mt-6 rise-in">
            <p className="kicker text-granite-300">{results.profileName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {results.criteria.map((c) => (
                <span key={c} className="border border-granite-500 px-3 py-1.5 text-xs font-label font-semibold">
                  {c}
                </span>
              ))}
            </div>
            {results.matches.length === 0 ? (
              <p className="mt-5 text-sm text-granite-300">Nothing in the directory fits this target yet.</p>
            ) : (
              <div className="mt-5 grid sm:grid-cols-3 gap-3">
                {results.matches.map((m) => (
                  <MatchCard key={m.prospect.business} m={m} onDraft={() => generateDraft(results.kind, m)} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Target profiles */}
      <div className="mt-8">
        <p className="kicker text-granite-500">Who we're looking for</p>
        <div className="mt-3 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <div key={p.id} className="border-2 border-granite-900 bg-bone p-5">
              <div className="flex items-center gap-2">
                <p className="font-display text-xl font-medium">{p.name}</p>
                <span className="text-[0.62rem] font-label font-bold uppercase tracking-[0.08em] border border-granite-300 px-1.5 py-0.5 text-granite-500">
                  {p.kind === "planner" ? "Planner" : "Stockist"}
                </span>
              </div>
              <p className="text-sm text-granite-700 mt-1.5 leading-relaxed">{p.who}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.criteria.map((c) => (
                  <span key={c} className="text-[0.66rem] font-label font-semibold uppercase tracking-[0.06em] border border-granite-300 px-2 py-1 text-granite-700">
                    {c}
                  </span>
                ))}
              </div>
              <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={() => findMatches(p)}>
                <SearchIcon className="w-3.5 h-3.5" /> Find matches
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
              <label className="sr-only" htmlFor="np-kind">
                Directory to match against
              </label>
              <select id="np-kind" className="field-input" value={newKind} onChange={(e) => setNewKind(e.target.value as ProspectKind)}>
                <option value="stockist">Matches against stockists</option>
                <option value="planner">Matches against planners</option>
              </select>
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
                      To {o.contact} · {fmtDate(o.updatedAt.slice(0, 10))}
                    </p>
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
                To {review.contact} · {review.business}
              </p>
              <button type="button" className="btn btn-sm btn-ghost px-3" onClick={() => setReview(null)} aria-label="Close">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              {review.matchedOn.length > 0 ? (
                <div className="mb-5 border border-granite-300 bg-granite-100/50 p-3.5">
                  <p className="kicker text-granite-500 text-[0.62rem]">Why this match</p>
                  <ul className="mt-1.5 space-y-1">
                    {review.matchedOn.map((r) => (
                      <li key={r} className="text-xs text-granite-700 flex gap-1.5">
                        <span className="text-garnet shrink-0">·</span> {r}
                      </li>
                    ))}
                  </ul>
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
