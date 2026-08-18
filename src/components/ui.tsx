import React, { useEffect, useRef, useState } from "react";
import type { LeadType, Product } from "../lib/data";

/* ---------------- scroll reveal ---------------- */

export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            obs.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------------- section header with index numeral ---------------- */

export function SectionHead({
  kicker,
  title,
  lead,
  dark = false,
  className = "",
  as: Heading = "h2",
}: {
  kicker: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  dark?: boolean;
  className?: string;
  /** Use "h1" when this heading is the page's only top-level one. */
  as?: "h1" | "h2";
}) {
  return (
    <Reveal className={className}>
      <div className="min-w-0">
        {/* A short garnet-to-ochre hairline carries the structure the index
            numeral used to, without shouting a number at anyone. */}
        <span className="block w-12 h-[2px] bg-gradient-to-r from-garnet to-ochre" aria-hidden="true" />
        <p className={`kicker mt-4 ${dark ? "text-granite-300" : "text-granite-500"}`}>{kicker}</p>
        <Heading className={`font-display text-3xl sm:text-5xl font-medium leading-[1.05] mt-2 ${dark ? "text-bone" : "text-granite-900"}`}>{title}</Heading>
        {lead ? (
          <p className={`mt-3 max-w-xl text-[0.98rem] leading-relaxed ${dark ? "text-granite-300" : "text-granite-700"}`} data-speakable>
            {lead}
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}

/* ---------------- custom inline icons (stroke, 1.75px) ---------------- */

function I({ children, className = "w-4 h-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const ArrowRight = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M3.5 12h16M14 5.5l6.5 6.5-6.5 6.5" />
  </I>
);
export const ArrowUpRight = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M6.5 17.5 17.5 6.5M8.5 6.5h9v9" />
  </I>
);
export const Tick = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M4 12.5l5 5L19.5 7" />
  </I>
);
export const PhoneIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M5.5 4h4l1.5 4.5-2.2 1.6a12.5 12.5 0 0 0 5.1 5.1l1.6-2.2L20 14.5v4a1.8 1.8 0 0 1-2 1.8C10.5 19.6 4.4 13.5 3.7 6a1.8 1.8 0 0 1 1.8-2Z" />
  </I>
);
export const MailIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <rect x="3.5" y="5.5" width="17" height="13" />
    <path d="m4 7 8 6.5L20 7" />
  </I>
);
export const PinIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" />
    <circle cx="12" cy="9.8" r="2.3" />
  </I>
);
export const ClockIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 2" />
  </I>
);
export const BasketIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M4 9h16l-1.6 10.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8L4 9Z" />
    <path d="M8.5 9V7.5a3.5 3.5 0 0 1 7 0V9" />
  </I>
);
export const MenuIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </I>
);
export const CloseIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </I>
);
export const GrapeIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <circle cx="9" cy="13" r="2.6" />
    <circle cx="15" cy="13" r="2.6" />
    <circle cx="12" cy="17.5" r="2.6" />
    <path d="M12 10.5V7c0-2 1.5-3 3.5-3" />
  </I>
);
export const RingIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <circle cx="12" cy="14.5" r="5.5" />
    <path d="m9.5 6.5 2.5-3 2.5 3-2.5 2.5Z" />
  </I>
);
export const TableIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M3.5 9h17M5.5 9v9M18.5 9v9M3.5 9 5 5.5h14L20.5 9" />
  </I>
);
export const PlusIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M12 5v14M5 12h14" />
  </I>
);
export const MinusIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M5 12h14" />
  </I>
);
export const TrashIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
    <path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" />
    <path d="M10.5 10v6.5M13.5 10v6.5" />
  </I>
);
export const SendIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <path d="M20 4 10 14M20 4l-6.5 16-3.5-6L4 10.5 20 4Z" />
  </I>
);
export const SearchIcon = ({ className }: { className?: string }) => (
  <I className={className}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15.5 15.5 4.5 4.5" />
  </I>
);

