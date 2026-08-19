import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useStore } from "../lib/store";
import { fmtDate, money } from "../lib/data";
import { validEmail } from "./ui";
import { ArrowRight, BasketIcon, CloseIcon, FieldText, MailIcon, MenuIcon, MinusIcon, PhoneIcon, PinIcon, Tick } from "./ui";

/* ---------------- wordmark ---------------- */

export function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className={`grid place-items-center w-10 h-10 border-2 ${dark ? "border-bone text-bone" : "border-granite-900 text-granite-900"}`}>
        <span className="font-display italic font-medium text-lg leading-none pt-0.5">HV</span>
      </span>
      <span className="leading-none">
        <span className={`block font-label font-bold tracking-[0.18em] text-[0.82rem] ${dark ? "text-bone" : "text-granite-900"}`}>HARCOURT VALLEY</span>
        <span className={`block font-label tracking-[0.3em] text-[0.56rem] mt-1 ${dark ? "text-granite-300" : "text-granite-500"}`}>VINEYARDS · HARCOUrt, VIC</span>
      </span>
    </span>
  );
}

/* ---------------- header ---------------- */

const NAV = [
  { to: "/winery", label: "Winery" },
  { to: "/weddings", label: "Weddings" },
  { to: "/events", label: "Events" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartCount, setCartOpen } = useStore();
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById("main");
          el?.focus();
          el?.scrollIntoView();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-garnet focus:text-bone focus:px-4 focus:py-2 focus:font-label focus:text-sm"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 bg-bone/95 backdrop-blur-[2px] border-b-2 border-granite-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">
          <Link to="/" aria-label="Harcourt Valley Vineyards — home">
            <Wordmark />
          </Link>
          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link kicker text-granite-900 ${isActive ? "" : "text-granite-700"}`} data-active={location.pathname.startsWith(n.to)}>
                {n.label}
              </NavLink>
            ))}
            <button type="button" onClick={() => setCartOpen(true)} className="relative btn btn-sm btn-ghost" aria-label={`Open cart, ${cartCount} bottles`}>
              <BasketIcon className="w-4.5 h-4.5" />
              Case
              {cartCount > 0 ? (
                <span className="absolute -top-2.5 -right-2.5 grid place-items-center min-w-[22px] h-[22px] bg-garnet text-bone font-label text-[0.68rem] font-bold border-2 border-granite-900 px-0.5">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <Link to="/winery/trade" className="btn btn-sm btn-dark">
              Trade
            </Link>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <button type="button" onClick={() => setCartOpen(true)} className="relative btn btn-sm btn-ghost px-3" aria-label={`Open cart, ${cartCount} bottles`}>
              <BasketIcon className="w-5 h-5" />
              {cartCount > 0 ? (
                <span className="absolute -top-2 -right-2 grid place-items-center min-w-[20px] h-[20px] bg-garnet text-bone font-label text-[0.65rem] font-bold border-2 border-granite-900">
                  {cartCount}
                </span>
              ) : null}
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} className="btn btn-sm btn-ghost px-3" aria-label="Open menu" aria-expanded={menuOpen}>
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] bg-granite-900 text-bone flex flex-col" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="h-[72px] px-4 sm:px-6 flex items-center justify-between border-b border-granite-700">
            <Wordmark dark />
            <button type="button" onClick={() => setMenuOpen(false)} className="btn btn-sm text-bone border-bone/60 hover:bg-granite-700" aria-label="Close menu">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 flex flex-col justify-center px-8 gap-2" aria-label="Mobile">
            {[{ to: "/", label: "Home" }, ...NAV].map((n, idx) => (
              <Link key={n.to} to={n.to} className="rise-in group flex items-baseline gap-4 py-2 border-b border-granite-700" style={{ animationDelay: `${idx * 70}ms` }}>
                <span className="block w-8 h-[2px] self-center bg-gradient-to-r from-garnet to-ochre" aria-hidden="true" />
                <span className="font-display text-4xl sm:text-5xl font-medium group-hover:italic group-hover:text-ochre transition-colors">{n.label}</span>
                <ArrowRight className="w-6 h-6 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </nav>
          <div className="px-8 pb-10 grid sm:grid-cols-2 gap-4 text-sm text-granite-300">
            <p className="flex items-center gap-2.5">
              <PinIcon className="w-4 h-4 text-ochre" /> 41 Schoolhouse Rd, Harcourt VIC 3453
            </p>
            <p className="flex items-center gap-2.5">
              <PhoneIcon className="w-4 h-4 text-ochre" /> (03) 5474 2210
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------------- footer ---------------- */

export function Footer() {
  return (
    <footer className="bg-granite-900 text-bone mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <Wordmark dark />
          <p className="mt-6 text-sm leading-relaxed text-granite-300 max-w-xs">
            A family vineyard on granite country. We grow it, make it and pour it — 30 minutes from Bendigo, 90 from Melbourne.
          </p>
          <p className="mt-6 text-xs leading-relaxed text-granite-500 max-w-xs border-l-2 border-granite-700 pl-4">
            We acknowledge the Dja Dja Wurrung people, Traditional Owners of the land on which we grow and make our wine, and pay respect to Elders past and present.
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="kicker text-granite-500">Cellar door</p>
          <ul className="mt-4 space-y-2 text-sm text-granite-300">
            <li className="flex gap-2.5 items-start">
              <PinIcon className="w-4 h-4 mt-0.5 text-ochre shrink-0" /> 41 Schoolhouse Rd, Harcourt VIC 3453
            </li>
            <li className="flex gap-2.5 items-start">
              <PhoneIcon className="w-4 h-4 mt-0.5 text-ochre shrink-0" /> (03) 5474 2210
            </li>
            <li className="flex gap-2.5 items-start">
              <MailIcon className="w-4 h-4 mt-0.5 text-ochre shrink-0" /> hello@harcourtvalley.example
            </li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="kicker text-granite-500">Hours</p>
          <ul className="mt-4 space-y-1.5 text-sm text-granite-300">
            <li>Fri – Sun</li>
            <li className="font-label font-semibold text-bone">11am – 5pm</li>
            <li className="text-granite-500">Tastings $10, waived with purchase</li>
            <li className="text-granite-500">Functions by arrangement</li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="kicker text-granite-500">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { to: "/winery", label: "The winery & shop" },
              { to: "/winery/trade", label: "Trade & stockists" },
              { to: "/weddings", label: "Weddings in the vines" },
              { to: "/events", label: "Events & long tables" },
              { to: "/admin", label: "Family office (admin)" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-granite-300 hover:text-bone underline decoration-granite-700 underline-offset-4 hover:decoration-ochre transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-granite-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between text-xs text-granite-500">
          <p>© {new Date().getFullYear()} Harcourt Valley Vineyards Pty Ltd · ABN 64 118 220 941 · Licensed</p>
          <p className="font-label tracking-[0.14em] uppercase">Granite country · Central Victoria</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- variant toggle (client preview, home only) ---------------- */

export function VariantToggle({ variant, onChange }: { variant: string; onChange: (v: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 border-2 border-granite-900 bg-bone shadow-hard-sm px-3 py-2">
      <p className="kicker text-granite-500 text-[0.58rem]">Client preview · layout</p>
      <div className="mt-1.5 flex border-2 border-granite-900" role="group" aria-label="Home page layout variant">
        {[
          { v: "a", label: "A · Triptych" },
          { v: "b", label: "B · Classic" },
        ].map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={variant === o.v}
            className={`px-3 py-1.5 font-label text-[0.68rem] font-semibold uppercase tracking-[0.08em] transition-colors ${
              variant === o.v ? "bg-granite-900 text-bone" : "text-granite-700 hover:bg-granite-100"
            } ${o.v === "b" ? "border-l-2 border-granite-900" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- toasts ---------------- */

export function ToastHost() {
  const { toasts } = useStore();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[95] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast-in flex items-center gap-3 bg-granite-900 text-bone border-2 border-bone/20 px-5 py-3 shadow-hard-sm max-w-[92vw]">
          <Tick className="w-4 h-4 text-ochre shrink-0" />
          <p className="text-sm font-medium">{t.msg}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- cart drawer + demo checkout ---------------- */

type CartStep = "cart" | "details" | "processing" | "done";

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, products, setCartQty, removeLine, cartTotalCents, cartCount, placeOrder, toast } = useStore();
  const [step, setStep] = useState<CartStep>("cart");
  const [form, setForm] = useState({ name: "", email: "", address: "", postcode: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderRef, setOrderRef] = useState("");

  const lines = useMemo(
    () =>
      cart
        .map((l) => {
          const p = products.find((x) => x.id === l.productId);
          return p ? { ...l, product: p } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [cart, products],
  );

  useEffect(() => {
    if (cartOpen) {
      setStep("cart");
      setErrors({});
    }
  }, [cartOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCartOpen]);

  if (!cartOpen) return null;

  const pay = () => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "We need a name for the delivery label.";
    if (!validEmail(form.email)) errs.email = "That email doesn't look right — check it once more.";
    if (form.address.trim().length < 6) errs.address = "A street address helps the courier find you.";
    if (!/^\d{4}$/.test(form.postcode.trim())) errs.postcode = "Postcode is four digits, e.g. 3453.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep("processing");
    window.setTimeout(() => {
      const order = placeOrder(form.name.trim(), form.email.trim());
      if (order) {
        setOrderRef(order.id.toUpperCase());
        setStep("done");
        toast("Order paid — confirmation email sent.");
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Close cart" onClick={() => setCartOpen(false)} className="absolute inset-0 bg-granite-900/55 fade-in cursor-default" />
      <aside className="drawer-in absolute right-0 top-0 h-full w-full max-w-md bg-bone border-l-2 border-granite-900 flex flex-col" role="dialog" aria-modal="true" aria-label="Your case">
        <div className="h-[64px] px-5 flex items-center justify-between border-b-2 border-granite-900 shrink-0">
          <h2 className="font-display text-2xl font-medium">{step === "done" ? "On its way" : "Your case"}</h2>
          <button type="button" onClick={() => setCartOpen(false)} className="btn btn-sm btn-ghost px-3" aria-label="Close cart">
            <CloseIcon className="w-4.5 h-4.5" />
          </button>
        </div>

        {step === "cart" || step === "details" ? (
          <>
            <div className="flex-1 overflow-y-auto thin-scroll px-5 py-4">
              {lines.length === 0 ? (
                <div className="text-center py-16">
                  <p className="font-display text-2xl">Nothing here yet.</p>
                  <p className="text-sm text-granite-500 mt-2">The cellar door shelf is a short walk away.</p>
                  <Link to="/winery" onClick={() => setCartOpen(false)} className="btn btn-primary btn-sm mt-6">
                    Browse the wines
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-granite-300">
                  {lines.map((l) => (
                    <li key={l.productId} className="py-4 flex items-center gap-4">
                      <div className="w-12 shrink-0 grid place-items-center bg-granite-100 border-2 border-granite-900 py-1">
                        <span className="font-display italic text-xs text-center leading-tight">{l.product.name.split(" ")[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-label font-semibold text-sm truncate">
                          {l.product.name} {l.product.vintage ?? ""}
                        </p>
                        <p className="text-xs text-granite-500">{money(l.product.priceCents)} each</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" className="btn btn-sm btn-ghost px-2.5 min-h-[34px]" onClick={() => setCartQty(l.productId, l.qty - 1)} aria-label={`One fewer ${l.product.name}`}>
                            <MinusIcon className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-label font-semibold text-sm w-6 text-center">{l.qty}</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost px-2.5 min-h-[34px]"
                            onClick={() => setCartQty(l.productId, Math.min(12, l.qty + 1))}
                            aria-label={`One more ${l.product.name}`}
                          >
                            <span className="font-label text-sm leading-none">+</span>
                          </button>
                          <button type="button" onClick={() => removeLine(l.productId)} className="ml-auto text-xs text-granite-500 underline underline-offset-2 hover:text-garnet">
                            Remove
                          </button>
                        </div>
                      </div>
                      <p className="font-label font-semibold text-sm shrink-0">{money(l.product.priceCents * l.qty)}</p>
                    </li>
                  ))}
                </ul>
              )}
              {step === "details" && lines.length > 0 ? (
                <div className="mt-2 border-2 border-granite-900 bg-granite-100/60 p-5 space-y-4 rise-in">
                  <p className="kicker text-granite-500">Delivery details</p>
                  <FieldText id="co-name" label="Full name" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                  <FieldText id="co-email" label="Email" type="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} hint="The receipt lands here." autoComplete="email" />
                  <FieldText id="co-address" label="Street address" value={form.address} error={errors.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" />
                  <FieldText id="co-postcode" label="Postcode" inputMode="numeric" value={form.postcode} error={errors.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} autoComplete="postal-code" />
                </div>
              ) : null}
            </div>
            {lines.length > 0 ? (
              <div className="border-t-2 border-granite-900 p-5 shrink-0">
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="kicker text-granite-500">Subtotal · {cartCount} bottles</span>
                  <span className="font-display text-2xl font-medium">{money(cartTotalCents)}</span>
                </div>
                <p className="text-xs text-granite-500 mb-4">{cartCount >= 6 ? "Six or more bottles — freight's on us." : "Freight is a flat $12, added at checkout."}</p>
                {step === "cart" ? (
                  <button type="button" className="btn btn-primary w-full" onClick={() => setStep("details")}>
                    Checkout <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <button type="button" className="btn btn-primary w-full" onClick={pay}>
                      Pay {money(cartTotalCents + (cartCount >= 6 ? 0 : 1200))} — demo checkout
                    </button>
                    <button type="button" className="btn btn-ghost w-full" onClick={() => setStep("cart")}>
                      Back to the case
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : null}

        {step === "processing" ? (
          <div className="flex-1 grid place-items-center px-8 text-center">
            <div>
              <div className="mx-auto w-12 h-12 border-2 border-granite-900 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <p className="font-display text-2xl mt-6">Talking to the bank…</p>
              <p className="text-sm text-granite-500 mt-1.5">Demo checkout — no card required, nothing charged.</p>
            </div>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="flex-1 overflow-y-auto thin-scroll px-6 py-10 text-center rise-in">
            <p className="num-ghost text-[5rem]">✓</p>
            <p className="font-display text-3xl font-medium mt-2">On its way.</p>
            <p className="text-sm text-granite-700 mt-3 max-w-xs mx-auto">
              Order <span className="font-label font-semibold">{orderRef}</span> is packed for dispatch. A confirmation email is on its way to{" "}
              <span className="font-semibold">{form.email}</span>.
            </p>
            <div className="mt-8 space-y-3">
              <button type="button" className="btn btn-dark w-full" onClick={() => setCartOpen(false)}>
                Back to the valley
              </button>
              <p className="text-xs text-granite-500">Stock levels updated the moment payment cleared.</p>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

/* ---------------- scroll restoration ---------------- */

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }), [pathname]);
  return null;
}

export function fmtDateSafe(s: string | null): string {
  return fmtDate(s);
}
