import type {
  BeeSearchProfile, EmailSend, Lead, LeadNote, Order, OutboxItem,
  Product, Sequence, SiteConfig, TradeOrder,
} from "./data";
import { seedConfig } from "./data";
import { supabase } from "./supabase";

/**
 * The bridge between the store's camelCase types and the snake_case tables.
 *
 * Every mutation in the app funnels through one setState, so rather than
 * rewriting eighteen callbacks to be async, `syncState` diffs the old state
 * against the new one and writes just the rows that actually moved. Writes are
 * per-row, so two people editing different leads don't overwrite each other.
 */

export interface RemoteState {
  products: Product[];
  leads: Lead[];
  notes: LeadNote[];
  orders: Order[];
  tradeOrders: TradeOrder[];
  sequences: Sequence[];
  sends: EmailSend[];
  profiles: BeeSearchProfile[];
  outbox: OutboxItem[];
  config: SiteConfig;
}

/* ---------------- row mappers ---------------- */

const productRow = (p: Product) => ({
  id: p.id, name: p.name, type: p.type, varietal: p.varietal, vintage: p.vintage,
  price_cents: p.priceCents, stripe_price_id: p.stripePriceId, stock: p.stock,
  description: p.description, featured: p.featured, active: p.active,
});
const toProduct = (r: any): Product => ({
  id: r.id, name: r.name, type: r.type, varietal: r.varietal ?? "", vintage: r.vintage,
  priceCents: r.price_cents, stripePriceId: r.stripe_price_id ?? "", stock: r.stock,
  description: r.description ?? "", featured: !!r.featured, active: !!r.active,
  // No images column yet — photos are browser-local (IndexedDB), so a row
  // from the backend never carries them. The store overlays local images
  // back onto these on hydrate; see the comment there.
  images: [],
});

const leadRow = (l: Lead) => ({
  id: l.id, type: l.type, subtype: l.subtype ?? null, names: l.names, email: l.email,
  phone: l.phone, preferred_date: l.preferredDate, guest_count: l.guestCount,
  message: l.message, status: l.status, booked_date: l.bookedDate, source: l.source,
  info_pack: l.infoPack, wants_visit: l.wantsVisit, created_at: l.createdAt,
});
const toLead = (r: any): Lead => ({
  id: r.id, type: r.type, subtype: r.subtype ?? undefined, names: r.names, email: r.email,
  phone: r.phone ?? "", preferredDate: r.preferred_date, guestCount: r.guest_count,
  message: r.message ?? "", status: r.status, bookedDate: r.booked_date, source: r.source,
  infoPack: !!r.info_pack, wantsVisit: !!r.wants_visit, createdAt: r.created_at,
});

const noteRow = (n: LeadNote) => ({ id: n.id, lead_id: n.leadId, body: n.body, created_at: n.createdAt });
const toNote = (r: any): LeadNote => ({ id: r.id, leadId: r.lead_id, body: r.body ?? "", createdAt: r.created_at });

const orderRow = (o: Order) => ({
  id: o.id, customer: o.customer, email: o.email, lines: o.lines,
  total_cents: o.totalCents, status: o.status, created_at: o.createdAt,
});
const toOrder = (r: any): Order => ({
  id: r.id, customer: r.customer, email: r.email, lines: r.lines ?? [],
  totalCents: r.total_cents, status: r.status, createdAt: r.created_at,
});

const tradeRow = (t: TradeOrder) => ({
  id: t.id, business: t.business, abn: t.abn, contact: t.contact, email: t.email,
  phone: t.phone, lines: t.lines, notes: t.notes, status: t.status, created_at: t.createdAt,
});
const toTrade = (r: any): TradeOrder => ({
  id: r.id, business: r.business, abn: r.abn ?? "", contact: r.contact ?? "", email: r.email ?? "",
  phone: r.phone ?? "", lines: r.lines ?? [], notes: r.notes ?? "", status: r.status, createdAt: r.created_at,
});

