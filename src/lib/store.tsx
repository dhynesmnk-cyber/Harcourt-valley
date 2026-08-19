import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Bee23Profile, BlogPost, CartLine, EmailSend, Lead, LeadNote, LeadStatus, Order, OutboxItem, Product,
  ProductImage, Sequence, SequenceStep, SiteConfig, TradeOrder,
  IMG, referencedImageIds,
  DAY, dstr, iso, readingMinutes, seedConfig, seedLeads, seedNotes, seedOrders, seedOutbox, seedPosts,
  seedProducts, seedProfiles, seedSequences, seedSends, seedTradeOrders, slugify, uid,
} from "./data";
import { isRemote, supabase } from "./supabase";
import { hydrate, syncState } from "./remote";
import { MAX_IMAGES_PER_PRODUCT, clearImages, deleteImages, prepareImage, pruneOrphans, putImage } from "./media";

interface StoreState {
  products: Product[];
  leads: Lead[];
  notes: LeadNote[];
  orders: Order[];
  tradeOrders: TradeOrder[];
  sequences: Sequence[];
  sends: EmailSend[];
  profiles: Bee23Profile[];
  outbox: OutboxItem[];
  posts: BlogPost[];
  config: SiteConfig;
}

const STORAGE_KEY = "hv-state-v4";

function freshState(): StoreState {
  return {
    products: seedProducts(),
    leads: seedLeads(),
    notes: seedNotes(),
    orders: seedOrders(),
    tradeOrders: seedTradeOrders(),
    sequences: seedSequences(),
    sends: seedSends(),
    profiles: seedProfiles(),
    outbox: seedOutbox(),
    posts: seedPosts(),
    config: seedConfig(),
  };
}

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreState>;
      if (parsed && parsed.config && parsed.products) {
        /* Merge over a fresh seed so a slice added after someone's last visit
           (posts, say) arrives populated instead of undefined, and a config
           field added since then (typedLines, say) fills in rather than
           reaching the site as undefined. */
        return { ...freshState(), ...parsed, config: { ...seedConfig(), ...parsed.config } };
      }
    }
  } catch {
    /* fall through to seed */
  }
  return freshState();
}

export interface Toast {
  id: string;
  msg: string;
}

/** `local` = no backend configured; `offline` = configured but unreachable. */
export type BackendStatus = "local" | "connecting" | "live" | "offline";

