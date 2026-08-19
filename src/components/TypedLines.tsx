import React, { useEffect, useMemo, useRef, useState } from "react";
import type { TypedLine, TypedPage } from "../lib/data";
import { useStore } from "../lib/store";

/* =====================================================================
   Typed lines — the site's reviews and features, written out one letter
   at a time where the stat boxes used to sit.

   Timing is deliberately unhurried: typing is the slowest thing on the
   page, so it reads as considered rather than as a loading spinner.
   ===================================================================== */

const TYPE_MS = 34;
const DELETE_MS = 16;
const HOLD_MS = 2600;
const BETWEEN_MS = 420;

type Phase = "typing" | "holding" | "deleting";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Runs one line at a time, character by character. */
function useTypewriter(lines: TypedLine[], paused: boolean, still: boolean) {
  const [i, setI] = useState(0);
  const [cut, setCut] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const timer = useRef<number | undefined>(undefined);

  const line = lines[i];
  const full = line?.text ?? "";

  // A changed list (an admin edit, a page swap) restarts cleanly rather than
  // leaving the cursor mid-word in a line that no longer exists.
  useEffect(() => {
    setI(0);
    setCut(0);
    setPhase("typing");
  }, [lines]);

  useEffect(() => {
    if (still || paused || !line) return;

    const only = lines.length === 1;
    let delay = TYPE_MS;
    let next = () => {};

    if (phase === "typing") {
      if (cut < full.length) {
        next = () => setCut((c) => c + 1);
      } else {
        // A single line has nowhere to go — leave it standing.
        if (only) return;
        delay = HOLD_MS;
        next = () => setPhase("deleting");
      }
    } else if (phase === "deleting") {
      if (cut > 0) {
        delay = DELETE_MS;
        next = () => setCut((c) => c - 1);
      } else {
        delay = BETWEEN_MS;
        next = () => {
          setI((n) => (n + 1) % lines.length);
          setPhase("typing");
        };
      }
    }

    timer.current = window.setTimeout(next, delay);
    return () => window.clearTimeout(timer.current);
  }, [cut, phase, full, line, lines.length, paused, still]);

  return { line, shown: still ? full : full.slice(0, cut), done: still || cut >= full.length };
}

export function TypedLines({ page, dark = false, className = "" }: { page: TypedPage; dark?: boolean; className?: string }) {
  const { config } = useStore();
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(prefersReducedMotion);

  const lines = useMemo(
    () => (config.typedLines ?? []).filter((l) => l.page === page && l.text.trim()),
    [config.typedLines, page],
  );

  // Someone can flip the OS setting while the page is open.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setStill(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const { line, shown, done } = useTypewriter(lines, paused, still);

  if (lines.length === 0) return null;

  const muted = dark ? "text-granite-300" : "text-granite-500";
  const strong = dark ? "text-bone" : "text-granite-900";

  return (
    <div
      className={`typed ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* The animation is decorative repetition of text that is already below
          in full, so it stays out of the accessibility tree entirely. */}
      <div aria-hidden="true" className="min-h-[5.5rem] sm:min-h-[6.5rem] flex flex-col justify-center">
        <p className={`font-display text-[1.45rem] sm:text-[2rem] leading-[1.25] font-medium ${strong}`}>
          {line?.author ? <span className={muted}>“</span> : null}
          {shown}
          {line?.author && done ? <span className={muted}>”</span> : null}
          <span className={`typed-caret ${dark ? "bg-ochre" : "bg-garnet"}`} data-done={done ? "true" : "false"} />
        </p>
        <p className={`kicker mt-3 h-4 transition-opacity duration-500 ${muted} ${done && line?.author ? "opacity-100" : "opacity-0"}`}>
          {line?.author || " "}
        </p>
      </div>

      {/* Screen readers get the whole set as plain, static text. */}
      <ul className="sr-only">
        {lines.map((l) => (
          <li key={l.id}>{l.author ? `“${l.text}” — ${l.author}` : l.text}</li>
        ))}
      </ul>
    </div>
  );
}

/** The same animation driven by an explicit list — used by the admin preview. */
export function TypedPreview({ lines }: { lines: TypedLine[] }) {
  const [still, setStill] = useState(prefersReducedMotion);
  const usable = useMemo(() => lines.filter((l) => l.text.trim()), [lines]);
  const { line, shown, done } = useTypewriter(usable, false, still);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setStill(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  if (usable.length === 0) {
    return <p className="text-sm text-granite-500">Add a line and it will play here.</p>;
  }

  return (
    <div aria-hidden="true" className="min-h-[4.5rem] flex flex-col justify-center">
      <p className="font-display text-lg sm:text-xl leading-snug font-medium text-granite-900">
        {line?.author ? <span className="text-granite-500">“</span> : null}
        {shown}
        {line?.author && done ? <span className="text-granite-500">”</span> : null}
        <span className="typed-caret bg-garnet" data-done={done ? "true" : "false"} />
      </p>
      <p className={`kicker mt-2 h-4 text-granite-500 transition-opacity duration-500 ${done && line?.author ? "opacity-100" : "opacity-0"}`}>
        {line?.author || " "}
      </p>
    </div>
  );
}
