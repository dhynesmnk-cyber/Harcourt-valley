import React, { useState } from "react";
import {
  fmtDate, matchProspects, seedProspects, timeAgo,
  type BeeSearchAccount, type OutboxItem, type ProspectKind, type ProspectMatch,
} from "../../lib/data";
import { useStore } from "../../lib/store";
import { discoverProspects, dismissCandidate, enrichCandidate, saveManualEmail, type DiscoveredCandidate } from "../../lib/beesearch";
import { isRemote } from "../../lib/supabase";
import { ArrowRight, CloseIcon, FactGrid, PlusIcon, SendIcon, Tick, TrashIcon, validEmail } from "../../components/ui";
import type { Tab } from "./Admin";

const PROSPECTS = seedProspects();

function greeting(contact: string): string {
  const first = contact.trim().split(" ")[0];
  return first ? `Hi ${first}` : "Hi there";
}

function draftCopy(kind: ProspectKind, target: { business: string; contact: string; town: string }): { subject: string; body: string } {
  if (kind === "planner") {
    return {
      subject: `A vineyard your couples haven't seen yet`,
      body: `${greeting(target.contact)} — quick one. Harcourt Valley is a working vineyard 30 minutes from Bendigo: ceremony in the vines, dinner in the old shearing shed, up to 120 guests. We host one wedding a day, ever, and the ballparks are published — no pricing games.\n\nIf you have couples circling ${target.town} and surrounds, I'd love to show you around. Tasting's on us.\n\n— Tom`,
    };
  }
  return {
    subject: `A Shiraz for ${target.business}'s top shelf?`,
    body: `${greeting(target.contact)} — we're Harcourt Valley Vineyards, Bendigo's most-awarded winery (500+ medals, if the cabinet's to be believed). Our Granite Face Shiraz is pouring well at shops your size around the region, and it's margin-friendly at your by-the-glass price point.\n\nI'm through ${target.town} next week — happy to drop a sample by. Worth ten minutes?\n\n— Tom`,
  };
}

/* ---------------- transparency panel ---------------- */

function HowItWorks() {
  return (
    <div className="mt-6 border-2 border-granite-300 bg-granite-100/40 p-5 sm:p-6">
      <p className="kicker text-granite-500">How BeeSearch actually works</p>
      <ul className="mt-3 space-y-2 text-sm text-granite-700 leading-relaxed">
        <li>
          <span className="font-label font-semibold text-ink">Start with who you already know.</span> Add the stockists and
          planners you already work with as accounts — no search, no cost, just a list you keep up to date.
        </li>
        {isRemote ? (
          <li>
            <span className="font-label font-semibold text-ink">Discovery is a real search, not a guess.</span> "Find more like
            mine" calls the Google Places API for businesses of the same kind within roughly 90 minutes of the valley, and skips anything
            already on your account list. It costs a small amount of money per search, so it only ever runs when you press a button.
          </li>
        ) : (
          <li>
            <span className="font-label font-semibold text-ink">This demo matches against a small, named sample.</span> No live
            search is running — matches come from ten example businesses kept in the code, so the feature is usable before a real backend
            is connected. See BEESEARCH.md to turn on live search.
          </li>
        )}
        <li>
          <span className="font-label font-semibold text-ink">Every match shows its reasons.</span> "Matched on" under each
          suggestion is the literal, specific reason it was picked — distance, guest range, or a stated fact. Nothing is a hidden score.
        </li>
        {isRemote ? (
          <li>
            <span className="font-label font-semibold text-ink">Contact lookup checks one site at a time, on request.</span>{" "}
            "Find contact details" visits that one business's own website — never a bulk crawl — honours their robots.txt, and never
            invents an email. Whether reaching out needs consent under Australia's Spam Act is your own call per business, not something
            this tool decides.
          </li>
        ) : null}
        <li>
          <span className="font-label font-semibold text-ink">Nothing leaves on its own.</span> Draft → Approve → Send is two
          separate presses, both yours. A reply gets logged by you, and converting one to an enquiry is one more press, whenever you're
          ready.
        </li>
      </ul>
    </div>
  );
}

/* ---------------- match cards ---------------- */

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
      <button type="button" className="btn btn-sm bg-bone text-ink mt-3 w-full" onClick={onDraft}>
        Write the email
      </button>
    </div>
  );
}

