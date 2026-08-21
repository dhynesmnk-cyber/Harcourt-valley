import { useState } from "react";
import type { BeeSearchKind } from "../../../lib/data";
import { CloseIcon, PlusIcon, Tick } from "../../../components/ui";
import { addStockist, removeStockist, type BeeSearchStockist } from "../../../lib/beesearchEngine";

export const MIN_TRAINING = 5;

interface Draft {
  businessName: string;
  websiteUrl: string;
  location: string;
  category: string;
}

const emptyDraft: Draft = { businessName: "", websiteUrl: "", location: "", category: "" };

/**
 * The five training accounts a target needs before it can search.
 *
 * Rendered as numbered slots rather than a count, because the count was the
 * problem: the old screen showed "Stockists trained —" as a read-only tile and
 * hid the one small text field that could change it. Region and business type
 * are collected here too — the engine patterns discovery on exactly those two
 * fields, and nothing was previously sending them.
 */
export function TrainingSlots({
  targetId,
  kind,
  training,
  loading,
  onChanged,
  onSeed,
  seedLabel,
  seeding,
  toast,
}: {
  targetId: string;
  kind: BeeSearchKind;
  training: BeeSearchStockist[];
  loading: boolean;
  onChanged: () => void;
  onSeed?: () => void;
  seedLabel?: string;
  seeding?: boolean;
  toast: (m: string) => void;
}) {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const slotCount = Math.max(MIN_TRAINING, training.length + 1);
  const slots = Array.from({ length: slotCount }, (_, i) => training[i] ?? null);
  const missing = Math.max(0, MIN_TRAINING - training.length);

  const openAdd = (index: number) => {
    setOpenSlot(index);
    setDraft(emptyDraft);
  };

  const save = async () => {
    const businessName = draft.businessName.trim();
    if (businessName.length < 2) {
      toast("Give it a business name first.");
      return;
    }
    setSaving(true);
    const created = await addStockist({
      businessName,
      websiteUrl: draft.websiteUrl.trim() || undefined,
      location: draft.location.trim() || undefined,
      category: draft.category.trim() || undefined,
      kind,
      targetId,
    });
    setSaving(false);
    if (!created) {
      toast("Couldn't save that — try again shortly.");
      return;
    }
    setOpenSlot(null);
    setDraft(emptyDraft);
    onChanged();
  };

  const remove = async (s: BeeSearchStockist) => {
    setRemovingId(s.id);
    const ok = await removeStockist(s.id);
    setRemovingId(null);
    if (!ok) {
      toast("Couldn't remove that — try again shortly.");
      return;
    }
    onChanged();
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="kicker text-granite-500">Training accounts</p>
        {onSeed && seedLabel ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSeed} disabled={seeding}>
            {seeding ? "Adding…" : seedLabel}
          </button>
        ) : null}
      </div>

      <p className="text-sm text-granite-700 mt-1.5 leading-relaxed">
        Real businesses you already work with, or ones you'd love to. BeeSearch reads the pattern in
        these — the kinds of business, the towns they're in — and goes looking for more like them.
      </p>

      {loading ? (
        <p className="text-sm text-granite-500 mt-3">Loading the list…</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {slots.map((s, i) => (
            <li key={s?.id ?? `empty-${i}`}>
              {s ? (
                <div className="flex items-start gap-3 border border-granite-300 bg-bone px-3 py-2.5">
                  <span className="font-label text-xs font-bold text-granite-500 tabular-nums mt-0.5 w-4 shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-label font-semibold text-sm truncate">{s.businessName}</p>
                    <p className="text-xs text-granite-500 mt-0.5 truncate">
                      {[s.location, s.category].filter(Boolean).join(" · ") || "No town or business type set"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    disabled={removingId === s.id}
                    aria-label={`Remove ${s.businessName}`}
                    className="shrink-0 p-1 -m-1 text-granite-500 hover:text-garnet disabled:opacity-50"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : openSlot === i ? (
                <div className="border-2 border-granite-900 bg-bone p-3">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="block">
                      <span className="sr-only">Business name</span>
                      <input
                        autoFocus
                        className="field-input"
                        placeholder="Business name"
                        value={draft.businessName}
                        onChange={(e) => setDraft({ ...draft, businessName: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && save()}
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">Town or area</span>
                      <input
                        className="field-input"
                        placeholder="Town or area — e.g. Castlemaine"
                        value={draft.location}
                        onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && save()}
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">Kind of business</span>
                      <input
                        className="field-input"
                        placeholder={kind === "referral_partner" ? "Kind — e.g. wedding planner" : "Kind — e.g. bottle shop"}
                        value={draft.category}
                        onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && save()}
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">Website</span>
                      <input
                        className="field-input"
                        placeholder="Website (optional)"
                        value={draft.websiteUrl}
                        onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && save()}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-granite-500 mt-2">
                    Only the name is required, but the town and kind are what the search actually learns from.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button type="button" className="btn btn-dark btn-sm" onClick={save} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenSlot(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAdd(i)}
                  className="w-full text-left border border-dashed border-granite-300 px-3 py-2.5 text-sm text-granite-500 hover:border-granite-900 hover:text-granite-900 transition-colors"
                >
                  <span className="font-label text-xs font-bold tabular-nums mr-2">{i + 1}</span>
                  <PlusIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                  {i < MIN_TRAINING ? `Add training account ${i + 1}` : "Add another"}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className={`text-sm mt-3 font-label font-semibold ${missing === 0 ? "text-vine" : "text-granite-700"}`}>
        {missing === 0 ? (
          <>
            <Tick className="w-4 h-4 inline -mt-0.5 mr-1" />
            {training.length} trained — this target can search.
          </>
        ) : (
          `${training.length} of ${MIN_TRAINING} · add ${missing} more and this target can search.`
        )}
      </p>
    </div>
  );
}
