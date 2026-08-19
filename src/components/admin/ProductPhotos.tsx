import React, { useRef, useState } from "react";
import type { Product, ProductImage } from "../../lib/data";
import { useStore } from "../../lib/store";
import { MAX_IMAGES_PER_PRODUCT, fmtBytes, useStoredImage } from "../../lib/media";
import { CloseIcon, PlusIcon, StarIcon, Tick, UploadIcon } from "../ui";

/* ------------------------------------------------------------------ */
/*  Four-photo uploader for one product. Files are downscaled and      */
/*  re-encoded client-side (see lib/media.ts) before they're stored,   */
/*  so a phone photo doesn't sit in the browser at its original size.  */
/* ------------------------------------------------------------------ */

function Thumb({ image, isPrimary, onAltChange, onRemove, onMakePrimary, onMove, canMoveLeft, canMoveRight }: {
  image: ProductImage;
  isPrimary: boolean;
  onAltChange: (alt: string) => void;
  onRemove: () => void;
  onMakePrimary: () => void;
  onMove: (dir: -1 | 1) => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}) {
  const url = useStoredImage(image.id);
  const [alt, setAlt] = useState(image.alt);
  const altDirty = alt !== image.alt;

  return (
    <div className={`border-2 bg-bone flex flex-col ${isPrimary ? "border-granite-900 shadow-hard-sm" : "border-granite-300"}`}>
      <div className="relative aspect-square bg-granite-100 border-b-2 border-granite-900">
        {url ? (
          <img src={url} alt={image.alt || "Untitled product photo"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <div className="w-6 h-6 border-2 border-granite-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          </div>
        )}
        {isPrimary ? (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 bg-granite-900 text-bone text-[0.6rem] font-label font-bold uppercase tracking-[0.08em] px-1.5 py-1">
            <StarIcon className="w-3 h-3" filled /> Cover
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this photo"
          className="absolute top-1.5 right-1.5 grid place-items-center w-6 h-6 bg-bone/90 border border-granite-900 hover:bg-garnet hover:text-bone transition-colors"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMoveLeft}
            aria-label="Move earlier"
            className="grid place-items-center w-6 h-6 bg-bone/90 border border-granite-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-granite-100"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMoveRight}
            aria-label="Move later"
            className="grid place-items-center w-6 h-6 bg-bone/90 border border-granite-900 disabled:opacity-30 disabled:pointer-events-none hover:bg-granite-100"
          >
            <span aria-hidden="true">→</span>
          </button>
          {!isPrimary ? (
            <button
              type="button"
              onClick={onMakePrimary}
              className="ml-auto text-[0.6rem] font-label font-bold uppercase tracking-[0.06em] bg-bone/90 border border-granite-900 px-1.5 h-6 hover:bg-granite-100"
            >
              Make cover
            </button>
          ) : null}
        </div>
      </div>
      <div className="p-2 space-y-1.5">
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => altDirty && onAltChange(alt)}
          placeholder="Describe this photo…"
          aria-label="Photo description"
          className={`field-input text-xs py-1.5 ${!image.alt.trim() ? "border-ochre" : ""}`}
        />
        <p className="text-[0.65rem] text-granite-500">
          {image.width}×{image.height} · {fmtBytes(image.bytes)}
        </p>
      </div>
    </div>
  );
}

function EmptySlot({ onPick, dragActive }: { onPick: () => void; dragActive: boolean }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`aspect-square border-2 border-dashed grid place-items-center gap-1.5 text-granite-500 hover:border-granite-900 hover:text-granite-900 hover:bg-granite-100/50 transition-colors ${
        dragActive ? "border-granite-900 bg-granite-100/70 text-granite-900" : "border-granite-300"
      }`}
    >
      <UploadIcon className="w-5 h-5" />
      <span className="text-[0.68rem] font-label font-semibold uppercase tracking-[0.06em]">Add photo</span>
    </button>
  );
}

export function ProductPhotosPanel({ product }: { product: Product }) {
  const { addProductImages, removeProductImage, setPrimaryImage, moveProductImage, updateImageAlt, toast } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const images = product.images ?? [];
  const room = MAX_IMAGES_PER_PRODUCT - images.length;

  const handleFiles = async (fileList: FileList | File[]) => {
    /* Not pre-filtered by type here — a dropped non-image file still needs to
       reach addProductImages so prepareImage() can report exactly what was
       wrong with it, rather than being silently discarded. */
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setBusy(true);
    setErrors([]);
    try {
      const { added, errors: errs } = await addProductImages(product.id, files);
      setErrors(errs);
      if (added > 0) toast(`${added} photo${added === 1 ? "" : "s"} added to ${product.name}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t-2 border-granite-300 bg-granite-100/30 px-5 py-5 rise-in" onDragOver={(e) => e.preventDefault()}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="kicker text-granite-500">
          Photos · {images.length} of {MAX_IMAGES_PER_PRODUCT}
        </p>
        <p className="text-xs text-granite-500">The first photo is what shows on the shelf. JPEG, PNG or WebP, up to 25MB — resized automatically.</p>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
        {images.map((img, i) => (
          <Thumb
            key={img.id}
            image={img}
            isPrimary={i === 0}
            onAltChange={(alt) => updateImageAlt(product.id, img.id, alt)}
            onRemove={() => {
              removeProductImage(product.id, img.id);
              toast("Photo removed.");
            }}
            onMakePrimary={() => setPrimaryImage(product.id, img.id)}
            onMove={(dir) => moveProductImage(product.id, img.id, dir)}
            canMoveLeft={i > 0}
            canMoveRight={i < images.length - 1}
          />
        ))}
        {room > 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              void handleFiles(e.dataTransfer.files);
            }}
          >
            {busy ? (
              <div className="aspect-square border-2 border-dashed border-granite-300 grid place-items-center">
                <div className="w-6 h-6 border-2 border-granite-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              </div>
            ) : (
              <EmptySlot onPick={() => inputRef.current?.click()} dragActive={dragActive} />
            )}
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {errors.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-garnet">
              {e}
            </li>
          ))}
        </ul>
      ) : null}

      {images.length > 0 && images.some((i) => !i.alt.trim()) ? (
        <p className="mt-3 text-xs text-ochre flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-ochre shrink-0" aria-hidden="true" /> Photos without a description are harder for customers using a screen reader to
          find in search.
        </p>
      ) : images.length === MAX_IMAGES_PER_PRODUCT ? (
        <p className="mt-3 text-xs text-vine flex items-center gap-1.5">
          <Tick className="w-3.5 h-3.5" /> All four photos in, all described.
        </p>
      ) : null}
    </div>
  );
}

export function PhotosToggle({ product, open, onToggle }: { product: Product; open: boolean; onToggle: () => void }) {
  const count = (product.images ?? []).length;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`btn btn-sm ${count === 0 ? "btn-ghost" : "btn-dark"}`}
    >
      {count === 0 ? (
        <>
          <PlusIcon className="w-3.5 h-3.5" /> Photos
        </>
      ) : (
        `Photos (${count})`
      )}
    </button>
  );
}
