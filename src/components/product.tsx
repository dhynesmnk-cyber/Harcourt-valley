import React, { useState } from "react";
import type { Product } from "../lib/data";
import { useStoredImage } from "../lib/media";
import { BottleArt } from "./ui";

/* ------------------------------------------------------------------ */
/*  Public-facing product imagery. Falls back to the bespoke bottle    */
/*  illustration whenever a product has no uploaded photos yet, so the */
/*  shop never shows a broken or empty frame.                          */
/* ------------------------------------------------------------------ */

/** The card image on the shelf grid — first photo, full-bleed, or the bottle art. */
export function ProductCardImage({ product, className = "" }: { product: Product; className?: string }) {
  const primary = product.images?.[0];
  const url = useStoredImage(primary?.id);

  if (primary && url) {
    return <img src={url} alt={primary.alt || `${product.name}${product.vintage ? " " + product.vintage : ""}`} className={`w-full h-full object-cover ${className}`} loading="lazy" decoding="async" />;
  }
  return (
    <div className="w-full h-full grid place-items-center py-7">
      <BottleArt product={product} className={`h-48 w-auto transition-transform duration-500 group-hover:-translate-y-1.5 ${className}`} />
    </div>
  );
}

/** Full gallery for the product modal — thumbnail strip when there's more than one photo. */
export function ProductGallery({ product }: { product: Product }) {
  const images = product.images ?? [];
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];
  const url = useStoredImage(current?.id);

  if (images.length === 0) {
    return (
      <div className="bg-granite-100 border-b-2 sm:border-b-0 sm:border-r-2 border-granite-900 grid place-items-center py-8 sm:py-0">
        <BottleArt product={product} className="h-56 sm:h-72 w-auto img-in" />
      </div>
    );
  }

  return (
    <div className="bg-granite-100 border-b-2 sm:border-b-0 sm:border-r-2 border-granite-900 flex flex-col">
      <div className="flex-1 grid place-items-center p-4 min-h-[220px]">
        {url ? (
          <img
            src={url}
            alt={current?.alt || `${product.name}${product.vintage ? " " + product.vintage : ""}`}
            className="w-full max-h-72 object-contain img-in"
          />
        ) : (
          <div className="w-8 h-8 border-2 border-granite-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        )}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 p-3 pt-0 justify-center flex-wrap" role="tablist" aria-label="Product photos">
          {images.map((img, i) => (
            <Thumb key={img.id} imageId={img.id} active={i === active} onClick={() => setActive(i)} label={`Photo ${i + 1} of ${images.length}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ imageId, active, onClick, label }: { imageId: string; active: boolean; onClick: () => void; label: string }) {
  const url = useStoredImage(imageId);
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-label={label}
      className={`w-11 h-11 shrink-0 border-2 overflow-hidden ${active ? "border-granite-900" : "border-granite-300 opacity-70 hover:opacity-100"}`}
    >
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
    </button>
  );
}
