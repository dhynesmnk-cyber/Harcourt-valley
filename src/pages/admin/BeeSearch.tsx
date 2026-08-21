import { useEffect, useState } from "react";
import { profileCriteria, type BeeSearchKind, type BeeSearchProfile, type OutboxItem } from "../../lib/data";
import { useStore } from "../../lib/store";
import { PlusIcon } from "../../components/ui";
import {
  addSuggestionAsAccount, generatePitch, getEngineStatus, splitPitch, waitForEnrichment,
  type BeeSearchDiscoverySuggestion, type EngineStatus,
} from "../../lib/beesearchEngine";
import { TargetCard } from "./beesearch/TargetCard";
import { OutboxBoard } from "./beesearch/OutboxBoard";
import { DraftModal } from "./beesearch/DraftModal";
import type { Tab } from "./Admin";

const RUBRICS: { value: BeeSearchKind; label: string; detail: string }[] = [
  {
    value: "stockist",
    label: "They'd buy and resell our wine",
    detail: "Scored on brand fit, purchasing size and shelf readiness. Bottle shops, wine bars, restaurants.",
  },
  {
    value: "referral_partner",
    label: "They'd send people to us",
    detail: "Scored on venue fit, guest numbers and how often they refer. Planners, stylists, suppliers, nearby venues.",
  },
];

/** The engine is either there or it isn't. No demo path, no stand-in data. */
function NotConnected({ status, onRetry, checking }: { status: EngineStatus; onRetry: () => void; checking: boolean }) {
  const line =
    status === "signed-out"
      ? "Your session has expired. Sign out and back in, then try again."
      : status === "unreachable"
        ? "The server didn't answer. That's usually a deploy still running, or a network blip."
        : "The search engine runs on the server and needs its keys set there — ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY, in the Netlify environment variables.";

  return (
    <div className="mt-8 border-2 border-granite-900 bg-granite-100/40 p-6 sm:p-8">
      <p className="kicker text-granite-500">Not connected</p>
      <h2 className="font-display text-2xl font-medium mt-1">BeeSearch can't search right now.</h2>
      <p className="text-sm text-granite-700 mt-2 max-w-2xl leading-relaxed">{line}</p>
      <p className="text-sm text-granite-700 mt-3 max-w-2xl leading-relaxed">
        There's nothing to show until it's back — no sample businesses, no stand-in results. Anything
        already in your outbox is below, and copying those doesn't need the engine.
      </p>
      <button type="button" className="btn btn-dark btn-sm mt-4" onClick={onRetry} disabled={checking}>
        {checking ? "Checking…" : "Check again"}
      </button>
    </div>
  );
}

