import React, { useEffect, useState } from "react";
import type { Sequence, SequenceStep } from "../../lib/data";
import { useStore } from "../../lib/store";
import { CloseIcon, MailIcon } from "../../components/ui";

function SequenceCard({ seq }: { seq: Sequence }) {
  const { updateSequence, toggleSequence, toast, sends } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SequenceStep[]>(seq.steps);
  const [preview, setPreview] = useState<SequenceStep | null>(null);

  useEffect(() => setDraft(seq.steps), [seq]);

  const sentCount = sends.filter((s) => s.status === "sent" && s.subject && seq.steps.some((st) => st.subject === s.subject)).length;

  const save = () => {
    updateSequence(seq.id, draft.map((s, i) => ({ ...s, order: i + 1, delayDays: Math.max(0, s.delayDays) })));
    setEditing(false);
    toast(`"${seq.name}" saved. New enquiries get the updated emails.`);
  };

  return (
    <div className="border-2 border-granite-900 bg-bone">
      <div className="px-6 py-4 border-b-2 border-granite-900 flex flex-wrap items-center gap-3 bg-granite-100/50">
        <div>
          <h2 className="font-display text-xl font-medium">{seq.name}</h2>
          <p className="text-xs text-granite-500 font-label mt-0.5">
            For {seq.audience === "wedding" ? "wedding" : "event"} enquiries · {seq.steps.length} emails · {sentCount} sent to date
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <span className={`text-[0.68rem] font-label font-bold uppercase tracking-[0.08em] px-2 py-1 border ${seq.active ? "border-vine text-vine" : "border-granite-500 text-granite-500"}`}>
            {seq.active ? "Running" : "Paused"}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              toggleSequence(seq.id);
              toast(seq.active ? `"${seq.name}" paused — no new emails will be scheduled.` : `"${seq.name}" is running again.`);
            }}
          >
            {seq.active ? "Pause" : "Resume"}
          </button>
          {!editing ? (
            <button type="button" className="btn btn-sm btn-dark" onClick={() => setEditing(true)}>
              Edit emails
            </button>
          ) : null}
        </div>
      </div>

      <ul className="divide-y divide-granite-300">
        {draft.map((step, i) => (
          <li key={step.id} className="p-5">
            {editing ? (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-[110px_1fr] gap-3">
                  <div>
                    <label className="field-label" htmlFor={`d-${seq.id}-${step.id}`}>
                      Send after
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`d-${seq.id}-${step.id}`}
                        type="number"
                        min={0}
                        max={30}
                        className="field-input"
                        value={step.delayDays}
                        onChange={(e) => setDraft((ds) => ds.map((s) => (s.id === step.id ? { ...s, delayDays: parseInt(e.target.value, 10) || 0 } : s)))}
                      />
                      <span className="text-xs text-granite-500 font-label">days</span>
                    </div>
                  </div>
                  <div>
                    <label className="field-label" htmlFor={`s-${seq.id}-${step.id}`}>
                      Subject
                    </label>
                    <input
                      id={`s-${seq.id}-${step.id}`}
                      className="field-input"
                      value={step.subject}
                      onChange={(e) => setDraft((ds) => ds.map((s) => (s.id === step.id ? { ...s, subject: e.target.value } : s)))}
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor={`b-${seq.id}-${step.id}`}>
                    Email body
                  </label>
                  <textarea
                    id={`b-${seq.id}-${step.id}`}
                    className="field-input min-h-[130px] font-mono text-[0.82rem]"
                    value={step.body}
                    onChange={(e) => setDraft((ds) => ds.map((s) => (s.id === step.id ? { ...s, body: e.target.value } : s)))}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-4">
                <span className="shrink-0 border-2 border-granite-900 bg-granite-100 px-2.5 py-1.5 text-center min-w-[76px]">
                  <span className="block font-display text-lg font-medium leading-none">{step.delayDays}</span>
                  <span className="block kicker text-granite-500 text-[0.55rem] mt-1">day{step.delayDays === 1 ? "" : "s"}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-label font-semibold text-sm">{step.subject}</p>
                  <p className="text-sm text-granite-500 mt-1 line-clamp-2">{step.body.split("\n").filter(Boolean).slice(0, 2).join(" ")}</p>
                </div>
                <button type="button" className="btn btn-sm btn-ghost shrink-0" onClick={() => setPreview(step)}>
                  <MailIcon className="w-4 h-4" /> Preview
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="px-5 py-4 border-t-2 border-granite-900 flex flex-wrap gap-3 bg-granite-100/50">
          <button type="button" className="btn btn-primary btn-sm" onClick={save}>
            Save this sequence
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <p className="text-xs text-granite-500 self-center">"Day 0" sends the moment someone asks for the pack.</p>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <button type="button" aria-label="Close preview" className="absolute inset-0 bg-granite-900/60 fade-in cursor-default" onClick={() => setPreview(null)} />
          <div className="rise-in relative bg-bone border-2 border-granite-900 shadow-hard w-full max-w-xl max-h-[85svh] overflow-y-auto thin-scroll" role="dialog" aria-modal="true">
            <div className="px-6 py-4 border-b-2 border-granite-900 flex items-center justify-between bg-granite-100/50">
              <p className="kicker text-granite-500">Preview · exactly as it lands in their inbox</p>
              <button type="button" className="btn btn-sm btn-ghost px-3" onClick={() => setPreview(null)} aria-label="Close">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-granite-500 font-label">From: Tom · Harcourt Valley Vineyards</p>
              <p className="font-label font-semibold mt-2">{preview.subject}</p>
              <div className="mt-4 pt-4 border-t border-granite-300 text-sm text-granite-700 leading-relaxed whitespace-pre-line">{preview.body}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SequencesView() {
  const { sequences } = useStore();
  return (
    <div>
      <p className="kicker text-granite-500">Email sequences</p>
      <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">The follow-up, on autopilot.</h1>
      <p className="text-sm text-granite-500 mt-2 max-w-xl">
        When someone asks for an info pack, these emails go out on schedule. Edit the words or the delays below — changes apply to new enquiries only, and nothing sends once a
        couple has booked.
      </p>
      <div className="mt-7 space-y-8">
        {sequences.map((s) => (
          <SequenceCard key={s.id} seq={s} />
        ))}
      </div>
    </div>
  );
}
