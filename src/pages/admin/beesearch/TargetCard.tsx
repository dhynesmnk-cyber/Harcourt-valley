import { useCallback, useEffect, useRef, useState } from "react";
import type { BeeSearchProfile, Lead, TradeOrder } from "../../../lib/data";
import { CloseIcon, PlusIcon, SearchIcon, TrashIcon } from "../../../components/ui";
import {
  addStockist, dismissSuggestion, listDiscoverySuggestions, listStockists, removeTargetTraining,
  runDiscoveryAndWait,
  type BeeSearchDiscoverySuggestion, type BeeSearchStockist,
} from "../../../lib/beesearchEngine";
import { MIN_TRAINING, TrainingSlots } from "./TrainingSlots";
import { DiscoveryResults } from "./DiscoveryResults";

const RUBRIC_LABEL = { stockist: "Buys & resells", referral_partner: "Sends people to us" } as const;

const elapsed = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** Chip editor for the business types a search should look for. */
function TypeChips({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [entry, setEntry] = useState("");

  const add = () => {
    const t = entry.trim();
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setEntry("");
      return;
    }
    onChange([...value, t]);
    setEntry("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-xs font-label font-semibold border border-granite-300 pl-2.5 pr-1.5 py-1">
            {t}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`} className="text-granite-500 hover:text-garnet">
              <CloseIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          className="field-input flex-1"
          placeholder="e.g. independent bottle shop"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
          <PlusIcon className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

export function TargetCard({
  target,
  onUpdate,
  onRemove,
  tradeOrders,
  leads,
  onDraft,
  toast,
}: {
  target: BeeSearchProfile;
  onUpdate: (patch: Partial<Omit<BeeSearchProfile, "id">>) => void;
  onRemove: () => void;
  tradeOrders: TradeOrder[];
  leads: Lead[];
  onDraft: (s: BeeSearchDiscoverySuggestion, target: BeeSearchProfile) => Promise<void>;
  toast: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [training, setTraining] = useState<BeeSearchStockist[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(true);
  const [suggestions, setSuggestions] = useState<BeeSearchDiscoverySuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState<{ elapsedMs: number; found: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [writingId, setWritingId] = useState<number | null>(null);
  const [dismissingId, setDismissingId] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const refreshTraining = useCallback(async () => {
    setLoadingTraining(true);
    const list = await listStockists(target.kind, target.id);
    if (!mounted.current) return;
    setTraining(list);
    setLoadingTraining(false);
  }, [target.kind, target.id]);

  useEffect(() => {
    void refreshTraining();
    void listDiscoverySuggestions(target.kind, target.id).then((list) => {
      if (mounted.current) setSuggestions(list.filter((s) => s.status === "pending"));
    });
  }, [refreshTraining, target.kind, target.id]);

  const trained = training.length >= MIN_TRAINING;

  /* -------- seeding -------- */

  // Trade orders are real businesses with real names, so they make honest
  // training rows. Booked weddings are couples, not businesses — feeding those
  // into a list the engine reads as "find me more like these" would teach it to
  // look for people. What booked weddings genuinely know is the shape of the
  // work: guest counts and where couples travel from. That goes into the
  // search settings instead, which is where the engine can use it.
  const seedFromTrade = async () => {
    setSeeding(true);
    const known = new Set(training.map((t) => t.businessName.toLowerCase()));
    let added = 0;
    for (const t of tradeOrders) {
      if (known.has(t.business.toLowerCase())) continue;
      // Trade orders carry no town or business type, so those stay blank here —
      // the toast below tells the user to fill them in, since they're what the
      // search actually patterns on.
      const created = await addStockist({ businessName: t.business, kind: target.kind, targetId: target.id });
      if (created) {
        known.add(t.business.toLowerCase());
        added++;
      }
    }
    setSeeding(false);
    await refreshTraining();
    toast(added > 0 ? `Added ${added} trade account${added === 1 ? "" : "s"}. Fill in their town and kind to sharpen the search.` : "Every trade account is already on this list.");
  };

  const fillFromBookings = () => {
    const booked = leads.filter((l) => l.status === "booked");
    if (booked.length === 0) {
      toast("No booked events to learn from yet.");
      return;
    }
    const guests = booked.map((l) => l.guestCount).filter((g): g is number => typeof g === "number" && g > 0);
    const weddings = booked.filter((l) => l.type === "wedding").length;
    const parts = [`Learned from ${booked.length} booked event${booked.length === 1 ? "" : "s"}`];
    if (weddings > 0) parts.push(`${weddings} of them weddings`);
    if (guests.length > 0) parts.push(`guest counts between ${Math.min(...guests)} and ${Math.max(...guests)}`);
    onUpdate({ notes: `${parts.join(", ")}. Prioritise businesses that work with events this size.` });
    toast("Filled the search notes from your booked events.");
  };

  /* -------- discovery -------- */

  const findMatches = async () => {
    setSearching(true);
    setSearchError(null);
    setProgress({ elapsedMs: 0, found: 0 });

    const result = await runDiscoveryAndWait(
      {
        targetId: target.id, accountType: target.kind, name: target.name, who: target.who,
        region: target.region, businessTypes: target.businessTypes, notes: target.notes,
      },
      { onTick: (s) => mounted.current && setProgress(s) },
    );

    if (!mounted.current) return;
    setSearching(false);
    setProgress(null);
    if (!result.ok) {
      setSearchError(result.error);
      return;
    }
    setSuggestions(result.suggestions);
  };

  const dismiss = async (s: BeeSearchDiscoverySuggestion) => {
    setDismissingId(s.id);
    const ok = await dismissSuggestion(s.id);
    setDismissingId(null);
    if (!ok) {
      toast("Couldn't save that — try again shortly.");
      return;
    }
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    toast("Noted — BeeSearch will steer away from businesses like that next time.");
  };

  const write = async (s: BeeSearchDiscoverySuggestion) => {
    setWritingId(s.id);
    await onDraft(s, target);
    if (!mounted.current) return;
    setWritingId(null);
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  };

  const remove = async () => {
    await removeTargetTraining(target.id);
    onRemove();
  };

  return (
    <div className="border-2 border-granite-900 bg-bone">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-medium">{target.name}</h3>
            <span className="text-[0.62rem] font-label font-bold uppercase tracking-[0.08em] border border-granite-300 px-1.5 py-0.5 text-granite-500">
              {RUBRIC_LABEL[target.kind]}
            </span>
          </div>
          <p className="text-sm text-granite-700 mt-1 leading-relaxed">{target.who}</p>
          <p className={`text-xs font-label font-semibold mt-2 ${trained ? "text-vine" : "text-granite-500"}`}>
            {loadingTraining ? "Checking the training list…" : `${training.length} of ${MIN_TRAINING} training accounts`}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Done" : "Set up"}
        </button>
      </div>

      {/* search action — always visible, with the reason it's blocked stated in place */}
      <div className="px-5 pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-dark btn-sm" disabled={!trained || searching} onClick={findMatches}>
            <SearchIcon className="w-3.5 h-3.5" /> {searching ? "Searching…" : "Find matches"}
          </button>
          {!trained && !loadingTraining ? (
            <p className="text-xs text-granite-700">
              Add {MIN_TRAINING - training.length} more training account{MIN_TRAINING - training.length === 1 ? "" : "s"} first —{" "}
              <button type="button" className="underline underline-offset-2 font-label font-semibold" onClick={() => setOpen(true)}>
                open the set-up
              </button>
              .
            </p>
          ) : null}
          {searching && progress ? (
            <p className="text-xs text-granite-700 font-label" aria-live="polite">
              {elapsed(progress.elapsedMs)} elapsed · {progress.found} found so far
            </p>
          ) : null}
        </div>

        {searching ? (
          <p className="text-xs text-granite-500 mt-2 leading-relaxed">
            This runs on the server and takes a few minutes — it searches, then reads each business's
            own website before scoring it. You can keep working; results save as they land.
          </p>
        ) : null}

        {searchError ? <p className="field-error mt-2">{searchError}</p> : null}
      </div>

      {/* set-up */}
      {open ? (
        <div className="border-t-2 border-granite-900 p-5 space-y-6 bg-granite-100/40">
          <div>
            <p className="kicker text-granite-500">What to search for</p>
            <p className="text-sm text-granite-700 mt-1.5 leading-relaxed">
              These go straight into the search. The more specific, the better the matches.
            </p>

            <div className="mt-3 space-y-4">
              <label className="block">
                <span className="block font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-700 mb-1.5">Name</span>
                <input className="field-input" value={target.name} onChange={(e) => onUpdate({ name: e.target.value })} />
              </label>

              <label className="block">
                <span className="block font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-700 mb-1.5">Who they are</span>
                <input
                  className="field-input"
                  placeholder="One sentence — who is this target?"
                  value={target.who}
                  onChange={(e) => onUpdate({ who: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="block font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-700 mb-1.5">Where to look</span>
                <input
                  className="field-input"
                  placeholder="Towns, shires or a radius — e.g. within 90 minutes of Harcourt"
                  value={target.region}
                  onChange={(e) => onUpdate({ region: e.target.value })}
                />
                <span className="block text-xs text-granite-500 mt-1">Every search pairs a business type with a place in here.</span>
              </label>

              <div>
                <span className="block font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-700 mb-1.5">Kinds of business</span>
                <TypeChips value={target.businessTypes} onChange={(businessTypes) => onUpdate({ businessTypes })} />
              </div>

              <label className="block">
                <span className="block font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-700 mb-1.5">Anything else</span>
                <textarea
                  className="field-input min-h-[80px]"
                  placeholder="Plain English. Passed to the search as your own instruction."
                  value={target.notes}
                  onChange={(e) => onUpdate({ notes: e.target.value })}
                />
                {target.kind === "referral_partner" ? (
                  <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={fillFromBookings}>
                    Fill from my booked events
                  </button>
                ) : null}
              </label>
            </div>
          </div>

          <div className="border-t border-granite-300 pt-5">
            <TrainingSlots
              targetId={target.id}
              kind={target.kind}
              training={training}
              loading={loadingTraining}
              onChanged={refreshTraining}
              onSeed={target.kind === "stockist" ? seedFromTrade : undefined}
              seedLabel={target.kind === "stockist" ? "Seed from my trade accounts" : undefined}
              seeding={seeding}
              toast={toast}
            />
          </div>

          <div className="border-t border-granite-300 pt-5">
            {confirmRemove ? (
              <div className="border-2 border-garnet p-4">
                <p className="text-sm text-granite-900 leading-relaxed">
                  Remove <strong>{target.name}</strong> and its {training.length} training account
                  {training.length === 1 ? "" : "s"}? Drafts already in your outbox stay where they are.
                </p>
                <div className="flex gap-2 mt-3">
                  <button type="button" className="btn btn-sm bg-garnet text-bone" onClick={remove}>
                    Yes, remove it
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm text-garnet" onClick={() => setConfirmRemove(true)}>
                <TrashIcon className="w-3.5 h-3.5" /> Remove this target
              </button>
            )}
          </div>
        </div>
      ) : null}

      <div className="px-5 pb-5">
        <DiscoveryResults
          suggestions={suggestions}
          writingId={writingId}
          dismissingId={dismissingId}
          onWrite={write}
          onDismiss={dismiss}
        />
      </div>
    </div>
  );
}