function AddTarget({ onAdd }: { onAdd: (name: string, who: string, kind: BeeSearchKind) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [who, setWho] = useState("");
  const [kind, setKind] = useState<BeeSearchKind>("stockist");
  const [err, setErr] = useState("");

  const submit = () => {
    if (name.trim().length < 2) {
      setErr("Give it a name.");
      return;
    }
    onAdd(name.trim(), who.trim(), kind);
    setName("");
    setWho("");
    setKind("stockist");
    setErr("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-granite-300 p-5 text-left text-granite-500 hover:border-granite-900 hover:text-granite-900 transition-colors"
      >
        <PlusIcon className="w-4 h-4 inline -mt-0.5 mr-1.5" />
        <span className="font-label font-semibold text-sm">Add a target</span>
        <span className="block text-xs mt-1">A new group to go looking for — suppliers, nearby venues, anyone.</span>
      </button>
    );
  }

  return (
    <div className="border-2 border-granite-900 bg-bone p-5">
      <p className="kicker text-granite-500">New target</p>
      <label className="block mt-3">
        <span className="sr-only">Name</span>
        <input autoFocus className="field-input" placeholder="e.g. Event suppliers" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block mt-2">
        <span className="sr-only">Who they are</span>
        <input className="field-input" placeholder="One sentence: who are they?" value={who} onChange={(e) => setWho(e.target.value)} />
      </label>

      <fieldset className="mt-4">
        <legend className="font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-700 mb-2">How should they be scored?</legend>
        <div className="space-y-2">
          {RUBRICS.map((r) => (
            <label
              key={r.value}
              className={`block border p-3 cursor-pointer transition-colors ${kind === r.value ? "border-granite-900 bg-granite-100/60" : "border-granite-300"}`}
            >
              <span className="flex items-start gap-2.5">
                <input type="radio" name="rubric" className="mt-1" checked={kind === r.value} onChange={() => setKind(r.value)} />
                <span>
                  <span className="block font-label font-semibold text-sm">{r.label}</span>
                  <span className="block text-xs text-granite-500 mt-0.5 leading-relaxed">{r.detail}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {err ? <p className="field-error mt-2">{err}</p> : null}
      <div className="flex gap-2 mt-4">
        <button type="button" className="btn btn-dark btn-sm" onClick={submit}>
          Create target
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setErr(""); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function BeeSearchView({ go, openLead }: { go?: (t: Tab) => void; openLead?: (id: string) => void }) {
  const {
    profiles, addProfile, updateProfile, removeProfile,
    addOutbox, outbox, setOutboxState, updateOutboxDraft, convertOutboxToLead,
    leads, tradeOrders, toast,
  } = useStore();

  const [status, setStatus] = useState<EngineStatus | "checking">("checking");
  const [review, setReview] = useState<OutboxItem | null>(null);

  const probe = async () => {
    setStatus("checking");
    setStatus(await getEngineStatus());
  };

  useEffect(() => {
    let cancelled = false;
    void getEngineStatus().then((s) => !cancelled && setStatus(s));
    return () => { cancelled = true; };
  }, []);

  // Keep the open draft in step with the store — editing saves through it.
  const reviewItem = review ? outbox.find((o) => o.id === review.id) ?? null : null;

  /**
   * Turn a found business into a draft: add it to the pipeline, wait for the
   * engine to read its website and score it, then have it write the email.
   */
  const draftFor = async (s: BeeSearchDiscoverySuggestion, target: BeeSearchProfile) => {
    const added = await addSuggestionAsAccount(s.id);
    if (!added.ok) {
      toast(added.error);
      return;
    }

    const enriched = await waitForEnrichment(added.account.id);
    if (!enriched) {
      toast("Added to your pipeline, but scoring is still running. Try writing the draft again in a minute.");
      return;
    }
    if (enriched.enrichmentStatus !== "completed") {
      toast(enriched.errorMessage || "Couldn't read that business's website well enough to write a draft.");
      return;
    }

    const pitch = await generatePitch(enriched.id);
    if (!pitch.ok) {
      toast(pitch.error);
      return;
    }

    const { subject, body } = splitPitch(pitch.pitch, `A note for ${s.accountName}`);
    addOutbox([{
      business: s.accountName,
      contact: "",
      subject,
      body,
      matchedOn: s.reason,
      compositeScore: enriched.compositeScore,
      recommendedStrategy: enriched.recommendedStrategy,
      websiteUrl: enriched.websiteUrl || s.websiteUrl || null,
      emails: enriched.emails ?? s.emails ?? null,
    }]);
    toast(`Draft written for ${s.accountName}. It's in your outbox — nothing has been sent.`);
    void target;
  };

  const convert = (o: OutboxItem) => {
    const lead = convertOutboxToLead(o.id);
    setReview(null);
    if (!lead) return;
    toast(`${o.business} is now an enquiry in the pipeline.`);
    if (openLead && go) {
      go("pipeline");
      openLead(lead.id);
    }
  };

  const connected = status === "connected";

  return (
    <div>
      <p className="kicker text-granite-500">Outreach · BeeSearch</p>
      <div className="flex flex-wrap items-center gap-3 mt-1">
        <h1 className="font-display text-3xl sm:text-4xl font-medium">Go and find the next ones.</h1>
        {status === "checking" ? null : connected ? (
          <span className="text-[0.68rem] font-label font-bold uppercase tracking-[0.08em] border border-ochre text-ochre px-2 py-1">
            Engine connected
          </span>
        ) : (
          <span className="text-[0.68rem] font-label font-bold uppercase tracking-[0.08em] border border-granite-300 text-granite-500 px-2 py-1">
            Not connected
          </span>
        )}
      </div>

      {/* The single most important thing on this page. */}
      <div className="mt-4 border-l-4 border-ochre bg-granite-100/40 px-5 py-4 max-w-3xl">
        <p className="font-label font-semibold text-sm">This tool never sends an email.</p>
        <p className="text-sm text-granite-700 mt-1.5 leading-relaxed">
          There's no mail service connected to this site and no address it could send from. BeeSearch
          finds businesses, reads their websites and writes you a first draft. You copy that into your
          own email and send it yourself — that's the only way anything reaches anyone.
        </p>
      </div>

      {status === "checking" ? (
        <p className="mt-8 text-sm text-granite-500">Checking whether the engine is up…</p>
      ) : connected ? (
        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker text-granite-500">Targets</p>
              <h2 className="font-display text-2xl font-medium mt-1">Who you're looking for.</h2>
            </div>
            <p className="text-xs text-granite-500 max-w-sm sm:text-right leading-relaxed">
              Each target learns from its own five businesses and searches its own patch. Add as many
              as you like.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            {profiles.map((p) => (
              <TargetCard
                key={p.id}
                target={{ ...p, criteria: profileCriteria(p) }}
                onUpdate={(patch) => updateProfile(p.id, patch)}
                onRemove={() => { removeProfile(p.id); toast(`Removed "${p.name}".`); }}
                tradeOrders={tradeOrders}
                leads={leads}
                onDraft={draftFor}
                toast={toast}
              />
            ))}
            <AddTarget
              onAdd={(name, who, kind) => {
                addProfile({ name, who, kind, region: "", businessTypes: [], notes: "", criteria: [] });
                toast(`"${name}" added. Set its region and training list to start searching.`);
              }}
            />
          </div>
        </div>
      ) : (
        <NotConnected status={status} onRetry={probe} checking={false} />
      )}

      <OutboxBoard
        outbox={outbox}
        onOpen={setReview}
        onState={setOutboxState}
        onConvert={convert}
        onViewLead={openLead && go ? (id) => { go("pipeline"); openLead(id); } : undefined}
        toast={toast}
      />

      {reviewItem ? (
        <DraftModal
          item={reviewItem}
          onClose={() => setReview(null)}
          onSave={(patch) => updateOutboxDraft(reviewItem.id, patch)}
          onState={(state) => setOutboxState(reviewItem.id, state)}
          onConvert={() => convert(reviewItem)}
          toast={toast}
        />
      ) : null}
    </div>
  );
}
