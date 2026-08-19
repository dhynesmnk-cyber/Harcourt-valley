import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Uploaded image storage.                                            */
/*                                                                     */
/*  The rest of the demo persists to localStorage, but photos can't:   */
/*  localStorage holds the whole store as one string against a ~5MB    */
/*  quota, and base64 inflates bytes by a third. Four photos across    */
/*  eight products would blow it — and the failure mode is setItem()   */
/*  throwing, which would take the leads and orders down with it.      */
/*                                                                     */
/*  So the bytes live in IndexedDB as Blobs (no base64 tax, quota in   */
/*  the hundreds of MB) and only the metadata — id, alt, dimensions —  */
/*  goes in the state that localStorage holds.                         */
/*                                                                     */
/*  Production note: this is still a browser-local store. Moving to    */
/*  Supabase means swapping putImage/getImageBlob for Storage calls    */
/*  and keeping the same ProductImage metadata.                        */
/* ------------------------------------------------------------------ */

const DB_NAME = "hv-media";
const DB_VERSION = 1;
const STORE = "images";

/** Longest edge after downscaling. Big enough for a full-width hero, small enough to store. */
export const MAX_EDGE = 1600;
/** Re-encode quality for WebP/JPEG. */
const QUALITY = 0.82;
/** Reject before decoding — a 50MB RAW would just hang the tab. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** The cap the whole feature is built around. */
export const MAX_IMAGES_PER_PRODUCT = 4;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser has no IndexedDB, so photos can't be stored."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open the photo store."));
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Photo store request failed."));
      }),
  );
}

export const putImage = (id: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, id) as IDBRequest<IDBValidKey>).then(() => undefined);
export const getImageBlob = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id)).then((b) => b ?? null);
export const allImageIds = () => tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys()).then((k) => k.map(String));

/** Object URLs are cached for the session; only a real delete revokes one. */
const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

async function resolveUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const inflight = pending.get(id);
  if (inflight) return inflight;

  const p = getImageBlob(id)
    .then((blob) => {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(id, url);
      return url;
    })
    .catch(() => null)
    .finally(() => pending.delete(id));

  pending.set(id, p);
  return p;
}

export async function deleteImage(id: string): Promise<void> {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  await tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
}

export async function deleteImages(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteImage(id).catch(() => undefined)));
}

/** Drops every stored photo — used by "Reset demo data". */
export async function clearImages(): Promise<void> {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
  await tx("readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

/**
 * Removes stored blobs no product references any more. Cheap insurance against
 * orphans left by a deleted product or a failed save.
 */
export async function pruneOrphans(keepIds: string[]): Promise<number> {
  const keep = new Set(keepIds);
  const stored = await allImageIds();
  const orphans = stored.filter((id) => !keep.has(id));
  await deleteImages(orphans);
  return orphans.length;
}

/** Resolves a stored image id to a displayable URL. Returns null while loading or if missing. */
export function useStoredImage(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (id ? urlCache.get(id) ?? null : null));

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    const cached = urlCache.get(id);
    if (cached) {
      setUrl(cached);
      return;
    }
    let alive = true;
    resolveUrl(id).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  return url;
}

/* ---------------- decode, downscale, re-encode ---------------- */

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  type: string;
}

async function decode(file: File): Promise<{ src: CanvasImageSource; width: number; height: number; close: () => void }> {
  /* createImageBitmap honours EXIF orientation, so phone photos aren't sideways. */
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { src: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* Safari on older versions rejects the options bag — fall through. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file couldn't be read as an image."));
      el.src = url;
    });
    return { src: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function encode(canvas: HTMLCanvasElement): Promise<{ blob: Blob; type: string }> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.size > 0) {
          resolve({ blob: webp, type: "image/webp" });
          return;
        }
        canvas.toBlob(
          (jpeg) => (jpeg ? resolve({ blob: jpeg, type: "image/jpeg" }) : reject(new Error("The browser couldn't re-encode that image."))),
          "image/jpeg",
          QUALITY,
        );
      },
      "image/webp",
      QUALITY,
    );
  });
}

/**
 * Validates, downscales and re-encodes one picked file. Doing this in the
 * browser is what makes local storage viable at all — a 6MB phone photo comes
 * out around 150KB without looking any different on a product card.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" isn't an image.`);
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error(`${file.type.replace("image/", "").toUpperCase()} isn't supported — use JPEG, PNG or WebP.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(0)}MB — the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`);

  const { src, width, height, close } = await decode(file);
  try {
    if (!width || !height) throw new Error("That image reported no dimensions.");
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("The browser wouldn't give us a canvas to resize with.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, w, h);

    const { blob, type } = await encode(canvas);
    return { blob, width: w, height: h, type };
  } finally {
    close();
  }
}

/** Human-readable size for the admin UI. */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
