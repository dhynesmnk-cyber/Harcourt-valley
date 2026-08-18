import React, { useMemo, useState } from "react";
import { fmtDate, LEAD_STATUSES, statusLabel, type Lead, type LeadStatus } from "../../lib/data";
import { useStore } from "../../lib/store";
import { EmptyState, TypeChip } from "../../components/ui";

const statusBar: Record<LeadStatus, string> = {
  new: "var(--acc-garnet)",
  info_sent: "var(--acc-ochre)",
  visiting: "var(--acc-vine)",
  negotiating: "var(--color-granite-700)",
  booked: "var(--acc-vine)",
  archived: "var(--color-granite-500)",
};

/* ================= Kanban ================= */

export function KanbanView({ openLead }: { openLead: (id: string) => void }) {
  const { leads, moveLead, toast } = useStore();
  const [overCol, setOverCol] = useState<LeadStatus | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>();
    LEAD_STATUSES.forEach((s) => map.set(s.value, []));
    leads.forEach((l) => map.get(l.status)?.push(l));
    map.forEach((arr) => arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    return map;
  }, [leads]);

  const onDrop = (status: LeadStatus) => {
    setOverCol(null);
    if (!dragId) return;
    const lead = leads.find((l) => l.id === dragId);
    setDragId(null);
    if (!lead || lead.status === status) return;
    moveLead(lead.id, status);
    toast(`${lead.names} → ${statusLabel(status)}.`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker text-granite-500">Pipeline</p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Every enquiry, one board.</h1>
        </div>
        <p className="text-sm text-granite-500">Drag a card to move it. Cards set to "Booked" land on the calendar.</p>
      </div>

      <div className="mt-7 flex gap-4 overflow-x-auto thin-scroll pb-6 -mx-1 px-1">
        {LEAD_STATUSES.map((col) => {
          const cards = byStatus.get(col.value) ?? [];
          return (
            <div
              key={col.value}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.value);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.value ? null : c))}
              onDrop={() => onDrop(col.value)}
              className={`w-[268px] shrink-0 border-2 bg-granite-100/70 flex flex-col transition-colors ${
                overCol === col.value ? "border-granite-900 bg-granite-100" : "border-granite-300"
              }`}
            >
              <div className="h-1.5" style={{ background: statusBar[col.value] }} aria-hidden="true" />
              <div className="px-4 py-3 border-b-2 border-granite-300 flex items-center justify-between">
                <p className="font-label font-semibold text-[0.82rem]">{col.label}</p>
                <span className="text-[0.72rem] font-label font-bold bg-bone border border-granite-900 px-1.5 py-0.5 min-w-[24px] text-center">{cards.length}</span>
              </div>
              <div className="p-3 space-y-3 flex-1 min-h-[140px]">
                {cards.length === 0 ? (
                  <p className="text-xs text-granite-500 text-center pt-6">
                    {col.value === "new" ? "Quiet for now." : col.value === "booked" ? "Drop a card here when it's signed." : "Nothing here."}
                  </p>
                ) : (
                  cards.map((l) => (
                    <article
                      key={l.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", l.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(l.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      className={`kb-card bg-bone border-2 border-granite-900 p-3.5 cursor-grab active:cursor-grabbing ${dragId === l.id ? "opacity-50" : ""}`}
                    >
                      <button type="button" onClick={() => openLead(l.id)} className="w-full text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-label font-semibold text-sm leading-snug">{l.names}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <TypeChip type={l.type} subtype={l.subtype} />
                        </div>
                        <p className="mt-2 text-xs text-granite-500">
                          {fmtDate(l.preferredDate)}
                          {l.guestCount ? ` · ${l.guestCount} guests` : ""}
                          {l.infoPack ? " · pack requested" : ""}
                        </p>
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= Calendar ================= */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({ openLead }: { openLead: (id: string) => void }) {
  const { leads } = useStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const booked = useMemo(() => leads.filter((l) => l.status === "booked" && l.bookedDate), [leads]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(d);
    return out;
  }, [year, month]);

  const isoFor = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const shift = (n: number) => {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const monthName = new Date(year, month, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const bookingsThisMonth = booked.filter((l) => l.bookedDate!.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-granite-500">Booked dates</p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">{monthName}.</h1>
          <p className="text-sm text-granite-500 mt-1.5">
            {bookingsThisMonth.length} booking{bookingsThisMonth.length === 1 ? "" : "s"} this month. Click one for the details.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => shift(-1)} aria-label="Previous month">
            ←
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setYear(now.getFullYear());
              setMonth(now.getMonth());
            }}
          >
            This month
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => shift(1)} aria-label="Next month">
            →
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-5 text-xs font-label font-semibold uppercase tracking-[0.1em] text-granite-500">
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 border border-granite-900" style={{ background: "color-mix(in srgb, var(--acc-ochre) 30%, var(--color-bone))" }} /> Weddings
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 border border-granite-900" style={{ background: "color-mix(in srgb, var(--acc-vine) 30%, var(--color-bone))" }} /> Events
        </span>
      </div>

      <div className="mt-4 border-2 border-granite-900 bg-bone overflow-x-auto thin-scroll">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b-2 border-granite-900 bg-granite-100/70">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-2.5 kicker text-granite-500 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} className="border-b border-r border-granite-300 min-h-[92px] bg-granite-100/30" aria-hidden="true" />;
              const dateIso = isoFor(d);
              const dayBookings = booked.filter((l) => l.bookedDate === dateIso);
              const isToday = dateIso === todayIso;
              return (
                <div
                  key={dateIso}
                  className={`border-b border-r border-granite-300 min-h-[92px] p-1.5 align-top ${isToday ? "bg-granite-100/70 ring-2 ring-inset ring-[var(--acc-garnet)]" : ""}`}
                >
                  <p className={`text-xs font-label font-semibold px-1 ${isToday ? "text-garnet" : "text-granite-500"}`}>{d}</p>
                  <div className="mt-1 space-y-1">
                    {dayBookings.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => openLead(l.id)}
                        className="w-full text-left text-[0.68rem] font-label font-semibold leading-tight px-1.5 py-1 border border-granite-900 truncate hover:-translate-y-px transition-transform"
                        style={{
                          background: `color-mix(in srgb, ${l.type === "wedding" ? "var(--acc-ochre)" : "var(--acc-vine)"} 30%, var(--color-bone))`,
                        }}
                        title={`${l.names} — ${l.type}`}
                      >
                        {l.names}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {booked.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No bookings on the books yet." note="When a card reaches 'Booked' on the pipeline, its date appears here." />
        </div>
      ) : null}
    </div>
  );
}
