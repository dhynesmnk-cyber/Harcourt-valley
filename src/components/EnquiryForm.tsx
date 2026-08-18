import React, { useState } from "react";
import { EVENT_SUBTYPES, type EventSubtype } from "../lib/data";
import { useStore } from "../lib/store";
import { FieldArea, FieldSelect, FieldText, Tick, validEmail } from "./ui";

export function EnquiryForm({ kind, presetSubtype }: { kind: "wedding" | "event"; presetSubtype?: EventSubtype }) {
  const { addLead, toast } = useStore();
  const [subtype, setSubtype] = useState<EventSubtype>(presetSubtype ?? "party");
  const [form, setForm] = useState({ names: "", email: "", phone: "", date: "", guests: "", message: "", company: "" });
  const [infoPack, setInfoPack] = useState(true);
  const [wantsVisit, setWantsVisit] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sentName, setSentName] = useState<string | null>(null);

  // keep parent-driven preset in sync
  React.useEffect(() => {
    if (presetSubtype) setSubtype(presetSubtype);
  }, [presetSubtype]);

  if (sentName) {
    return (
      <div className="border-2 border-granite-900 bg-bone p-8 sm:p-10 text-center rise-in">
        <p className="num-ghost text-[4.5rem]">✓</p>
        <h3 className="font-display text-3xl font-medium mt-2">Got it — talk soon.</h3>
        <p className="mt-4 text-granite-700 max-w-md mx-auto leading-relaxed">
          Thanks, {sentName}. We'll reply within one business day.{" "}
          {infoPack ? "The info pack is on its way now — it arrives as three short emails (today, day 2, day 6) and never more than that." : ""}{" "}
          {wantsVisit ? "We'll suggest a couple of visit times in the same reply." : ""}
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-7"
          onClick={() => {
            setSentName(null);
            setForm({ names: "", email: "", phone: "", date: "", guests: "", message: "", company: "" });
            setInfoPack(true);
            setWantsVisit(false);
          }}
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.names.trim().length < 2) errs.names = "We'd love to know who's asking.";
    if (!validEmail(form.email)) errs.email = "That email doesn't look right — check it once more.";
    if (form.phone.trim().replace(/[^0-9+]/g, "").length < 8) errs.phone = "A phone number helps — dates are easier by text.";
    const g = parseInt(form.guests, 10);
    if (form.guests && (Number.isNaN(g) || g < 1 || g > 400)) errs.guests = "A rough headcount is fine, 1–400.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (form.company.trim()) return; // honeypot

    try {
      const last = Number(localStorage.getItem("hv-enquiry-last") ?? 0);
      if (Date.now() - last < 45000) {
        setErrors({ names: "Hold on — you just sent one. Give it a minute and we'll take the next." });
        return;
      }
    } catch {
      /* private mode: skip the throttle */
    }

    setSending(true);
    window.setTimeout(() => {
      addLead({
        type: kind,
        subtype: kind === "event" ? subtype : undefined,
        names: form.names.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        preferredDate: form.date || null,
        guestCount: form.guests ? parseInt(form.guests, 10) : null,
        message: form.message.trim(),
        infoPack,
        wantsVisit,
      });
      try {
        localStorage.setItem("hv-enquiry-last", String(Date.now()));
      } catch {
        /* ignore */
      }
      setSentName(form.names.trim().split(/[\s&]+/)[0]);
      setSending(false);
      toast("Enquiry received — it's on the family dashboard now.");
    }, 800);
  };

  return (
    <form onSubmit={submit} noValidate className="border-2 border-granite-900 bg-bone p-6 sm:p-8">
      <div className="grid sm:grid-cols-2 gap-5">
        <FieldText id={`en-names-${kind}`} label={kind === "wedding" ? "Both your names" : "Your name (or the host's)"} value={form.names} error={errors.names} onChange={(e) => setForm({ ...form, names: e.target.value })} placeholder="e.g. Priya & Daniel" />
        <FieldText id={`en-email-${kind}`} label="Email" type="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        <FieldText id={`en-phone-${kind}`} label="Phone" inputMode="tel" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
        <FieldText id={`en-date-${kind}`} label={kind === "wedding" ? "Preferred date (rough is fine)" : "Preferred date"} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <FieldText id={`en-guests-${kind}`} label="Guest count" inputMode="numeric" value={form.guests} error={errors.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} placeholder={kind === "wedding" ? "e.g. 110" : "e.g. 60"} />
        {kind === "event" ? (
          <FieldSelect id="en-subtype" label="Event type" value={subtype} onChange={(e) => setSubtype(e.target.value as EventSubtype)}>
            {EVENT_SUBTYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </FieldSelect>
        ) : (
          <div className="hidden sm:block" aria-hidden="true" />
        )}
      </div>

      <div className="mt-5">
        <FieldArea id={`en-msg-${kind}`} label="Tell us about the day (optional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Season, style, anything you already know. Rough notes are fine." />
      </div>

      {/* honeypot */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor={`en-company-${kind}`}>Company (leave blank)</label>
        <input id={`en-company-${kind}`} tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={infoPack} onChange={(e) => setInfoPack(e.target.checked)} className="mt-1 w-5 h-5 accent-[var(--acc-vine)]" />
          <span className="text-sm text-granite-700">
            <span className="font-label font-semibold uppercase tracking-[0.08em] text-[0.72rem]">Send the info pack</span>
            <br />
            Three short emails — the pack today, FAQs on day 2, an invitation to visit on day 6. No spam after that.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={wantsVisit} onChange={(e) => setWantsVisit(e.target.checked)} className="mt-1 w-5 h-5 accent-[var(--acc-vine)]" />
          <span className="text-sm text-granite-700">
            <span className="font-label font-semibold uppercase tracking-[0.08em] text-[0.72rem]">Book a visit</span>
            <br />
            An hour in the valley, tasting on us. The fastest way to know if it's the one.
          </span>
        </label>
      </div>

      <button type="submit" className="btn btn-primary w-full sm:w-auto mt-7" disabled={sending}>
        {sending ? "Sending…" : "Send the enquiry"}
      </button>
      <p className="text-xs text-granite-500 mt-3 flex items-center gap-2">
        <Tick className="w-3.5 h-3.5 text-vine" /> Goes straight to the family inbox. No mailing lists, no tracking pixels.
      </p>
    </form>
  );
}
