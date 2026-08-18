/* ------------------------------------------------------------------ */
/*  Harcourt Valley — data model, seed content, helpers                */
/* ------------------------------------------------------------------ */

export const IMG = {
  vines: "https://image.qwenlm.ai/generated-images/f6170caa-669e-442a-b93f-6328f8d283dd/_result.png",
  cellarDoor: "https://image.qwenlm.ai/generated-images/191b0224-3603-4641-9638-e86387ad18a6/_result.png",
  wedding: "https://image.qwenlm.ai/generated-images/da7db9f7-6904-4826-9e5d-6164e17a320f/_result.png",
  longTable: "https://image.qwenlm.ai/generated-images/d6af84d7-34e5-450b-92f7-28f379ac2fd0/_result.png",
  barrels: "https://image.qwenlm.ai/generated-images/8d3f6066-7f41-458e-a7a9-a9c47185b529/_result.png",
  granite: "https://image.qwenlm.ai/generated-images/9650ed38-0786-4672-83da-1dc72fd48f36/_result.png",
  bottles: "https://image.qwenlm.ai/generated-images/1924b912-5e4c-494a-891a-14c50bceb47d/_result.png",
} as const;

export type LeadType = "wedding" | "event" | "trade";
export type EventSubtype = "party" | "dinner" | "launch" | "retreat";
export type LeadStatus = "new" | "info_sent" | "visiting" | "negotiating" | "booked" | "archived";

export interface Lead {
  id: string;
  type: LeadType;
  subtype?: EventSubtype;
  names: string;
  email: string;
  phone: string;
  preferredDate: string | null;
  guestCount: number | null;
  message: string;
  status: LeadStatus;
  bookedDate: string | null;
  source: "website" | "bee23";
  infoPack: boolean;
  wantsVisit: boolean;
  createdAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  body: string;
  createdAt: string;
}

export type ProductType = "wine" | "beer" | "mead";

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  varietal: string;
  vintage: string | null;
  priceCents: number;
  stripePriceId: string;
  stock: number;
  description: string;
  featured: boolean;
  active: boolean;
}

export interface CartLine {
  productId: string;
  qty: number;
}

export interface Order {
  id: string;
  customer: string;
  email: string;
  lines: { name: string; qty: number; priceCents: number }[];
  totalCents: number;
  status: "paid" | "fulfilled";
  createdAt: string;
}

export interface TradeOrder {
  id: string;
  business: string;
  abn: string;
  contact: string;
  email: string;
  phone: string;
  lines: { productId: string; qty: number }[];
  notes: string;
  status: "new" | "fulfilled";
  createdAt: string;
}

export interface SequenceStep {
  id: string;
  order: number;
  delayDays: number;
  subject: string;
  body: string;
}

export interface Sequence {
  id: string;
  name: string;
  audience: "wedding" | "event";
  active: boolean;
  steps: SequenceStep[];
}

export interface EmailSend {
  id: string;
  leadId: string;
  leadName: string;
  stepLabel: string;
  subject: string;
  sendAt: string;
  status: "scheduled" | "sent";
}

export interface Bee23Profile {
  id: string;
  name: string;
  who: string;
  criteria: string[];
}

export interface OutboxItem {
  id: string;
  business: string;
  contact: string;
  subject: string;
  body: string;
  state: "draft" | "approved" | "sent";
  updatedAt: string;
}

export interface Ballpark {
  label: string;
  range: string;
  note: string;
}

/* A line that types itself out on the site. Leave `author` blank and it reads
   as a feature; fill it in and it reads as a review. */
export const TYPED_PAGES = ["home", "winery", "weddings", "events"] as const;
export type TypedPage = (typeof TYPED_PAGES)[number];

export const typedPageLabel: Record<TypedPage, string> = {
  home: "Home page",
  winery: "Winery",
  weddings: "Weddings",
  events: "Events",
};

export interface TypedLine {
  id: string;
  page: TypedPage;
  text: string;
  author: string;
}

export interface SiteConfig {
  heroHeadline: string;
  heroSub: string;
  heroImage: string;
  weddingsHeadline: string;
  weddingBallparks: Ballpark[];
  eventBallparks: Ballpark[];
  inclusions: string[];
  typedLines: TypedLine[];
  palette: "granite" | "orchard";
  displayFont: "fraunces" | "cormorant" | "marcellus";
}