/* ---------------- type chip ---------------- */

const typeMeta: Record<LeadType, { label: string; color: string }> = {
  wedding: { label: "Wedding", color: "var(--acc-ochre)" },
  event: { label: "Event", color: "var(--acc-vine)" },
  trade: { label: "Trade", color: "var(--color-granite-500)" },
};

export function TypeChip({ type, subtype }: { type: LeadType; subtype?: string }) {
  const m = typeMeta[type];
  return (
    <span className="inline-flex items-center gap-1.5 border-2 border-granite-900 bg-bone px-2 py-0.5 text-[0.68rem] font-label font-semibold uppercase tracking-[0.1em]">
      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} aria-hidden="true" />
      {m.label}
      {subtype ? <span className="text-granite-500 normal-case tracking-normal font-medium">· {subtype}</span> : null}
    </span>
  );
}

/* ---------------- form field wrappers ---------------- */

export function FieldText({
  id,
  label,
  error,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; hint?: string }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="field-input" aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[0.78rem] text-granite-500 mt-1.5">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FieldArea({
  id,
  label,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; error?: string }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} className="field-input min-h-[110px] resize-y" aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FieldSelect({
  id,
  label,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; error?: string }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="field-input" aria-invalid={error ? "true" : undefined} {...props}>
        {children}
      </select>
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/* ---------------- in-page anchor link (HashRouter-safe) ---------------- */

export function AnchorLink({ to, className = "", children }: { to: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        document.getElementById(to)?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      {children}
    </a>
  );
}

/* ---------------- contour divider (organic signature) ---------------- */

export function ContourDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 70" preserveAspectRatio="none" className={`w-full h-10 sm:h-14 ${className}`} aria-hidden="true">
      <path d="M0 42 C150 18 300 60 450 40 S750 16 900 42 S1120 60 1200 34" fill="none" stroke="var(--color-granite-300)" strokeWidth="1.2" />
      <path d="M0 56 C180 34 360 68 540 52 S840 30 1020 54 S1160 64 1200 50" fill="none" stroke="var(--color-granite-300)" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/* ---------------- the bottle: bespoke SVG product art ---------------- */

const bottleGlass: Record<Product["type"], { glass: string; cap: string }> = {
  wine: { glass: "#3b272c", cap: "var(--acc-garnet)" },
  beer: { glass: "#7a4d20", cap: "var(--acc-vine)" },
  mead: { glass: "#a97f35", cap: "var(--acc-ochre)" },
};

export function BottleArt({ product, className = "" }: { product: Product; className?: string }) {
  const c = bottleGlass[product.type];
  const nameLines = product.name.length > 14 ? [product.name.slice(0, 14), product.name.slice(14).trim()] : [product.name];
  return (
    <svg viewBox="0 0 120 300" className={className} role="img" aria-label={`${product.name}${product.vintage ? " " + product.vintage : ""} bottle`}>
      <rect x="47" y="6" width="26" height="20" rx="2" fill={c.cap} stroke="var(--color-granite-900)" strokeWidth="2" />
      <path
        d="M50 26h20v50c0 14 18 22 18 44v148a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V120c0-22 18-30 18-44V26Z"
        fill={c.glass}
        stroke="var(--color-granite-900)"
        strokeWidth="2.5"
      />
      <path d="M42 132v128" stroke="var(--color-bone)" strokeWidth="4" opacity="0.16" strokeLinecap="round" />
      <rect x="38" y="168" width="44" height="74" fill="var(--color-bone)" stroke="var(--color-granite-900)" strokeWidth="2" />
      <text x="60" y="188" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9" fill="var(--color-granite-900)">
        Harcourt
      </text>
      <text x="60" y="198" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="9" fill="var(--color-granite-900)">
        Valley
      </text>
      <line x1="44" y1="206" x2="76" y2="206" stroke="var(--color-granite-300)" strokeWidth="1" />
      {nameLines.map((ln, i) => (
        <text key={i} x="60" y={219 + i * 9} textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontWeight="600" fontSize="6.5" letterSpacing="0.5" fill="var(--color-granite-700)">
          {ln.toUpperCase()}
        </text>
      ))}
      {product.vintage ? (
        <text x="60" y="236" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="8" fill="var(--acc-garnet)">
          {product.vintage}
        </text>
      ) : null}
    </svg>
  );
}

/* ---------------- medal marquee row ---------------- */

export function MedalRow() {
  const medals = [
    "Gold · Bendigo Wine Show 2024",
    "Trophy · Central Victorian Shiraz 2023",
    "95 points · Halliday Wine Companion",
    "Gold · Melbourne Royal 2024",
    "Best Alternative · Victorian Wine Show",
    "5-star winery · Halliday rating",
    "Gold · Decanter World Wine Awards 2023",
    "Trophy · Best Fortified · Rutherglen 2022",
  ];
  const row = [...medals, ...medals];
  return (
    <div className="overflow-hidden border-y-2 border-granite-900 bg-granite-900 py-3.5" aria-label="Recent medals and ratings">
      <div className="marquee-track gap-10">
        {row.map((m, i) => (
          <span key={i} className="kicker text-granite-100 whitespace-nowrap flex items-center gap-10">
            <span>{m}</span>
            <GrapeIcon className="w-3.5 h-3.5 text-ochre" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- simple skeleton ---------------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-granite-100 border border-granite-300 ${className}`} aria-hidden="true" />;
}

/* ---------------- empty state ---------------- */

export function EmptyState({ title, note }: { title: string; note?: string }) {
  return (
    <div className="border-2 border-dashed border-granite-300 px-6 py-10 text-center">
      <p className="font-display text-xl text-granite-700">{title}</p>
      {note ? <p className="text-sm text-granite-500 mt-1.5">{note}</p> : null}
    </div>
  );
}

/* ---------------- hook: staggered reveal-on-mount ---------------- */

export function useMountStagger(count: number, step = 70) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= count) window.clearInterval(t);
    }, step);
    return () => window.clearInterval(t);
  }, [count, step]);
  return shown;
}

/* ---------------- FAQ block (renders the same Q&A the schema declares) ---------------- */

/**
 * Native <details> so the answers are in the DOM whether or not they're open —
 * a crawler and a screen reader both get the full text, and there's no JS
 * between the question and the answer.
 */
export function FaqList({ faqs, className = "" }: { faqs: { q: string; a: string }[]; className?: string }) {
  return (
    <div className={`border-t-2 border-granite-900 ${className}`}>
      {faqs.map((f) => (
        <details key={f.q} className="group border-b-2 border-granite-900">
          <summary className="flex items-start gap-4 cursor-pointer list-none py-5 min-h-[44px] hover:bg-granite-100/50 transition-colors px-1">
            <h3 className="font-display text-lg sm:text-xl font-medium flex-1">{f.q}</h3>
            <span className="mt-1 shrink-0 text-granite-500 transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
              <PlusIcon className="w-5 h-5" />
            </span>
          </summary>
          <p className="pb-6 px-1 pr-10 text-granite-700 leading-relaxed max-w-3xl">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/* ---------------- quick facts strip (built to be quoted) ---------------- */

export function FactGrid({ facts }: { facts: readonly { label: string; value: string; detail: string }[] }) {
  return (
    <dl className="grid sm:grid-cols-2 lg:grid-cols-3 border-l-2 border-t-2 border-granite-900">
      {facts.map((f) => (
        <div key={f.label} className="border-r-2 border-b-2 border-granite-900 p-5">
          <dt className="kicker text-granite-500">{f.label}</dt>
          <dd>
            <span className="block font-display text-3xl font-medium mt-1.5">{f.value}</span>
            <span className="block text-sm text-granite-700 mt-1.5">{f.detail}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
