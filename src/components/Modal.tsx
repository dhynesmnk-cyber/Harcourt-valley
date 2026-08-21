import React, { useEffect, useRef } from "react";
import { CloseIcon } from "./ui";

/**
 * The overlay every admin dialog should sit on. The hand-rolled versions this
 * replaces had no Escape key, no focus trap and no scroll lock — fine with a
 * mouse, unusable with a keyboard, and the page behind them scrolled away
 * under the dialog.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  maxWidth = "max-w-xl",
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap: keep Tab inside the dialog, wrapping at both ends.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("button, input, textarea, select")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-granite-900/60 fade-in" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`rise-in relative bg-bone border-2 border-granite-900 shadow-hard w-full ${maxWidth} max-h-[85svh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b-2 border-granite-900 shrink-0">
          <div className="min-w-0">{title}</div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 p-1 -m-1 text-granite-500 hover:text-granite-900">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 overflow-y-auto thin-scroll">{children}</div>
        {footer ? <div className="px-5 sm:px-6 py-4 border-t-2 border-granite-900 shrink-0">{footer}</div> : null}
      </div>
    </div>
  );
}