interface StoreValue extends StoreState {
  backend: BackendStatus;
  toasts: Toast[];
  toast: (msg: string) => void;
  cart: CartLine[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  cartCount: number;
  cartTotalCents: number;
  addToCart: (productId: string, qty?: number) => void;
  setCartQty: (productId: string, qty: number) => void;
  removeLine: (productId: string) => void;
  placeOrder: (customer: string, email: string) => Order | null;
  addLead: (input: Omit<Lead, "id" | "status" | "bookedDate" | "source" | "createdAt">) => Lead;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  moveLead: (id: string, status: LeadStatus) => void;
  addNote: (leadId: string, body: string) => void;
  addTradeOrder: (o: Omit<TradeOrder, "id" | "status" | "createdAt">) => void;
  fulfillTradeOrder: (id: string) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  addProduct: (p: { name: string; type: Product["type"]; varietal: string; vintage: string | null; priceCents: number; stock: number; description: string }) => void;
  /** Uploads picked files into the product gallery. Resolves with per-file failures rather than throwing. */
  addProductImages: (productId: string, files: File[]) => Promise<{ added: number; errors: string[] }>;
  removeProductImage: (productId: string, imageId: string) => void;
  /** Moves an image to the front, making it the card/hero shot. */
  setPrimaryImage: (productId: string, imageId: string) => void;
  moveProductImage: (productId: string, imageId: string, direction: -1 | 1) => void;
  updateImageAlt: (productId: string, imageId: string, alt: string) => void;
  updateSequence: (id: string, steps: SequenceStep[]) => void;
  toggleSequence: (id: string) => void;
  updateConfig: (patch: Partial<SiteConfig>) => void;
  addPost: () => BlogPost;
  updatePost: (id: string, patch: Partial<BlogPost>) => void;
  deletePost: (id: string) => void;
  /** False when refused because a live backend makes reseeding destructive. */
  resetDemo: () => boolean;
  sendDueEmails: () => number;
  dueEmails: EmailSend[];
  addProfile: (p: Omit<Bee23Profile, "id">) => void;
  addOutbox: (items: Omit<OutboxItem, "id" | "updatedAt" | "state">[]) => void;
  setOutboxState: (id: string, state: OutboxItem["state"]) => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(loadState);
  const [cart, setCart] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem("hv-cart-v1");
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<number[]>([]);

  /* ---------- backend ----------
     With no env vars `isRemote` is false and everything below is inert, so the
     app behaves exactly as it did on localStorage alone. With a backend
     configured, we load from Postgres once and then mirror each change. */

  const [backend, setBackend] = useState<BackendStatus>(isRemote ? "connecting" : "local");
  // What the server is believed to hold. Diffing against this is what keeps
  // writes down to the rows that actually moved.
  const synced = useRef<StoreState | null>(null);
  const pending = useRef<number | undefined>(undefined);
  // Held in a ref as well as state: the sync effect needs the current value
  // without re-running the whole push every time a session refreshes.
  const [isAdmin, setIsAdmin] = useState(false);
  const adminRef = useRef(false);
  adminRef.current = isAdmin;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setIsAdmin(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setIsAdmin(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isRemote) return;
    let live = true;
    hydrate()
      .then((remote) => {
        if (!live) return;
        if (!remote) {
          setBackend("offline");
          return;
        }
        // The public site is only allowed to read products and config, so an
        // empty admin table there means "not permitted", not "deleted" — keep
        // whatever is already local rather than wiping it.
        setState((s) => {
          const merged: StoreState = {
            // Photos have no table yet (see toProduct in remote.ts), so a
            // remote row never carries them — overlay each product's local
            // images back on by id, or hydrating would silently wipe out
            // whatever had been uploaded in this browser.
            products: remote.products.length
              ? remote.products.map((rp) => {
                  const local = s.products.find((lp) => lp.id === rp.id);
                  return local && local.images.length ? { ...rp, images: local.images } : rp;
                })
              : s.products,
            leads: remote.leads.length ? remote.leads : s.leads,
            notes: remote.notes.length ? remote.notes : s.notes,
            orders: remote.orders.length ? remote.orders : s.orders,
            tradeOrders: remote.tradeOrders.length ? remote.tradeOrders : s.tradeOrders,
            sequences: remote.sequences.length ? remote.sequences : s.sequences,
            sends: remote.sends.length ? remote.sends : s.sends,
            profiles: remote.profiles.length ? remote.profiles : s.profiles,
            outbox: remote.outbox.length ? remote.outbox : s.outbox,
            // The journal has no table yet — posts stay local until the
            // backend grows one, same as product photo metadata.
            posts: s.posts,
            config: remote.config,
          };
          synced.current = merged;
          return merged;
        });
        setBackend("live");
      })
      .catch(() => live && setBackend("offline"));
    return () => {
      live = false;
    };
  }, []);