const sequenceRow = (q: Sequence) => ({ id: q.id, name: q.name, audience: q.audience, active: q.active, steps: q.steps });
const toSequence = (r: any): Sequence => ({ id: r.id, name: r.name, audience: r.audience, active: !!r.active, steps: r.steps ?? [] });

const sendRow = (e: EmailSend) => ({
  id: e.id, lead_id: e.leadId, lead_name: e.leadName, step_label: e.stepLabel,
  subject: e.subject, send_at: e.sendAt, status: e.status,
});
const toSend = (r: any): EmailSend => ({
  id: r.id, leadId: r.lead_id, leadName: r.lead_name ?? "", stepLabel: r.step_label ?? "",
  subject: r.subject ?? "", sendAt: r.send_at, status: r.status,
});

const profileRow = (p: BeeSearchProfile) => ({ id: p.id, name: p.name, who: p.who, criteria: p.criteria, kind: p.kind });
const toProfile = (r: any): BeeSearchProfile => ({ id: r.id, name: r.name, who: r.who ?? "", criteria: r.criteria ?? [], kind: r.kind ?? "stockist" });

const outboxRow = (o: OutboxItem) => ({
  id: o.id, business: o.business, contact: o.contact, subject: o.subject, body: o.body,
  matched_on: o.matchedOn ?? null, composite_score: o.compositeScore ?? null, recommended_strategy: o.recommendedStrategy ?? null,
  state: o.state, sent_at: o.sentAt, converted_lead_id: o.convertedLeadId, updated_at: o.updatedAt,
});
const toOutbox = (r: any): OutboxItem => ({
  id: r.id, business: r.business, contact: r.contact ?? "", subject: r.subject ?? "", body: r.body ?? "",
  matchedOn: r.matched_on ?? undefined, compositeScore: r.composite_score ?? null, recommendedStrategy: r.recommended_strategy ?? null,
  state: r.state, sentAt: r.sent_at ?? null, convertedLeadId: r.converted_lead_id ?? null, updatedAt: r.updated_at,
});

/* ---------------- hydrate ---------------- */

/**
 * Reads whatever this visitor is allowed to see. On the public site RLS lets
 * only products and the config through and the rest come back empty, which is
 * the intended shape — the marketing pages need nothing else.
 */
export async function hydrate(): Promise<RemoteState | null> {
  if (!supabase) return null;

  const [products, leads, notes, orders, tradeOrders, sequences, sends, profiles, outbox, config] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("lead_notes").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("trade_orders").select("*").order("created_at", { ascending: false }),
    supabase.from("sequences").select("*"),
    supabase.from("email_sends").select("*"),
    supabase.from("beesearch_profiles").select("*"),
    supabase.from("outbox").select("*"),
    supabase.from("site_config").select("data").eq("id", 1).maybeSingle(),
  ]);

  // A hard failure on products or config means the backend isn't usable and the
  // caller should stay on the local copy rather than blank the site.
  if (products.error || config.error) {
    console.error("Could not reach the backend:", products.error?.message ?? config.error?.message);
    return null;
  }

  return {
    products: (products.data ?? []).map(toProduct),
    leads: (leads.data ?? []).map(toLead),
    notes: (notes.data ?? []).map(toNote),
    orders: (orders.data ?? []).map(toOrder),
    tradeOrders: (tradeOrders.data ?? []).map(toTrade),
    sequences: (sequences.data ?? []).map(toSequence),
    sends: (sends.data ?? []).map(toSend),
    profiles: (profiles.data ?? []).map(toProfile),
    outbox: (outbox.data ?? []).map(toOutbox),
    config: { ...seedConfig(), ...((config.data?.data as SiteConfig) ?? {}) },
  };
}

/* ---------------- diffing sync ---------------- */

type Keyed = { id: string };

