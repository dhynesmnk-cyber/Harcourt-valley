import React, { useEffect, useMemo, useState } from "react";
import { fmtDate, fmtDateLong, LEAD_STATUSES, statusLabel, timeAgo, type LeadStatus } from "../../lib/data";
import { useStore } from "../../lib/store";
import { EmptyState, MailIcon, PhoneIcon, SearchIcon, Tick, TypeChip } from "../../components/ui";

function LeadDetail({ leadId, clearFocus }: { leadId: string; clearFocus: () => void }) {
  const { leads, notes, sends, updateLead, moveLead, addNote, toast } = useStore();
  const lead = leads.find((l) => l.id === leadId);
  const [noteBody, setNoteBody] = useState("");

  useEffect(() => setNoteBody(""), [leadId]);

  if (!lead) {
    return (
      <div className="border-2 border-granite-900 p-8 bg-bone">
        <EmptyState title="That enquiry has gone." note="It may have been reset with the demo data." />
      </div>
    );
  }

  const leadNotes = notes.filter((n) => n.leadId === lead.id);
  const leadSends = sends.filter((s) => s.leadId === lead.id);
  const sequenceOn = lead.infoPack && leadSends.length > 0;

  const saveNote = () => {
    if (noteBody.trim().length < 2) return;
    addNote(lead.id, noteBody.trim());
    setNoteBody("");
    toast("Note added.");
  };

  const markBooked = () => {
    moveLead(lead.id, "booked");
    toast(`${lead.names} marked booked — they're on the calendar.`);
  };

  return (
    <div className="border-2 border-granite-900 bg-bone">
      {/* header */}
      <div className="px-6 py-5 border-b-2 border-granite-900 bg-granite-100/50">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={clearFocus} className="btn btn-sm btn-ghost lg:hidden" aria-label="Back to the list">
            ← Back
          </button>
          <h2 className="font-display text-2xl font-medium">{lead.names}</h2>
          <TypeChip type={lead.type} subtype={lead.subtype} />
          <span className="ml-auto text-xs text-granite-500 font-label">
            via {lead.source === "beesearch" ? "BeeSearch outreach" : "the website"} · {timeAgo(lead.createdAt)}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-granite-300">
        {/* left: contact + details */}
        <div className="p-6 space-y-6">
          <div>
            <p className="kicker text-granite-500">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-granite-700">
              <li className="flex items-center gap-3">
                <MailIcon className="w-4 h-4 text-garnet shrink-0" /> {lead.email}
              </li>
              <li className="flex items-center gap-3">
                <PhoneIcon className="w-4 h-4 text-garnet shrink-0" /> {lead.phone}
              </li>
            </ul>
          </div>

          <div>
            <p className="kicker text-granite-500">The day they have in mind</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="border border-granite-300 p-3">
                <dt className="kicker text-granite-500 text-[0.6rem]">Preferred date</dt>
                <dd className="font-label font-semibold mt-1">{fmtDate(lead.preferredDate)}</dd>
              </div>
              <div className="border border-granite-300 p-3">
                <dt className="kicker text-granite-500 text-[0.6rem]">Guests</dt>
                <dd className="font-label font-semibold mt-1">{lead.guestCount ?? "—"}</dd>
              </div>
            </dl>
            {lead.message ? <p className="mt-3 text-sm text-granite-700 leading-relaxed border-l-2 border-granite-300 pl-4 italic">"{lead.message}"</p> : null}
            {lead.wantsVisit ? (
              <p className="mt-3 inline-flex items-center gap-2 text-xs font-label font-semibold uppercase tracking-[0.08em] text-vine border border-vine px-2.5 py-1">
                <Tick className="w-3.5 h-3.5" /> Wants a site visit
              </p>
            ) : null}
          </div>

          <div>
            <p className="kicker text-granite-500">Status</p>
            <select
              className="field-input mt-3"
              value={lead.status}
              onChange={(e) => {
                moveLead(lead.id, e.target.value as LeadStatus);
                toast(`Moved to "${statusLabel(e.target.value as LeadStatus)}".`);
              }}
              aria-label="Enquiry status"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {lead.status === "booked" ? (
              <div className="mt-3">
                <label className="field-label" htmlFor={`bd-${lead.id}`}>
                  Booked date (shown on the calendar)
                </label>
                <input
                  id={`bd-${lead.id}`}
                  type="date"
                  className="field-input"
                  value={lead.bookedDate ?? ""}
                  onChange={(e) => {
                    updateLead(lead.id, { bookedDate: e.target.value || null });
                    toast("Calendar updated.");
                  }}
                />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {lead.status !== "booked" && lead.status !== "archived" ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={markBooked}>
                  Mark booked
                </button>
              ) : null}
              {lead.status !== "archived" ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    moveLead(lead.id, "archived");
                    toast("Archived. Sequence emails to them stop now.");
                  }}
                >
                  Archive
                </button>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveLead(lead.id, "new")}>
                  Bring it back
                </button>
              )}
            </div>
          </div>
        </div>

        {/* right: sequence + notes */}
        <div className="p-6 space-y-6">
          <div>
            <p className="kicker text-granite-500">Info pack emails</p>
            {!sequenceOn ? (
              <p className="text-sm text-granite-500 mt-3">They didn't ask for the info pack, so nothing is scheduled.</p>
            ) : (
              <ul className="mt-3 divide-y divide-granite-300 border border-granite-300">
                {leadSends.map((s) => (
                  <li key={s.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.status === "sent" ? "bg-vine" : "bg-ochre"}`} aria-hidden="true" />
                    <span className="font-label font-semibold text-xs uppercase tracking-[0.08em] text-granite-500 w-24 shrink-0">{s.stepLabel}</span>
                    <span className="truncate flex-1">{s.subject}</span>
                    <span className={`text-xs font-label font-semibold shrink-0 ${s.status === "sent" ? "text-vine" : "text-ochre"}`}>
                      {s.status === "sent" ? "Sent" : fmtDate(s.sendAt.slice(0, 10))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {sequenceOn && (lead.status === "booked" || lead.status === "archived") ? (
              <p className="text-xs text-vine font-medium mt-2 flex items-center gap-2">
                <Tick className="w-3.5 h-3.5" /> Remaining emails stopped automatically — they've {lead.status === "booked" ? "booked" : "been archived"}.
              </p>
            ) : null}
          </div>

          <div>
            <p className="kicker text-granite-500">Notes</p>
            <div className="mt-3 border-2 border-granite-900 bg-granite-100/50 p-3">
              <label className="field-label" htmlFor={`note-${lead.id}`}>
                Add a note
              </label>
              <textarea
                id={`note-${lead.id}`}
                className="field-input min-h-[76px]"
                placeholder="What happened? What's next? Plain words are fine."
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              <button type="button" className="btn btn-dark btn-sm mt-2.5" onClick={saveNote} disabled={noteBody.trim().length < 2}>
                Save the note
              </button>
            </div>
            <ul className="mt-4 space-y-3">
              {leadNotes.length === 0 ? <p className="text-sm text-granite-500">No notes yet. Future-you will thank present-you.</p> : null}
              {leadNotes.map((n) => (
                <li key={n.id} className="border-l-2 border-granite-300 pl-4">
                  <p className="text-sm text-granite-700 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-granite-500 mt-1 font-label">
                    {fmtDateLong(n.createdAt)} · {timeAgo(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadsView({ focusLeadId, clearFocus }: { focusLeadId: string | null; clearFocus: () => void }) {
  const { leads } = useStore();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "wedding" | "event" | "trade">("all");
  const [selectedId, setSelectedId] = useState<string | null>(focusLeadId);

  useEffect(() => {
    if (focusLeadId) setSelectedId(focusLeadId);
  }, [focusLeadId]);

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        if (typeFilter !== "all" && l.type !== typeFilter) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return l.names.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.message ?? "").toLowerCase().includes(q);
      }),
    [leads, query, typeFilter],
  );

  const selected = selectedId ? leads.find((l) => l.id === selectedId) ?? null : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker text-granite-500">Enquiries</p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Everyone who's asked.</h1>
        </div>
        <p className="text-sm text-granite-500">
          {filtered.length} shown · {leads.length} total
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-granite-500" />
          <input className="field-input pl-10" placeholder="Search names, emails, messages…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search enquiries" />
        </div>
        <div className="flex gap-2">
          {(["all", "wedding", "event", "trade"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)} aria-pressed={typeFilter === t} className={`btn btn-sm ${typeFilter === t ? "btn-dark" : "btn-ghost"}`}>
              {t === "all" ? "All" : t === "wedding" ? "Weddings" : t === "event" ? "Events" : "Trade"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[400px_1fr] gap-6 items-start">
        <div className="border-2 border-granite-900 bg-bone max-h-[70svh] overflow-y-auto thin-scroll">
          {filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No enquiries match." note="Try a different search, or clear the filters." />
            </div>
          ) : (
            <ul className="divide-y divide-granite-300">
              {filtered.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(l.id);
                      clearFocus();
                    }}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${selectedId === l.id ? "bg-granite-100" : "hover:bg-granite-100/60"}`}
                    aria-current={selectedId === l.id ? "true" : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-label font-semibold text-sm truncate">{l.names}</p>
                      {l.status === "new" ? <span className="ml-auto text-[0.62rem] font-label font-bold uppercase tracking-[0.08em] bg-garnet text-bone px-1.5 py-0.5 shrink-0">New</span> : null}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <TypeChip type={l.type} subtype={l.subtype} />
                      <span className="text-xs text-granite-500">{statusLabel(l.status)}</span>
                    </div>
                    <p className="mt-1 text-xs text-granite-500">
                      {fmtDate(l.preferredDate)}
                      {l.guestCount ? ` · ${l.guestCount} guests` : ""} · {timeAgo(l.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          {selected ? <LeadDetail leadId={selected.id} clearFocus={() => setSelectedId(null)} /> : <EmptyState title="Pick an enquiry on the left." note="Contact details, status, notes and emails — all in one place." />}
        </div>
      </div>
    </div>
  );
}
