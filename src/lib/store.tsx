import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Bee23Profile, CartLine, EmailSend, Lead, LeadNote, LeadStatus, Order, OutboxItem, Product,
  Sequence, SequenceStep, SiteConfig, TradeOrder,
  DAY, dstr, iso, seedConfig, seedLeads, seedNotes, seedOrders, seedOutbox, seedProducts,
  seedProfiles, seedSequences, seedSends, seedTradeOrders, uid,
} from "./data";

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
  config: SiteConfig;
}

const STORAGE_KEY = "hv-state-v3";

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
    config: seedConfig(),
  };
}

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (parsed && parsed.config && parsed.products) {
        // State saved before a config field existed would arrive without it, so
        // seed defaults fill the gaps rather than reaching the site as undefined.
        return { ...parsed, config: { ...seedConfig(), ...parsed.config } };
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

interface StoreValue extends StoreState {
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
  updateSequence: (id: string, steps: SequenceStep[]) => void;
  toggleSequence: (id: string) => void;
  updateConfig: (patch: Partial<SiteConfig>) => void;
  resetDemo: () => void;
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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
        ...p,
      };
      setState((s) => ({ ...s, products: [product, ...s.products] }));
    },
    [],
  );

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

  const resetDemo = useCallback(() => {
    setState(freshState());
    setCart([]);
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
    updateSequence,
    toggleSequence,
    updateConfig,
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
