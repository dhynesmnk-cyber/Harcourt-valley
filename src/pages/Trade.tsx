import React, { useState } from "react";
import { Link } from "react-router-dom";
import { IMG, uid } from "../lib/data";
import { validEmail } from "../components/ui";
import { useStore } from "../lib/store";
import { FieldArea, FieldSelect, FieldText, MinusIcon, PlusIcon, Reveal, SectionHead, Tick } from "../components/ui";
import { useApplyAppearance } from "../lib/store";

interface Line {
  key: string;
  productId: string;
  qty: number;
}

export default function Trade() {
  useApplyAppearance();
  const { products, addTradeOrder, toast } = useStore();
  const active = products.filter((p) => p.active);
  const [lines, setLines] = useState<Line[]>([{ key: uid(), productId: active[0]?.id ?? "", qty: 12 }]);
  const [form, setForm] = useState({ business: "", abn: "", contact: "", email: "", phone: "", notes: "", company: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.business.trim().length < 2) errs.business = "Tell us the business name.";
    if (!/^\d{2}\s?\d{3}\s?\d{3}\s?\d{3}$/.test(form.abn.trim())) errs.abn = "An ABN is 11 digits — spaces are fine.";
    if (form.contact.trim().length < 2) errs.contact = "Who should we ask for?";
    if (!validEmail(form.email)) errs.email = "That email doesn't look right.";
    if (form.phone.trim().replace(/[^0-9+]/g, "").length < 8) errs.phone = "A phone number helps when the PO needs a quick word.";
    if (lines.length === 0) errs.lines = "Add at least one line to the order.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (form.company.trim()) return; // honeypot: pretend success, do nothing

    setSending(true);
    window.setTimeout(() => {
      addTradeOrder({
        business: form.business.trim(),
        abn: form.abn.trim(),
        contact: form.contact.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        notes: form.notes.trim(),
      });
      const ref = "PO-" + Math.floor(1000 + Math.random() * 9000);
      setDone(ref);
      setSending(false);
      toast("Trade order received — PO emailed to the family.");
    }, 900);
  };

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
        <p className="num-ghost text-[5rem]">✓</p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium mt-2">Order in the tray.</h1>
        <p className="mt-5 text-granite-700 leading-relaxed max-w-md mx-auto">
          Reference <span className="font-label font-semibold">{done}</span>. The order has been emailed through as a PO and you'll get a copy at{" "}
          <span className="font-semibold">{form.email}</span>. We'll be in touch within two business days with pricing and a delivery window.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setDone(null);
              setForm({ business: "", abn: "", contact: "", email: "", phone: "", notes: "", company: "" });
              setLines([{ key: uid(), productId: active[0]?.id ?? "", qty: 12 }]);
            }}
          >
            Place another order
          </button>
          <Link to="/winery" className="btn btn-ghost">
            Back to the wines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8">
      <SectionHead
        index="01"
        kicker="Trade & stockists"
        title={<>Straight terms, good margin, better wine.</>}
        lead="We deal direct with the publican and the buyer. No accounts, no portals, no tiered pricing puzzle — send the order, we confirm pricing within two business days."
      />

      <div className="mt-12 grid lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 order-2 lg:order-1 space-y-6">
          <Reveal>
            <div className="border-2 border-granite-900 p-6 bg-granite-100/40">
              <p className="kicker text-granite-500">The terms, plainly</p>
              <ul className="mt-4 space-y-3 text-sm text-granite-700">
                {[
                  "Minimum order: 12 bottles, any mix across wine, beer and mead",
                  "Freight free on pallets through Central Victoria; elsewhere at cost",
                  "14-day terms once we know each other; first orders prepaid",
                  "Medal cards and shelf talkers in every case",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Tick className="w-4 h-4 text-vine shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="img-frame border-2 border-granite-900 shadow-hard-sm">
              <img src={IMG.bottles} alt="The full range — wine, beer and mead — on a granite table" className="w-full h-56 object-cover img-in" loading="lazy" />
            </div>
          </Reveal>
          <Reveal delay={160}>
            <blockquote className="border-l-2 border-ochre pl-5">
              <p className="font-display italic text-lg text-granite-900 leading-relaxed">"The Shiraz pours well and the margin's honest. That's the whole pitch, really."</p>
              <footer className="kicker text-granite-500 mt-3">Renata · Lake View Bottle Shop</footer>
            </blockquote>
          </Reveal>
        </div>

        <Reveal delay={80} className="lg:col-span-8 order-1 lg:order-2">
          <form onSubmit={submit} noValidate className="border-2 border-granite-900 bg-bone p-6 sm:p-8">
            <p className="kicker text-granite-500">Trade order form</p>
            <h2 className="font-display text-2xl font-medium mt-1.5">Send us a purchase order</h2>
            <div className="mt-6 grid sm:grid-cols-2 gap-5">
              <FieldText id="tr-business" label="Business name" value={form.business} error={errors.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder="e.g. Lake View Bottle Shop" />
              <FieldText id="tr-abn" label="ABN" value={form.abn} error={errors.abn} onChange={(e) => setForm({ ...form, abn: e.target.value })} placeholder="51 822 461 003" inputMode="numeric" />
              <FieldText id="tr-contact" label="Contact person" value={form.contact} error={errors.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} autoComplete="name" />
              <FieldText id="tr-phone" label="Phone" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" inputMode="tel" />
              <div className="sm:col-span-2">
                <FieldText id="tr-email" label="Email" type="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} hint="The PO confirmation lands here." autoComplete="email" />
              </div>
            </div>

            {/* honeypot — hidden from people, tempting to bots */}
            <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="tr-company">Company (leave blank)</label>
              <input id="tr-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between">
                <p className="field-label mb-0">Line items</p>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setLines([...lines, { key: uid(), productId: active[0]?.id ?? "", qty: 6 }])}>
                  <PlusIcon className="w-3.5 h-3.5" /> Add line
                </button>
              </div>
              {errors.lines ? <p className="field-error mt-2">{errors.lines}</p> : null}
              <ul className="mt-3 space-y-3">
                {lines.map((l, i) => (
                  <li key={l.key} className="grid grid-cols-[1fr_110px_44px] gap-3 items-end">
                    <FieldSelect id={`tr-line-${l.key}`} label={i === 0 ? "Product" : ""} value={l.productId} onChange={(e) => setLine(l.key, { productId: e.target.value })} aria-label={`Line ${i + 1} product`}>
                      {active.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.vintage ? ` ${p.vintage}` : ""} — ${p.type}
                        </option>
                      ))}
                    </FieldSelect>
                    <FieldText id={`tr-qty-${l.key}`} label={i === 0 ? "Qty" : ""} inputMode="numeric" value={l.qty} onChange={(e) => setLine(l.key, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })} aria-label={`Line ${i + 1} quantity`} />
                    <button
                      type="button"
                      className="btn btn-ghost px-0 w-11 mb-0.5"
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      disabled={lines.length === 1}
                      aria-label={`Remove line ${i + 1}`}
                    >
                      <MinusIcon className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-granite-500 mt-2">Quantities are in bottles. Mixed cases are fine — that's the point.</p>
            </div>

            <div className="mt-6">
              <FieldArea id="tr-notes" label="Delivery notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Dock access, delivery days that suit, anything else." />
            </div>

            <button type="submit" className="btn btn-primary w-full sm:w-auto mt-7" disabled={sending}>
              {sending ? "Sending the PO…" : "Send the order"}
            </button>
            <p className="text-xs text-granite-500 mt-3">Goes straight to the family inbox. A copy lands in yours within the minute.</p>
          </form>
        </Reveal>
      </div>
    </div>
  );
}