/** Rows that are new or whose contents changed, plus ids that disappeared. */
function diff<T extends Keyed>(prev: T[], next: T[]) {
  const before = new Map(prev.map((r) => [r.id, r]));
  const after = new Map(next.map((r) => [r.id, r]));
  const changed = next.filter((r) => {
    const was = before.get(r.id);
    return !was || JSON.stringify(was) !== JSON.stringify(r);
  });
  const removed = prev.filter((r) => !after.has(r.id)).map((r) => r.id);
  return { changed, removed };
}

async function push<T extends Keyed>(
  table: string,
  prev: T[],
  next: T[],
  toRow: (row: T) => Record<string, unknown>,
  errors: string[],
) {
  if (!supabase) return;
  const { changed, removed } = diff(prev, next);

  if (changed.length > 0) {
    const { error } = await supabase.from(table).upsert(changed.map(toRow));
    if (error) errors.push(`${table}: ${error.message}`);
  }
  if (removed.length > 0) {
    const { error } = await supabase.from(table).delete().in("id", removed);
    if (error) errors.push(`${table}: ${error.message}`);
  }
}

/** Rows present in `next` that weren't in `prev`. */
function added<T extends Keyed>(prev: T[], next: T[]): T[] {
  const before = new Set(prev.map((r) => r.id));
  return next.filter((r) => !before.has(r.id));
}

/**
 * Writes the difference between two states.
 *
 * Without an admin session this is deliberately narrow: RLS grants the public
 * insert and nothing else, so we insert the newly-created enquiry or order and
 * leave every other table alone. Trying to upsert them would need UPDATE rights
 * the anon key doesn't have, and would just generate noise on every keystroke.
 */
export async function syncState(prev: RemoteState, next: RemoteState, isAdmin: boolean): Promise<string[]> {
  if (!supabase) return [];
  const errors: string[] = [];

  if (!isAdmin) {
    const newLeads = added(prev.leads, next.leads);
    const newOrders = added(prev.orders, next.orders);
    const newTrade = added(prev.tradeOrders, next.tradeOrders);

    for (const lead of newLeads) {
      const message = await submitLead(lead);
      if (message) errors.push(`leads: ${message}`);
    }
    for (const order of newOrders) {
      const message = await submitOrder(order);
      if (message) errors.push(`orders: ${message}`);
    }
    for (const order of newTrade) {
      const message = await submitTradeOrder(order);
      if (message) errors.push(`trade_orders: ${message}`);
    }
    return errors;
  }

  await Promise.all([
    push("products", prev.products, next.products, productRow, errors),
    push("leads", prev.leads, next.leads, leadRow, errors),
    push("lead_notes", prev.notes, next.notes, noteRow, errors),
    push("orders", prev.orders, next.orders, orderRow, errors),
    push("trade_orders", prev.tradeOrders, next.tradeOrders, tradeRow, errors),
    push("sequences", prev.sequences, next.sequences, sequenceRow, errors),
    push("email_sends", prev.sends, next.sends, sendRow, errors),
    push("beesearch_profiles", prev.profiles, next.profiles, profileRow, errors),
    push("outbox", prev.outbox, next.outbox, outboxRow, errors),
  ]);

  if (JSON.stringify(prev.config) !== JSON.stringify(next.config)) {
    const { error } = await supabase.from("site_config").upsert({ id: 1, data: next.config, updated_at: new Date().toISOString() });
    if (error) errors.push(`site_config: ${error.message}`);
  }

  return errors;
}

/* ---------------- public-site writes ---------------- */

/**
 * An enquiry or an order from a visitor, written with the anon key. These are
 * the only two things RLS lets the public do, and they're insert-only.
 */
export async function submitLead(lead: Lead): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("leads").insert(leadRow(lead));
  return error?.message ?? null;
}

export async function submitOrder(order: Order): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("orders").insert(orderRow(order));
  return error?.message ?? null;
}

export async function submitTradeOrder(order: TradeOrder): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from("trade_orders").insert(tradeRow(order));
  return error?.message ?? null;
}