/* ---------------- helpers ---------------- */

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

export const DAY = 86400000;

export function iso(offsetDays = 0, hour = 10): string {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function dstr(offsetDays = 0): string {
  return iso(offsetDays).slice(0, 10);
}

export function fmtDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T12:00:00" : s);
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

export function fmtDateLong(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T12:00:00" : s);
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function money(cents: number): string {
  const dollars = cents / 100;
  return "$" + dollars.toLocaleString("en-AU", { minimumFractionDigits: cents % 100 === 0 ? 0 : 2 });
}

export function timeAgo(s: string): string {
  const diff = Date.now() - new Date(s).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New enquiry" },
  { value: "info_sent", label: "Info pack sent" },
  { value: "visiting", label: "Visiting" },
  { value: "negotiating", label: "Negotiating" },
  { value: "booked", label: "Booked" },
  { value: "archived", label: "Archived" },
];

export const statusLabel = (s: LeadStatus) => LEAD_STATUSES.find((x) => x.value === s)?.label ?? s;

export const EVENT_SUBTYPES: { value: EventSubtype; label: string }[] = [
  { value: "party", label: "Party" },
  { value: "dinner", label: "Long-table dinner" },
  { value: "launch", label: "Launch" },
  { value: "retreat", label: "Retreat" },
];

/* ---------------- seed content (all copy per TONE.md) ---------------- */

export function seedProducts(): Product[] {
  return [
    {
      id: "old-vine-shiraz-2019", name: "2019 Old Vine Shiraz", type: "wine", varietal: "Shiraz", vintage: "2019",
      priceCents: 6000, stripePriceId: "price_HVoldvineshiraz19", stock: 60, featured: true, active: true,
      description: "The old vines at Harcourt Valley Vineyards were planted in 1975 by Ray and Barbara Broughton who established the vineyards. The vines are the oldest in the Mount Alexander Shire and sit at the lowest part of the property making them lower yielding and slower ripening. The Old Vine wines are only made in years when the fruit is of an exceptional quality. Production is limited to 60 cases. The wines are given only the finest French oak ensuring well integrated oak flavours and a fine tannin structure the complements the length and intensity of the wine.",
    },
    {
      id: "cabernet-sauvignon", name: "Cabernet Sauvignon", type: "wine", varietal: "Cabernet Sauvignon", vintage: null,
      priceCents: 2500, stripePriceId: "price_HVcabsauv", stock: 108, featured: true, active: true,
      description: "Harcourt Valley Cabernet Sauvignon displays great lifted aromatics of black current, mint, with a hint of eucalypt. This medium to full bodied wine shows a blackcurrant and savoury herbaceous pallet with slightly bigger tannins providing a great mouth feel for this wine.",
    },
    {
      id: "chardonnay", name: "Chardonnay", type: "wine", varietal: "Chardonnay", vintage: null,
      priceCents: 3000, stripePriceId: "price_HVchardonnay", stock: 108, featured: true, active: true,
      description: "The Harcourt Valley Chardonnay is made in a lightly oaked style, seeing wood for only 6 weeks during fermentation and then transferred to tank for maturation before bottling. This fruit driven style of Chardonnay displays a light golden straw hue, a hint of French oak and citrus aromas. The palate shows peach and fig with a small amount of malolactic fermentation (around 20%) and the mouth feel is rich yet textural, followed by a clean dry finish. A wine that can be enjoyed now, always selling out before the next vintage is ready.",
    },
    {
      id: "ginger-kid-4-5", name: "Ginger Kid 4.5% - 24 x 330ml", type: "beer", varietal: "Ginger beer", vintage: null,
      priceCents: 8000, stripePriceId: "price_HVgingerkid45", stock: 48, featured: false, active: true,
      description: "Around Harcourt Valley, the Ginger Kid is known for its kick. We don't dare over-sweeten it. The Ginger Kid simply is how it is - strong, bitey and varying with the seasons - just as nature intended. Refreshingly honest, the Ginger Kid has 4.5% alcohol, zero gluten and the ripsnorting zing of genuine Aussie ginger.",
    },
    {
      id: "ginger-kid-8", name: "Ginger Kid Extra Strong 8% - 24 x 330ml", type: "beer", varietal: "Ginger beer", vintage: null,
      priceCents: 8000, stripePriceId: "price_HVgingerkid8", stock: 48, featured: false, active: true,
      description: "Around Harcourt Valley, the Ginger Kid is known for its kick. We don't dare over-sweeten it. The Ginger Kid simply is how it is - strong, bitey and varying with the seasons - just as nature intended. Refreshingly honest, the Ginger Kid has 8.0% alcohol, zero gluten and the ripsnorting zing of genuine Aussie ginger.",
    },
    {
      id: "riesling", name: "Riesling", type: "wine", varietal: "Riesling", vintage: null,
      priceCents: 2000, stripePriceId: "price_HVriesling", stock: 108, featured: false, active: true,
      description: "Harcourt Valley Riesling is made in an off dry style displaying lifted floral aromas, followed by a slightly sweet palate with hints of citrus (lime) and plenty of acidity to dry out the finish. This is a great wine to enjoy with spicy Asian dishes, cheese platters or on its own on a warm sunny day.",
    },
    {
      id: "rose", name: "Rosé", type: "wine", varietal: "Malbec Rosé", vintage: null,
      priceCents: 2000, stripePriceId: "price_HVrose", stock: 108, featured: true, active: true,
      description: "Made from a small parcel of Malbec grown at Harcourt Valley Vineyards. A wine that can be enjoyed now, always selling out before the next vintage is ready.",
    },
    {
      id: "sparkling-rose", name: "Sparkling Rosè", type: "wine", varietal: "Sparkling Rosé", vintage: "NV",
      priceCents: 2000, stripePriceId: "price_HVsparklingrose", stock: 108, featured: false, active: true,
      description: "A pale pink colour with fresh fruity aromas. Displaying sweetness on the mid palate with a fresh clean finish. Perfect for a hot summer's day.",
    },
  ];
}

export function seedLeads(): Lead[] {
  return [
    {
      id: "l1", type: "wedding", names: "Priya & Daniel Rao", email: "priya.rao@example.com", phone: "0412 889 201",
      preferredDate: dstr(92), guestCount: 110, status: "info_sent", bookedDate: null, source: "website",
      infoPack: true, wantsVisit: true, createdAt: iso(-2),
      message: "We grew up in Bendigo and want something unhurried — ceremony in the vines, dinner outside if the weather holds.",
    },
    {
      id: "l2", type: "wedding", names: "Sarah Whitfield & Tom Ng", email: "sarah.w@example.com", phone: "0433 120 455",
      preferredDate: dstr(148), guestCount: 85, status: "new", bookedDate: null, source: "website",
      infoPack: true, wantsVisit: false, createdAt: iso(-0.2, 9),
      message: "Thinking about an autumn Saturday. Could you send through your info pack and wet-weather plan?",
    },
    {
      id: "l3", type: "event", subtype: "launch", names: "Marcus Chen — Fieldwork Coffee", email: "marcus@fieldwork.example.com", phone: "0401 556 733",
      preferredDate: dstr(21), guestCount: 60, status: "visiting", bookedDate: null, source: "website",
      infoPack: true, wantsVisit: true, createdAt: iso(-9),
      message: "Single-origin launch, standing format, long tables for the tasting flights. Needs power for a small bar setup.",
    },
    {
      id: "l4", type: "wedding", names: "Eliza Hart & Mia Torres", email: "eliza.hart@example.com", phone: "0455 902 118",
      preferredDate: dstr(46), guestCount: 120, status: "negotiating", bookedDate: null, source: "website",
      infoPack: true, wantsVisit: true, createdAt: iso(-21),
      message: "Held a date after the visit. Working through whether a Friday in season fits the budget.",
    },
    {
      id: "l5", type: "wedding", names: "Jess & Tom O'Neill", email: "oneill.wedding@example.com", phone: "0418 220 947",
      preferredDate: dstr(12), guestCount: 100, status: "booked", bookedDate: dstr(12), source: "website",
      infoPack: true, wantsVisit: false, createdAt: iso(-160),
      message: "Booked. Menu tasting done, wines locked — Shiraz and Riesling on the tables.",
    },
    {
      id: "l6", type: "event", subtype: "dinner", names: "Bendigo Writers Group", email: "events@bwg.example.com", phone: "0409 331 086",
      preferredDate: dstr(33), guestCount: 44, status: "booked", bookedDate: dstr(33), source: "website",
      infoPack: false, wantsVisit: false, createdAt: iso(-75),
      message: "Long-table dinner with a reading between courses. Dietary list to follow.",
    },
    {
      id: "l7", type: "event", subtype: "party", names: "Anna Coates — 50th", email: "anna.coates@example.com", phone: "0427 664 519",
      preferredDate: dstr(74), guestCount: 40, status: "new", bookedDate: null, source: "website",
      infoPack: false, wantsVisit: false, createdAt: iso(-1.1, 15),
      message: "A long lunch for my 50th — your wine, a grazing table, the garden if it's warm.",
    },
    {
      id: "l8", type: "event", subtype: "retreat", names: "Fern & Ivy Leadership", email: "hello@fernivy.example.com", phone: "0400 218 340",
      preferredDate: null, guestCount: 24, status: "archived", bookedDate: null, source: "bee23",
      infoPack: false, wantsVisit: false, createdAt: iso(-210),
      message: "Chose a coastal venue for this year. Worth re-approaching for spring planning days.",
    },
  ];
}

export function seedNotes(): LeadNote[] {
  return [
    { id: "n1", leadId: "l1", body: "Info pack sent. Priya asked about holding a date — offered a 14-day hold.", createdAt: iso(-2, 11) },
    { id: "n2", leadId: "l1", body: "Dan rang back: they want the October window, 110 guests. Visit booked for the first Saturday next month.", createdAt: iso(-1, 14) },
    { id: "n3", leadId: "l4", body: "Second visit done. They loved the shearing shed wet-weather plan. Sent Friday-in-season pricing.", createdAt: iso(-4, 10) },
    { id: "n4", leadId: "l5", body: "Deposit received, contract signed. Cellar key tasting scheduled two weeks out.", createdAt: iso(-30, 16) },
  ];
}

export function seedSequences(): Sequence[] {
  return [
    {
      id: "seq-wed", name: "Wedding info pack", audience: "wedding", active: true,
      steps: [
        {
          id: "w1", order: 1, delayDays: 0, subject: "Your Harcourt Valley wedding info pack",
          body: "Hi — thanks for thinking of us.\n\nAttached is the full info pack: capacities, what's included, the wet-weather plan, and straight numbers on what a day here costs.\n\nOne thing worth knowing early: we only ever host one wedding a day. The property is yours from 10am until midnight.\n\nIf a date is already circling, reply and I'll check it and hold it for 14 days — no pressure, no deposit.\n\n— Tom",
        },
        {
          id: "w2", order: 2, delayDays: 2, subject: "Quick answers — and what happens next",
          body: "A few things couples usually ask us:\n\nCapacity — 120 seated, 180 standing.\nWet weather — the old shearing shed, dressed properly. It photographs well, honestly.\nAccess — the whole property from 10am to midnight.\nCost — ballpark figures are on page 4 of the pack. Midweek and winter dates cost less.\n\nThe easiest next step is a visit. Tasting's on us. Reply with a couple of Saturdays that suit and I'll make it happen.\n\n— Tom",
        },
        {
          id: "w3", order: 3, delayDays: 6, subject: "Come and stand in the vines",
          body: "Last note from me — just an open invitation.\n\nPhotos only tell you so much. Come and stand where the ceremony would be, walk the function room, and taste what your guests would be drinking. It takes an hour, and it's on us.\n\nIf Harcourt isn't the one, no hard feelings — reply anyway and I'll close the loop so your inbox stays clean.\n\n— Tom",
        },
      ],
    },
    {
      id: "seq-evt", name: "Event info pack", audience: "event", active: true,
      steps: [
        {
          id: "e1", order: 1, delayDays: 0, subject: "Your Harcourt Valley event guide",
          body: "Hi — good to hear from you.\n\nAttached is the event guide: the function room, the garden, the shearing shed, capacities, power, and what a long table here actually costs.\n\nWe're flexible on format — standing launches, seated dinners, day retreats. If you can sketch the shape of it, I can sketch the numbers.\n\n— Tom",
        },
        {
          id: "e2", order: 2, delayDays: 2, subject: "Menus, wines, and the practical bits",
          body: "The practical side, briefly:\n\nCatering — our long-table kitchen, or bring your own. Both work.\nWine — ours, obviously. Trade pricing on the day.\nSetup — trestles, linen, festoon lights and the sound system are in the hire. Projector and mic on request.\nAccess — 10am to midnight, bump-in the day before if you need it.\n\nHappy to do a walk-through at whatever hour suits your team.\n\n— Tom",
        },
        {
          id: "e3", order: 3, delayDays: 5, subject: "A standing offer: come see the space",
          body: "Rather than more PDFs — come and see it.\n\nTwenty minutes from Bendigo. I'll walk you through the room, the garden and the shed, and open something cold while we talk numbers.\n\nIf it's not the right fit, tell me and I'll stop writing. If it is, we'll hold your date while you decide.\n\n— Tom",
        },
      ],
    },
  ];
}

export function seedSends(): EmailSend[] {
  return [
    { id: "s1", leadId: "l1", leadName: "Priya & Daniel Rao", stepLabel: "Step 1 · Day 0", subject: "Your Harcourt Valley wedding info pack", sendAt: iso(-2, 11), status: "sent" },
    { id: "s2", leadId: "l1", leadName: "Priya & Daniel Rao", stepLabel: "Step 2 · Day 2", subject: "Quick answers — and what happens next", sendAt: iso(0, 11), status: "scheduled" },
    { id: "s3", leadId: "l1", leadName: "Priya & Daniel Rao", stepLabel: "Step 3 · Day 6", subject: "Come and stand in the vines", sendAt: iso(4, 11), status: "scheduled" },
  ];
}

export function seedTradeOrders(): TradeOrder[] {
  return [
    {
      id: "t1", business: "Lake View Bottle Shop", abn: "51 822 461 003", contact: "Renata Kovic",
      email: "orders@lakeviewbottles.example.com", phone: "03 5472 1188",
      lines: [{ productId: "p1", qty: 24 }, { productId: "p3", qty: 12 }, { productId: "p6", qty: 48 }],
      notes: "First order. Shelf talkers welcome — the medals move the Shiraz.", status: "new", createdAt: iso(-1, 9),
    },
    {
      id: "t2", business: "Goldfields Dining Co.", abn: "78 110 925 447", contact: "Hugh Bramston",
      email: "hugh@goldfieldsdining.example.com", phone: "03 5443 9021",
      lines: [{ productId: "p2", qty: 18 }, { productId: "p5", qty: 6 }],
      notes: "Monthly standing order from March. Ask about the Muscat by the glass.", status: "fulfilled", createdAt: iso(-9, 14),
    },
  ];
}

export function seedOrders(): Order[] {
  return [
    {
      id: "ord-4821", customer: "Margaret Ellery", email: "m.ellery@example.com", status: "paid", createdAt: iso(-3, 13),
      lines: [{ name: "Granite Face Shiraz 2022", qty: 6, priceCents: 3800 }, { name: "Valley Riesling 2023", qty: 3, priceCents: 3000 }],
      totalCents: 6 * 3800 + 3 * 3000,
    },
  ];
}

export function seedProfiles(): Bee23Profile[] {
  return [
    {
      id: "bp1", name: "Regional stockists", who: "Independent bottle shops, wine bars and restaurants within a day's drive of Harcourt.",
      criteria: ["Independent bottle shops & wine bars", "Regional VIC & the Murray", "Already stock premium Central Victorian reds"],
    },
    {
      id: "bp2", name: "Wedding & event planners", who: "Planners and corporate coordinators booking 60–140 guest events within 90 minutes of the valley.",
      criteria: ["Planners within 90 min of Harcourt", "Couples & corporates of 60–140 guests", "Stylists who book vineyard venues already"],
    },
  ];
}

export function seedOutbox(): OutboxItem[] {
  return [
    {
      id: "ob1", business: "The Copper Still, Castlemaine", contact: "Nadia Ferreyra",
      subject: "A Shiraz your regulars keep asking about",
      body: "Hi Nadia — we're Harcourt Valley Vineyards, Bendigo's most-awarded winery (500+ medals, if the cabinet's to be believed).\n\nOur Granite Face Shiraz is pouring well at a few bars your size around the region, and it's margin-friendly at your by-the-glass price point. I'm through Castlemaine next Thursday — happy to drop a sample by.\n\nWorth ten minutes?\n\n— Tom",
      state: "sent", updatedAt: iso(-6, 10),
    },
  ];
}

export function seedTypedLines(): TypedLine[] {
  return [
    { id: "tl-h1", page: "home", text: "Five hundred medals, and they still pour it themselves.", author: "Halliday Wine Companion" },
    { id: "tl-h2", page: "home", text: "We drove ninety minutes for lunch and stayed until the light went.", author: "Priya R., Melbourne" },
    { id: "tl-h3", page: "home", text: "Grown, made and bottled within a five-minute walk of the bar.", author: "" },
    { id: "tl-h4", page: "home", text: "The oldest vineyard in the shire, planted 1874 and still cropping.", author: "" },

    { id: "tl-wi1", page: "winery", text: "The Shiraz tastes like the hill it came off — I mean that as a compliment.", author: "Bendigo Wine Show judge" },
    { id: "tl-wi2", page: "winery", text: "Tom opened four bottles and talked us through every one. No rush, no script.", author: "Daniel & Mia H." },
    { id: "tl-wi3", page: "winery", text: "Six bottles or more and the freight is on us.", author: "" },
    { id: "tl-wi4", page: "winery", text: "Wine from the blocks out front, beer from the orchard, mead from the hives.", author: "" },

    { id: "tl-we1", page: "weddings", text: "One wedding a day. The whole property was ours until midnight.", author: "Jess & Tom O'Neill" },
    { id: "tl-we2", page: "weddings", text: "It rained. The shed was so good nobody minded, least of all us.", author: "Eliza & Mia" },
    { id: "tl-we3", page: "weddings", text: "120 seated, 180 standing, 140 ceremony chairs set and packed away.", author: "" },
    { id: "tl-we4", page: "weddings", text: "A tasting for two before the day, always on us.", author: "" },

    { id: "tl-ev1", page: "events", text: "Forty of us down one long table, five courses, a pour with each.", author: "Marcus C., Fieldwork Coffee" },
    { id: "tl-ev2", page: "events", text: "They set up, they packed down, and the festoon lights did the rest.", author: "Anna C." },
    { id: "tl-ev3", page: "events", text: "Power, sound, trestles and lights included — bring the people.", author: "" },
  ];
}

export function seedConfig(): SiteConfig {
  return {
    heroHeadline: "Award-winning wine, grown on granite.",
    heroSub: "A working family vineyard in Harcourt — cellar door, weddings in the vines, and long tables under the granite hills. Ninety minutes from Melbourne, thirty from Bendigo.",
    heroImage: IMG.vines,
    weddingsHeadline: "Get married in the vines.",
    weddingBallparks: [
      { label: "Ceremony + reception, 80–120 guests", range: "$8,900 – $12,400", note: "Depends on season and day of week. Saturdays in autumn cost the most." },
      { label: "Midweek or winter date", range: "from $6,500", note: "Same property, same day-long access. The vines look good in winter too." },
      { label: "Ceremony only, up to 40 guests", range: "from $2,200", note: "An hour among the rows, photos in the granite, a glass in hand after." },
      { label: "Tasting for two, when you visit", range: "on us", note: "Always. Come and stand where it would happen." },
    ],
    eventBallparks: [
      { label: "Parties & long lunches", range: "from $1,400 · food from $95/head", note: "Grazing or seated, garden or function room. Wine is ours, priced at cellar door." },
      { label: "Long-table dinners", range: "from $120/head · 40–80 guests", note: "One long table, five courses, matched pours between them." },
      { label: "Product launches & brand days", range: "half-day $1,800 · full-day $2,800", note: "Power, sound, festoon lights and the trestles included. BYO barista optional." },
      { label: "Corporate retreats", range: "from $160/head with lunch & wine", note: "Morning in the room, lunch in the garden, a vine walk before the drive home." },
    ],
    inclusions: [
      "The whole property, 10am to midnight — one wedding a day, always",
      "Ceremony site among the vines, 140 chairs set and packed away",
      "Function room dressed for 120 seated, or 180 standing",
      "The shearing shed as a proper wet-weather plan, not a backup car park",
      "Long tables, cross-back chairs, linen and festoon lights",
      "A tasting for two before the day, on us",
      "Our coordinator on-site from bump-in to last dance",
      "Parking for 60 cars, and taxis know the way",
    ],
    typedLines: seedTypedLines(),
    palette: "granite",
    displayFont: "fraunces",
  };
}