  /* addProductImages is async and can run for seconds while files decode, so it
     reads the live state through a ref rather than closing over a stale copy. */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Push the difference, debounced so a burst of keystrokes is one write.
    if (!isRemote || synced.current === null) return;
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(() => {
      const before = synced.current;
      if (!before) return;
      syncState(before, state, adminRef.current).then((errors) => {
        if (errors.length > 0) console.warn("Some changes did not reach the backend:", errors);
        synced.current = state;
      });
    }, 600);
  }, [state]);

  useEffect(() => () => window.clearTimeout(pending.current), []);

  /* Once per session, drop any stored blob no product still points at — e.g.
     photos belonging to a product deleted in another tab. */
  useEffect(() => {
    void pruneOrphans(referencedImageIds(stateRef.current.products));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("hv-cart-v1", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => () => toastTimers.current.forEach((t) => window.clearTimeout(t)), []);

  const toast = useCallback((msg: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, msg }]);
    toastTimers.current.push(
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200),
    );
  }, []);

  /* ---------- cart ---------- */

  const addToCart = useCallback((productId: string, qty = 1) => {
    setCart((c) => {
      const existing = c.find((l) => l.productId === productId);
      if (existing) return c.map((l) => (l.productId === productId ? { ...l, qty: l.qty + qty } : l));
      return [...c, { productId, qty }];
    });
  }, []);

  const setCartQty = useCallback((productId: string, qty: number) => {
    setCart((c) =>
      qty <= 0 ? c.filter((l) => l.productId !== productId) : c.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    );
  }, []);

  const removeLine = useCallback((productId: string) => setCart((c) => c.filter((l) => l.productId !== productId)), []);

  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const cartTotalCents = cart.reduce((sum, l) => {
    const p = state.products.find((x) => x.id === l.productId);
    return sum + (p ? p.priceCents * l.qty : 0);
  }, 0);

  const placeOrder = useCallback(
    (customer: string, email: string): Order | null => {
      const lines = cart
        .map((l) => {
          const p = state.products.find((x) => x.id === l.productId);
          return p ? { name: `${p.name}${p.vintage ? " " + p.vintage : ""}`, qty: l.qty, priceCents: p.priceCents } : null;
        })
        .filter((x): x is { name: string; qty: number; priceCents: number } => x !== null);
      if (lines.length === 0) return null;
      const order: Order = {
        id: "ord-" + Math.floor(1000 + Math.random() * 9000),
        customer,
        email,
        lines,
        totalCents: lines.reduce((s, l) => s + l.priceCents * l.qty, 0),
        status: "paid",
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        orders: [order, ...s.orders],
        products: s.products.map((p) => {
          const line = cart.find((l) => l.productId === p.id);
          return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
        }),
      }));
      setCart([]);
      return order;
    },
    [cart, state.products],
  );

  /* ---------- leads / CRM ---------- */

  const addLead = useCallback(
    (input: Omit<Lead, "id" | "status" | "bookedDate" | "source" | "createdAt">): Lead => {
      const lead: Lead = { ...input, id: uid(), status: "new", bookedDate: null, source: "website", createdAt: new Date().toISOString() };
      setState((s) => {
        let sends = s.sends;
        if (input.infoPack) {
          const seq = s.sequences.find((q) => q.audience === (input.type === "wedding" ? "wedding" : "event") && q.active);
          if (seq) {
            const created = new Date(lead.createdAt).getTime();
            sends = [
              ...sends,
              ...seq.steps.map((st) => ({
                id: uid(),
                leadId: lead.id,
                leadName: lead.names,
                stepLabel: `Step ${st.order} · Day ${st.delayDays}`,
                subject: st.subject,
                sendAt: new Date(created + st.delayDays * DAY).toISOString(),
                status: "scheduled" as const,
              })),
            ];
          }
        }
        return { ...s, leads: [lead, ...s.leads], sends };
      });
      return lead;
    },
    [],
  );

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setState((s) => ({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }, []);

  const moveLead = useCallback((id: string, status: LeadStatus) => {
    setState((s) => ({
      ...s,
      leads: s.leads.map((l) =>
        l.id === id
          ? { ...l, status, bookedDate: status === "booked" ? l.bookedDate ?? l.preferredDate ?? dstr(60) : l.bookedDate }
          : l,
      ),
    }));
  }, []);

  const addNote = useCallback((leadId: string, body: string) => {
    setState((s) => ({ ...s, notes: [{ id: uid(), leadId, body, createdAt: new Date().toISOString() }, ...s.notes] }));
  }, []);

  /* ---------- commerce ---------- */

  const addTradeOrder = useCallback((o: Omit<TradeOrder, "id" | "status" | "createdAt">) => {
    setState((s) => ({ ...s, tradeOrders: [{ ...o, id: uid(), status: "new", createdAt: new Date().toISOString() }, ...s.tradeOrders] }));
  }, []);

  const fulfillTradeOrder = useCallback((id: string) => {
    setState((s) => ({ ...s, tradeOrders: s.tradeOrders.map((t) => (t.id === id ? { ...t, status: "fulfilled" } : t)) }));
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setState((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);

  const addProduct = useCallback(
    (p: { name: string; type: Product["type"]; varietal: string; vintage: string | null; priceCents: number; stock: number; description: string }) => {
      const product: Product = {
        id: uid(),
        stripePriceId: "price_demo_" + uid(),
        featured: false,
        active: true,
        images: [],
        ...p,
      };
      setState((s) => ({ ...s, products: [product, ...s.products] }));
    },
    [],
  );

  /* ---------- product photos ---------- */

  const addProductImages = useCallback(
    async (productId: string, files: File[]): Promise<{ added: number; errors: string[] }> => {
      const product = stateRef.current.products.find((p) => p.id === productId);
      if (!product) return { added: 0, errors: ["That product no longer exists."] };

      const room = MAX_IMAGES_PER_PRODUCT - (product.images?.length ?? 0);
      const errors: string[] = [];
      if (room <= 0) return { added: 0, errors: [`${product.name} already has ${MAX_IMAGES_PER_PRODUCT} photos — remove one first.`] };
      if (files.length > room) errors.push(`Only ${room} slot${room === 1 ? "" : "s"} left, so the first ${room} were used.`);

      const accepted: ProductImage[] = [];
      for (const file of files.slice(0, room)) {
        try {
          const prepared = await prepareImage(file);
          const id = uid();
          await putImage(id, prepared.blob);
          accepted.push({
            id,
            alt: "",
            width: prepared.width,
            height: prepared.height,
            bytes: prepared.blob.size,
            type: prepared.type,
            addedAt: new Date().toISOString(),
          });
        } catch (e) {
          errors.push(e instanceof Error ? e.message : `"${file.name}" couldn't be added.`);
        }
      }

      if (accepted.length > 0) {
        setState((s) => ({
          ...s,
          products: s.products.map((p) => (p.id === productId ? { ...p, images: [...(p.images ?? []), ...accepted].slice(0, MAX_IMAGES_PER_PRODUCT) } : p)),
        }));
      }
      return { added: accepted.length, errors };
    },
    [],
  );

  const removeProductImage = useCallback((productId: string, imageId: string) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === productId ? { ...p, images: (p.images ?? []).filter((i) => i.id !== imageId) } : p)),
    }));
    void deleteImages([imageId]);
  }, []);

  const setPrimaryImage = useCallback((productId: string, imageId: string) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) => {
        if (p.id !== productId) return p;
        const target = (p.images ?? []).find((i) => i.id === imageId);
        if (!target) return p;
        return { ...p, images: [target, ...(p.images ?? []).filter((i) => i.id !== imageId)] };
      }),
    }));
  }, []);

  const moveProductImage = useCallback((productId: string, imageId: string, direction: -1 | 1) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) => {
        if (p.id !== productId) return p;
        const images = [...(p.images ?? [])];
        const from = images.findIndex((i) => i.id === imageId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= images.length) return p;
        [images[from], images[to]] = [images[to], images[from]];
        return { ...p, images };
      }),
    }));
  }, []);

  const updateImageAlt = useCallback((productId: string, imageId: string, alt: string) => {
    setState((s) => ({
      ...s,
      products: s.products.map((p) =>
        p.id === productId ? { ...p, images: (p.images ?? []).map((i) => (i.id === imageId ? { ...i, alt } : i)) } : p,
      ),
    }));
  }, []);

  /* ---------- sequences / email ---------- */

  const updateSequence = useCallback((id: string, steps: SequenceStep[]) => {
    setState((s) => ({ ...s, sequences: s.sequences.map((q) => (q.id === id ? { ...q, steps } : q)) }));
  }, []);

  const toggleSequence = useCallback((id: string) => {
    setState((s) => ({ ...s, sequences: s.sequences.map((q) => (q.id === id ? { ...q, active: !q.active } : q)) }));
  }, []);

  const dueEmails = useMemo(
    () =>
      state.sends
        .filter((e) => e.status === "scheduled" && new Date(e.sendAt).getTime() <= Date.now())
        .filter((e) => {
          const lead = state.leads.find((l) => l.id === e.leadId);
          return lead ? lead.status !== "booked" && lead.status !== "archived" : true;
        }),
    [state.sends, state.leads],
  );

  const sendDueEmails = useCallback((): number => {
    let count = 0;
    setState((s) => ({
      ...s,
      sends: s.sends.map((e) => {
        const due = e.status === "scheduled" && new Date(e.sendAt).getTime() <= Date.now();
        if (due) count += 1;
        return due ? { ...e, status: "sent" as const } : e;
      }),
    }));
    return count;
  }, []);

  /* ---------- CMS / appearance ---------- */

  const updateConfig = useCallback((patch: Partial<SiteConfig>) => {
    setState((s) => ({ ...s, config: { ...s.config, ...patch } }));
  }, []);

  /* ---------- journal ---------- */

  /** Creates an empty draft and returns it so the editor can open on it. */
  const addPost = useCallback((): BlogPost => {
    const today = new Date().toISOString().slice(0, 10);
    const post: BlogPost = {
      id: uid(),
      slug: "",
      title: "",
      excerpt: "",
      body: "",
      category: "Wine",
      tags: [],
      author: "Harcourt Valley",
      authorRole: "The family",
      publishedAt: today,
      updatedAt: today,
      readMinutes: 1,
      featured: false,
      published: false,
      image: IMG.vines,
      imageAlt: "",
    };
    setState((s) => ({ ...s, posts: [post, ...s.posts] }));
    return post;
  }, []);

  const updatePost = useCallback((id: string, patch: Partial<BlogPost>) => {
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch, updatedAt: new Date().toISOString().slice(0, 10) };
        /* Keep the derived bits honest without making the editor babysit them. */
        if (!next.slug.trim()) next.slug = slugify(next.title) || p.id;
        next.slug = slugify(next.slug);
        next.readMinutes = readingMinutes(next.body);
        return next;
      }),
    }));
  }, []);

  const deletePost = useCallback((id: string) => {
    setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
  }, []);

  /**
   * Reseeds the demo. Refused outright once a backend is live: the diff sync
   * would read a wholesale swap as "delete every row" and take the real
   * enquiries, orders and website copy with it. Reseeding is a demo affordance,
   * not something that should exist next to live customer records.
   */
  const resetDemo = useCallback((): boolean => {
    if (isRemote) return false;
    setState(freshState());
    setCart([]);
    /* The seed has no photos, so every stored blob is now unreferenced. */
    void clearImages();
    return true;
  }, []);

  /* ---------- outreach ---------- */

  const addProfile = useCallback((p: Omit<Bee23Profile, "id">) => {
    setState((s) => ({ ...s, profiles: [...s.profiles, { ...p, id: uid() }] }));
  }, []);

  const addOutbox = useCallback((items: Omit<OutboxItem, "id" | "updatedAt" | "state">[]) => {
    setState((s) => ({
      ...s,
      outbox: [...items.map((i) => ({ ...i, id: uid(), state: "draft" as const, updatedAt: new Date().toISOString() })), ...s.outbox],
    }));
  }, []);

  const setOutboxState = useCallback((id: string, st: OutboxItem["state"]) => {
    setState((s) => ({ ...s, outbox: s.outbox.map((o) => (o.id === id ? { ...o, state: st, updatedAt: new Date().toISOString() } : o)) }));
  }, []);

  const value: StoreValue = {
    ...state,
    backend,
    toasts,
    toast,
    cart,
    cartOpen,
    setCartOpen,
    cartCount,
    cartTotalCents,
    addToCart,
    setCartQty,
    removeLine,
    placeOrder,
    addLead,
    updateLead,
    moveLead,
    addNote,
    addTradeOrder,
    fulfillTradeOrder,
    updateProduct,
    addProduct,
    addProductImages,
    removeProductImage,
    setPrimaryImage,
    moveProductImage,
    updateImageAlt,
    updateSequence,
    toggleSequence,
    updateConfig,
    addPost,
    updatePost,
    deletePost,
    resetDemo,
    sendDueEmails,
    dueEmails,
    addProfile,
    addOutbox,
    setOutboxState,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

/* Variant A/B toggle for the home page (client preview only). */
const VARIANT_KEY = "hv-variant";
export function useVariant(): [string, (v: string) => void] {
  const [variant, setVariant] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("variant");
      if (q === "a" || q === "b") return q;
      const saved = localStorage.getItem(VARIANT_KEY);
      return saved === "b" ? "b" : "a";
    } catch {
      return "a";
    }
  });
  const set = useCallback((v: string) => {
    setVariant(v);
    try {
      localStorage.setItem(VARIANT_KEY, v);
    } catch {
      /* private mode */
    }
  }, []);
  return [variant, set];
}

/* Applies CMS appearance choices (palette + display font) to the document root. */
export function useApplyAppearance() {
  const { config } = useStore();
  useEffect(() => {
    const root = document.documentElement;
    const palettes: Record<SiteConfig["palette"], { g: string; v: string; o: string }> = {
      granite: { g: "#67252f", v: "#4c5b3f", o: "#b77a2e" },
      orchard: { g: "#5b2440", v: "#3e5a44", o: "#9a6b23" },
    };
    const fonts: Record<SiteConfig["displayFont"], string> = {
      fraunces: '"Fraunces"',
      cormorant: '"Cormorant Garamond"',
      marcellus: '"Marcellus"',
    };
    const p = palettes[config.palette] ?? palettes.granite;
    root.style.setProperty("--acc-garnet", p.g);
    root.style.setProperty("--acc-vine", p.v);
    root.style.setProperty("--acc-ochre", p.o);
    root.style.setProperty("--display-font", fonts[config.displayFont] ?? fonts.fraunces);
  }, [config.palette, config.displayFont]);
}

export { iso };
