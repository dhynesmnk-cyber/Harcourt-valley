import React, { useRef, useState } from "react";
import { SITE_IMAGE_LABELS, SITE_IMAGE_KEYS, type SiteImageKey } from "../../lib/data";
import { useSiteImage, useStore } from "../../lib/store";
import { CloseIcon, Tick, UploadIcon } from "../ui";

/* ------------------------------------------------------------------ */
/*  One thumbnail for a stock-photo slot (see IMG/SiteImageKey), used   */
/*  inside a picker — the Home page photograph and journal-post cover.  */
/*  Its own src always reflects any replacement, live, without the      */
/*  picker needing to know about that.                                  */
/* ------------------------------------------------------------------ */

export function SiteImageOption({ imgKey, currentValue, onSelect }: { imgKey: SiteImageKey; currentValue: string; onSelect: (src: string) => void }) {
  const src = useSiteImage(imgKey);
  const label = SITE_IMAGE_LABELS[imgKey];
  const selected = currentValue === src;
  return (
    <button
      type="button"
      onClick={() => onSelect(src)}
      aria-pressed={selected}
      className={`border-2 overflow-hidden text-left transition-all ${selected ? "border-granite-900 shadow-hard-sm" : "border-granite-300 hover:border-granite-900"}`}
    >
      <span className="block relative">
        <img src={src} alt={label} className="w-full h-24 sm:h-28 object-cover" loading="lazy" />
        {selected ? (
          <span className="absolute top-2 right-2 grid place-items-center w-6 h-6 bg-vine text-bone border border-granite-900">
            <Tick className="w-3.5 h-3.5" />
          </span>
        ) : null}
      </span>
      <span className="block font-label font-semibold text-[0.7rem] px-2.5 py-1.5">{label}</span>
    </button>
  );
}

/**
 * One replaceable slot in "Photos across the site" — every page that shows
 * this stock photo picks up the swap the moment it's uploaded.
 */
function SitePhotoCard({ imgKey }: { imgKey: SiteImageKey }) {
  const { config, setSiteImage, resetSiteImage, toast } = useStore();
  const src = useSiteImage(imgKey);
  const overridden = Boolean(config.siteImages?.[imgKey]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setBusy(true);
    setError("");
    const r = await setSiteImage(imgKey, file);
    setBusy(false);
    if (r.ok) toast(`${SITE_IMAGE_LABELS[imgKey]} replaced — live on every page it appears on.`);
    else setError(r.error ?? "That photo couldn't be uploaded.");
  };

  return (
    <div className="border-2 border-granite-300 bg-bone">
      <div className="relative aspect-[4/3] bg-granite-100 border-b-2 border-granite-900">
        <img src={src} alt={SITE_IMAGE_LABELS[imgKey]} className="w-full h-full object-cover" loading="lazy" />
        {overridden ? (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 bg-granite-900 text-bone text-[0.6rem] font-label font-bold uppercase tracking-[0.08em] px-1.5 py-1">
            Your photo
          </span>
        ) : null}
        {busy ? (
          <div className="absolute inset-0 bg-bone/70 grid place-items-center">
            <div className="w-6 h-6 border-2 border-granite-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          </div>
        ) : null}
      </div>
      <div className="p-3 space-y-2">
        <p className="font-label font-semibold text-xs">{SITE_IMAGE_LABELS[imgKey]}</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm btn-ghost border border-granite-500 flex-1" onClick={() => inputRef.current?.click()} disabled={busy}>
            <UploadIcon className="w-3.5 h-3.5" /> Replace
          </button>
          {overridden ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost px-2"
              aria-label={`Reset ${SITE_IMAGE_LABELS[imgKey]} to the default photo`}
              onClick={() => {
                resetSiteImage(imgKey);
                toast("Back to the default photo.");
              }}
              disabled={busy}
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
        {error ? <p className="text-[0.7rem] text-garnet">{error}</p> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** The full grid — every stock photo used across the public site, each independently replaceable. */
export function SitePhotosPanel() {
  return (
    <fieldset className="border-2 border-granite-900 bg-bone">
      <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Photos across the site</legend>
      <div className="p-5">
        <p className="text-xs text-granite-500 max-w-2xl">
          These are the photographs used on the winery, weddings, events and trade pages (and the journal's photo library). Replace any of them with your
          own — JPEG, PNG or WebP, resized automatically — and it updates everywhere that photo appears. Nothing here needs the "Apply" button below.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SITE_IMAGE_KEYS.map((key) => (
            <SitePhotoCard key={key} imgKey={key} />
          ))}
        </div>
      </div>
    </fieldset>
  );
}
