import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CloseIcon, Tick } from "./ui";

/* =====================================================================
   Guided tour — a spotlight walkthrough.

   Three shapes of step:
     • anchored — `target` names a [data-tour="…"] element. The overlay cuts
       a hole around it and the card docks to whichever side has room.
     • docked   — no target. The scrim goes light and the card sits in the
       corner, so the section being described stays readable.
     • centred  — no target, `placement: "centre"`. A plain modal, for the
       opening and closing beats.
   ===================================================================== */

export interface TourStep {
  id: string;
  title: string;
  body: string;
  tip?: string;
  /** Value of the data-tour attribute to spotlight. Falls back to a docked card. */
  target?: string;
  placement?: "auto" | "centre" | "dock";
  /** Runs before the step is measured — used to switch admin sections. */
  before?: () => void;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10;
const GAP = 18;
const EDGE = 14;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function Walkthrough({
  steps,
  open,
  onClose,
  onFinish,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
}) {
  const [i, setI] = useState(0);
  const [spot, setSpot] = useState<Box | null>(null);
  const [vp, setVp] = useState({ w: 1280, h: 800 });
  const [card, setCard] = useState({ w: 380, h: 260 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  const step = steps[i];
  const isFirst = i === 0;
  const isLast = i === steps.length - 1;
  const mode: "anchored" | "dock" | "centre" = spot ? "anchored" : step?.placement === "centre" ? "centre" : step?.placement === "dock" ? "dock" : "centre";

  /* -------- reset to the top of the tour each time it is opened -------- */
  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  /* -------- viewport -------- */
  useEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  /* -------- measure the spotlit element -------- */
  const measure = useCallback(() => {
    const name = steps[i]?.target;
    if (!name) {
      setSpot(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
    if (!el) {
      setSpot(null);
      return;
    }
    const r = el.getBoundingClientRect();
    // Hidden at this breakpoint (the sidebar on mobile, say) — fall back to a docked card.
    if (r.width < 4 || r.height < 4) {
      setSpot(null);
      return;
    }
    setSpot({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [steps, i]);

  useEffect(() => {
    if (!open) return;
    steps[i]?.before?.();
    const raf = requestAnimationFrame(() => {
      const name = steps[i]?.target;
      const el = name ? document.querySelector<HTMLElement>(`[data-tour="${name}"]`) : null;
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      measure();
    });
    // Re-measure after the section swap paints and after any smooth scroll settles.
    const t1 = window.setTimeout(measure, 240);
    const t2 = window.setTimeout(measure, 620);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, i, steps, measure]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
      cancelAnimationFrame(raf);
    };
  }, [open, measure]);

  /* -------- measure the card so it can be placed without overflowing -------- */
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const read = () => setCard({ w: el.offsetWidth, h: el.offsetHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, i]);

  /* -------- keyboard + scroll lock -------- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setI((n) => Math.min(steps.length - 1, n + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setI((n) => Math.max(0, n - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, steps.length]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, i]);

  /* -------- where the card sits -------- */
  const pos = useMemo(() => {
    const w = card.w;
    const h = card.h;

    if (!spot) {
      if (mode === "dock") {
        // Bottom-right on desktop, bottom-centre once the viewport narrows.
        const left = vp.w < 720 ? clamp((vp.w - w) / 2, EDGE, vp.w - w - EDGE) : vp.w - w - 24;
        return { top: clamp(vp.h - h - 24, EDGE, vp.h - h - EDGE), left };
      }
      return { top: clamp((vp.h - h) / 2, EDGE, Math.max(EDGE, vp.h - h - EDGE)), left: clamp((vp.w - w) / 2, EDGE, Math.max(EDGE, vp.w - w - EDGE)) };
    }

    const below = spot.top + spot.height + GAP;
    const above = spot.top - GAP - h;
    const rightOf = spot.left + spot.width + GAP;
    const leftOf = spot.left - GAP - w;
    const centreX = clamp(spot.left + spot.width / 2 - w / 2, EDGE, Math.max(EDGE, vp.w - w - EDGE));
    const centreY = clamp(spot.top + spot.height / 2 - h / 2, EDGE, Math.max(EDGE, vp.h - h - EDGE));

    if (below + h + EDGE <= vp.h) return { top: below, left: centreX };
    if (above >= EDGE) return { top: above, left: centreX };
    if (rightOf + w + EDGE <= vp.w) return { top: centreY, left: rightOf };
    if (leftOf >= EDGE) return { top: centreY, left: leftOf };
    return { top: clamp(vp.h - h - EDGE, EDGE, Math.max(EDGE, vp.h - h - EDGE)), left: centreX };
  }, [spot, card, vp, mode]);

  if (!open || !step) return null;

  const next = () => (isLast ? onFinish() : setI(i + 1));
  const back = () => setI(Math.max(0, i - 1));

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* scrim — the spotlight paints its own when a target is lit */}
      {!spot ? (
        <button
          type="button"
          aria-label="Close the walkthrough"
          onClick={onClose}
          className={`tour-scrim cursor-default ${mode === "dock" ? "tour-scrim-light" : ""}`}
        />
      ) : (
        <>
          <button type="button" aria-label="Close the walkthrough" onClick={onClose} className="absolute inset-0 cursor-default" />
          <div className="tour-spot" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }} aria-hidden="true" />
          <div className="tour-halo" style={{ top: spot.top - 4, left: spot.left - 4, width: spot.width + 8, height: spot.height + 8 }} aria-hidden="true" />
        </>
      )}

      {/* card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        className="tour-card border-2 border-granite-900 bg-bone w-[min(380px,calc(100vw-28px))] outline-none"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="h-1 shrink-0 bg-granite-100 border-b-2 border-granite-900" aria-hidden="true">
          <div
            className="h-full bg-gradient-to-r from-garnet to-ochre"
            style={{ width: `${((i + 1) / steps.length) * 100}%`, transition: "width .6s var(--ease-lux)" }}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-8 h-8 grid place-items-center text-granite-500 hover:text-granite-900 hover:bg-granite-100 transition-colors"
          aria-label="Skip the walkthrough"
        >
          <CloseIcon className="w-4 h-4" />
        </button>

        <div key={step.id} className="tour-body thin-scroll p-5 sm:p-6 pr-10">
          <p className="kicker text-granite-500 text-[0.6rem]">
            Step {i + 1} of {steps.length}
          </p>
          <h2 id="tour-title" className="font-display text-[1.6rem] leading-tight font-medium mt-2 text-granite-900">
            {step.title}
          </h2>
          <p className="mt-2.5 text-[0.94rem] leading-relaxed text-granite-700">{step.body}</p>
          {step.tip ? (
            <p className="mt-4 pl-3.5 border-l-2 border-ochre text-[0.86rem] leading-relaxed text-granite-600">
              <span className="font-label font-semibold text-granite-800 uppercase tracking-[0.1em] text-[0.66rem] mr-1.5">Tip</span>
              {step.tip}
            </p>
          ) : null}
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-1 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Walkthrough steps">
            {steps.map((s, n) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={`Step ${n + 1}: ${s.title}`}
                onClick={() => setI(n)}
                className="tour-dot"
                data-state={n === i ? "current" : n < i ? "done" : "todo"}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            {!isFirst ? (
              <button type="button" onClick={back} className="btn btn-sm btn-ghost">
                Back
              </button>
            ) : (
              <button type="button" onClick={onClose} className="btn btn-sm btn-ghost text-granite-600">
                Skip
              </button>
            )}
            <button type="button" onClick={next} className="btn btn-sm btn-primary">
              {isLast ? (
                <>
                  Start <Tick className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- the "take the tour" glyph ---------------- */

export function CompassIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.2 8.8-2 4.4-4.4 2 2-4.4 4.4-2Z" />
    </svg>
  );
}