function LiveCandidateCard({
  c, enriching, blocked, manualValue, onManualChange, onEnrich, onDismiss, onDraft,
}: {
  c: DiscoveredCandidate;
  enriching: boolean;
  blocked: boolean;
  manualValue: string;
  onManualChange: (v: string) => void;
  onEnrich: () => void;
  onDismiss: () => void;
  onDraft: () => void;
}) {
  const hasEmail = Boolean(c.email);
  return (
    <div className="border border-granite-500 p-4 bg-granite-700/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-label font-semibold text-sm truncate">{c.business}</p>
          <p className="text-xs text-granite-300 mt-0.5 truncate">
            {c.town || c.address}
            {c.distance_km != null ? ` · ${c.distance_km} km` : ""}
          </p>
        </div>
        <button type="button" className="text-[0.65rem] text-granite-400 hover:text-bone shrink-0" onClick={onDismiss}>
          Not a fit
        </button>
      </div>
      <ul className="mt-2.5 space-y-1">
        {c.reasons.slice(0, 3).map((r) => (
          <li key={r} className="text-[0.7rem] text-granite-300 flex gap-1.5">
            <span className="text-ochre shrink-0">·</span> {r}
          </li>
        ))}
      </ul>
      {c.website ? (
        <a href={c.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[0.7rem] text-ochre hover:underline underline-offset-2">
          Visit their site ↗
        </a>
      ) : null}
      <div className="mt-2.5">
        {hasEmail ? (
          <p className="text-[0.72rem] text-granite-300 truncate">{c.email}</p>
        ) : (
          <>
            {blocked ? <p className="text-[0.68rem] text-granite-400 mb-1.5">Their site blocks automatic checks.</p> : null}
            <input
              type="email"
              className="field-input text-xs py-1.5 bg-bone text-ink"
              placeholder="Or enter an email you found yourself"
              value={manualValue}
              onChange={(e) => onManualChange(e.target.value)}
            />
          </>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {!hasEmail && c.website ? (
          <button type="button" className="btn btn-sm btn-ghost border border-granite-500 text-bone flex-1" onClick={onEnrich} disabled={enriching}>
            {enriching ? "Checking…" : "Find contact details"}
          </button>
        ) : null}
        <button type="button" className="btn btn-sm bg-bone text-ink flex-1" onClick={onDraft} disabled={!hasEmail && !manualValue.trim()}>
          Write the email
        </button>
      </div>
    </div>
  );
}

/* ---------------- your accounts ---------------- */

const emptyAccountForm = { business: "", contact: "", email: "", phone: "", town: "", kind: "stockist" as ProspectKind, notes: "" };

function AccountCard({ account, onEdit, onRemove }: { account: BeeSearchAccount; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="border-2 border-granite-900 bg-bone p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-label font-semibold text-sm truncate">{account.business}</p>
            <span className="text-[0.6rem] font-label font-bold uppercase tracking-[0.08em] border border-granite-300 px-1.5 py-0.5 text-granite-500 shrink-0">
              {account.kind === "planner" ? "Planner" : "Stockist"}
            </span>
          </div>
          <p className="text-xs text-granite-500 mt-0.5 truncate">
            {[account.town, account.contact].filter(Boolean).join(" · ") || "No details yet"}
          </p>
        </div>
        <button type="button" className="text-granite-400 hover:text-garnet shrink-0" onClick={onRemove} aria-label={`Remove ${account.business}`}>
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
      {account.notes ? <p className="text-xs text-granite-700 mt-2 leading-relaxed">{account.notes}</p> : null}
      <button type="button" className="btn btn-ghost btn-sm mt-3 w-full" onClick={onEdit}>
        Edit
      </button>
    </div>
  );
}

function AccountForm({
  draft, onChange, onSave, onCancel, editing,
}: {
  draft: typeof emptyAccountForm;
  onChange: (patch: Partial<typeof emptyAccountForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  editing: boolean;
}) {
  return (
    <div className="border-2 border-dashed border-granite-300 p-5">
      <p className="kicker text-granite-500">{editing ? "Edit this account" : "Add an account"}</p>
      <div className="mt-3 space-y-2.5">
        <label className="sr-only" htmlFor="acc-business">
          Business name
        </label>
        <input id="acc-business" className="field-input" placeholder="Business name" value={draft.business} onChange={(e) => onChange({ business: e.target.value })} />
        <label className="sr-only" htmlFor="acc-kind">
          Kind
        </label>
        <select id="acc-kind" className="field-input" value={draft.kind} onChange={(e) => onChange({ kind: e.target.value as ProspectKind })}>
          <option value="stockist">Stockist</option>
          <option value="planner">Planner</option>
        </select>
        <label className="sr-only" htmlFor="acc-contact">
          Contact name
        </label>
        <input id="acc-contact" className="field-input" placeholder="Contact name" value={draft.contact} onChange={(e) => onChange({ contact: e.target.value })} />
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="sr-only" htmlFor="acc-email">
              Email
            </label>
            <input id="acc-email" type="email" className="field-input" placeholder="Email" value={draft.email} onChange={(e) => onChange({ email: e.target.value })} />
          </div>
          <div>
            <label className="sr-only" htmlFor="acc-phone">
              Phone
            </label>
            <input id="acc-phone" className="field-input" placeholder="Phone" value={draft.phone} onChange={(e) => onChange({ phone: e.target.value })} />
          </div>
        </div>
        <label className="sr-only" htmlFor="acc-town">
          Town
        </label>
        <input id="acc-town" className="field-input" placeholder="Town" value={draft.town} onChange={(e) => onChange({ town: e.target.value })} />
        <label className="sr-only" htmlFor="acc-notes">
          Notes
        </label>
        <textarea id="acc-notes" className="field-input min-h-[60px]" placeholder="Notes — optional" value={draft.notes} onChange={(e) => onChange({ notes: e.target.value })} />
        <div className="flex gap-2">
          <button type="button" className="btn btn-dark btn-sm flex-1" onClick={onSave}>
            {editing ? <Tick className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />} {editing ? "Save changes" : "Add this account"}
          </button>
          {editing ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BeeSearchView({ go, openLead }: { go?: (t: Tab) => void; openLead?: (id: string) => void }) {
  const { accounts, addAccount, updateAccount, removeAccount, addOutbox, outbox, setOutboxState, convertOutboxToLead, toast } = useStore();
  const [accountDraft, setAccountDraft] = useState(emptyAccountForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accountErr, setAccountErr] = useState("");
  const [results, setResults] = useState<{ criteria: string[]; matches: ProspectMatch[]; kind: ProspectKind } | null>(null);
  const [liveLoading, setLiveLoading] = useState<ProspectKind | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<{ criteria: string[]; candidates: DiscoveredCandidate[]; kind: ProspectKind } | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<Record<string, boolean>>({});
  const [manualEmail, setManualEmail] = useState<Record<string, string>>({});
  const [review, setReview] = useState<OutboxItem | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const stockistAccounts = accounts.filter((a) => a.kind === "stockist");
  const plannerAccounts = accounts.filter((a) => a.kind === "planner");

  const criteriaFor = (kind: ProspectKind) => {
    const count = (kind === "stockist" ? stockistAccounts : plannerAccounts).length;
    return [`${count} ${kind}${count === 1 ? "" : "s"} you already work with`, "Regional Victoria, within a 90-minute drive"];
  };

  const findMore = async (kind: ProspectKind) => {
    setResults(null);
    setLiveResults(null);
    setLiveError(null);
    const criteria = criteriaFor(kind);
    if (isRemote) {
      setLiveLoading(kind);
      const r = await discoverProspects(kind);
      setLiveLoading(null);
      if (!r.ok) {
        setLiveError(r.message);
        return;
      }
      const known = new Set(accounts.map((a) => a.business.trim().toLowerCase()));
      const candidates = r.candidates.filter((c) => c.status !== "dismissed" && !known.has(c.business.trim().toLowerCase()));
      setLiveResults({ kind, criteria, candidates });
      return;
    }
    setResults({ kind, criteria, matches: matchProspects(kind, PROSPECTS, accounts) });
  };

  const startAdd = () => {
    setEditingId(null);
    setAccountDraft(emptyAccountForm);
    setAccountErr("");
  };

  const startEdit = (a: BeeSearchAccount) => {
    setEditingId(a.id);
    setAccountDraft({ business: a.business, contact: a.contact, email: a.email, phone: a.phone, town: a.town, kind: a.kind, notes: a.notes });
    setAccountErr("");
  };

  const saveAccount = () => {
    if (accountDraft.business.trim().length < 2) {
      setAccountErr("Give it a business name at least.");
      return;
    }
    setAccountErr("");
    if (editingId) {
      updateAccount(editingId, accountDraft);
      toast(`${accountDraft.business.trim()} updated.`);
    } else {
      addAccount(accountDraft);
      toast(`${accountDraft.business.trim()} added to your accounts.`);
    }
    startAdd();
  };

  const generateDraft = (kind: ProspectKind, m: ProspectMatch) => {
    const copy = draftCopy(kind, m.prospect);
    addOutbox([{
      business: m.prospect.business, contact: m.prospect.contact, email: m.prospect.email, phone: m.prospect.phone,
      town: m.prospect.town, kind, matchedOn: m.reasons, ...copy,
    }]);
    toast(`Draft written for ${m.prospect.business} — it's in the outbox, waiting for you.`);
  };

  const enrich = async (c: DiscoveredCandidate) => {
    setEnrichingId(c.id);
    const r = await enrichCandidate(c.id, c.website);
    setEnrichingId(null);
    if (!r.ok) {
      toast(r.message);
      return;
    }
    if (r.blocked) {
      setBlockedIds((b) => ({ ...b, [c.id]: true }));
      toast(`${c.business}'s site doesn't allow automatic checks — enter an email you found yourself.`);
      return;
    }
    if (r.email) {
      setLiveResults((prev) => (prev ? { ...prev, candidates: prev.candidates.map((x) => (x.id === c.id ? { ...x, email: r.email } : x)) } : prev));
      toast(`Found a contact address for ${c.business}.`);
    } else {
      toast(`No public email found on ${c.business}'s site — enter one you found yourself.`);
    }
  };

  const dismissLive = async (c: DiscoveredCandidate) => {
    await dismissCandidate(c.id);
    setLiveResults((prev) => (prev ? { ...prev, candidates: prev.candidates.filter((x) => x.id !== c.id) } : prev));
  };

  const writeFromCandidate = async (kind: ProspectKind, c: DiscoveredCandidate) => {
    const typed = manualEmail[c.id]?.trim() ?? "";
    const email = c.email || typed;
    if (!email) {
      toast("Find or enter a contact email first.");
      return;
    }
    if (!validEmail(email)) {
      toast("That doesn't look like a valid email address.");
      return;
    }
    if (!c.email && typed) await saveManualEmail(c.id, typed);
    const town = c.town || c.address;
    const copy = draftCopy(kind, { business: c.business, contact: "", town });
    addOutbox([{ business: c.business, contact: "", email, phone: c.phone, town, kind, matchedOn: c.reasons, ...copy }]);
    toast(`Draft written for ${c.business} — it's in the outbox, waiting for you.`);
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
      label: "Accounts on file", value: String(accounts.length),
      detail: `${stockistAccounts.length} stockist · ${plannerAccounts.length} planner`,
    },
    { label: "In the outbox", value: String(grouped.draft.length + grouped.approved.length), detail: `${grouped.draft.length} draft · ${grouped.approved.length} approved` },
    { label: "Sent", value: String(sentCount), detail: sentCount === 0 ? "None yet" : "Emails that have gone out" },
    { label: "Reply rate", value: sentCount ? `${Math.round((loggedCount / sentCount) * 100)}%` : "—", detail: sentCount ? `${loggedCount} of ${sentCount} logged` : "Send some to start tracking" },
    { label: "Converted to enquiries", value: String(convertedCount), detail: "Now tracked in the pipeline" },
  ] as const;

  const activeResults = results ?? liveResults;

  return (
    <div>
      <p className="kicker text-granite-500">Outreach · BeeSearch</p>
      <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Go and find the next ones.</h1>
      <p className="text-sm text-granite-500 mt-2 max-w-2xl">
        Add who you already work with, then find more like them. BeeSearch writes the first email in the family voice — nothing sends
        without you pressing Approve, then Send.
      </p>

      <HowItWorks />

      <div className="mt-8">
        <FactGrid facts={facts} />
      </div>

      {/* Step 1: accounts */}
      <div className="mt-10">
        <p className="kicker text-granite-500">Step 1</p>
        <h2 className="font-display text-2xl font-medium mt-1">Your accounts.</h2>
        <p className="text-sm text-granite-500 mt-1.5 max-w-2xl">The stockists and planners you already work with. Add to this whenever — nothing here costs anything or searches anywhere.</p>
        <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} onEdit={() => startEdit(a)} onRemove={() => { removeAccount(a.id); toast(`${a.business} removed.`); }} />
          ))}
          <AccountForm
            draft={accountDraft}
            onChange={(patch) => setAccountDraft((d) => ({ ...d, ...patch }))}
            onSave={saveAccount}
            onCancel={startAdd}
            editing={Boolean(editingId)}
          />
        </div>
        {accountErr ? <p className="field-error mt-2">{accountErr}</p> : null}
      </div>

      {/* Step 2: discover */}
      <div className="mt-10 border-2 border-granite-900 bg-dark text-bone p-6 sm:p-8">
        <p className="kicker text-granite-300">Step 2</p>
        <p className="font-display text-2xl font-medium mt-1.5">Find more like these.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn bg-bone text-ink"
            onClick={() => void findMore("stockist")}
            disabled={stockistAccounts.length === 0 || liveLoading !== null}
          >
            {liveLoading === "stockist" ? "Searching…" : "Find more stockists like mine"}
            {liveLoading !== "stockist" ? <ArrowRight className="w-4 h-4" /> : null}
          </button>
          <button
            type="button"
            className="btn btn-ghost border border-bone/40 text-bone hover:bg-bone/10"
            onClick={() => void findMore("planner")}
            disabled={plannerAccounts.length === 0 || liveLoading !== null}
          >
            {liveLoading === "planner" ? "Searching…" : "Find more planners like mine"}
            {liveLoading !== "planner" ? <ArrowRight className="w-4 h-4" /> : null}
          </button>
        </div>
        {stockistAccounts.length === 0 && plannerAccounts.length === 0 ? (
          <p className="mt-4 text-sm text-granite-300">Add at least one account above first — discovery needs to know what "like this" means.</p>
        ) : null}

        {liveLoading ? <p className="mt-5 text-sm text-granite-300" aria-live="polite">Calling the Places API — this can take a few seconds…</p> : null}
        {liveError ? (
          <p className="mt-5 text-sm text-bone border border-garnet bg-garnet/20 px-3.5 py-2.5" role="alert">
            {liveError}
          </p>
        ) : null}

        {activeResults ? (
          <div className="mt-6 rise-in">
            <div className="flex flex-wrap gap-2">
              {activeResults.criteria.map((c) => (
                <span key={c} className="border border-granite-500 px-3 py-1.5 text-xs font-label font-semibold">
                  {c}
                </span>
              ))}
            </div>
            {results ? (
              results.matches.length === 0 ? (
                <p className="mt-5 text-sm text-granite-300">Nothing new in the directory fits yet.</p>
              ) : (
                <div className="mt-5 grid sm:grid-cols-3 gap-3">
                  {results.matches.map((m) => (
                    <MatchCard key={m.prospect.business} m={m} onDraft={() => generateDraft(results.kind, m)} />
                  ))}
                </div>
              )
            ) : null}
            {liveResults ? (
              liveResults.candidates.length === 0 ? (
                <p className="mt-5 text-sm text-granite-300">No new businesses turned up in the search radius.</p>
              ) : (
                <div className="mt-5 grid sm:grid-cols-3 gap-3">
                  {liveResults.candidates.map((c) => (
                    <LiveCandidateCard
                      key={c.id}
                      c={c}
                      enriching={enrichingId === c.id}
                      blocked={Boolean(blockedIds[c.id])}
                      manualValue={manualEmail[c.id] ?? ""}
                      onManualChange={(v) => setManualEmail((m) => ({ ...m, [c.id]: v }))}
                      onEnrich={() => void enrich(c)}
                      onDismiss={() => void dismissLive(c)}
                      onDraft={() => void writeFromCandidate(liveResults.kind, c)}
                    />
                  ))}
                </div>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Step 3: outbox */}
      <div className="mt-10">
        <p className="kicker text-granite-500">Step 3</p>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-medium mt-1">Draft → Approved → Sent → Replied. You hold every key.</h2>
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
                      To {o.contact || o.email} · {fmtDate(o.updatedAt.slice(0, 10))}
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
              className="text-xs font-label font-semibold text-granite-600 hover:text-ink inline-flex items-center gap-1.5"
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
          <button type="button" aria-label="Close" className="absolute inset-0 bg-dark/60 fade-in cursor-default" onClick={() => setReview(null)} />
          <div className="rise-in relative bg-bone border-2 border-granite-900 shadow-hard w-full max-w-xl max-h-[85svh] overflow-y-auto thin-scroll" role="dialog" aria-modal="true">
            <div className="px-6 py-4 border-b-2 border-granite-900 flex items-center justify-between bg-granite-100/50">
              <p className="kicker text-granite-500">
                To {review.contact || review.email} · {review.business}
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
