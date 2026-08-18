import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fmtDate, fmtDateLong, timeAgo, type Lead } from "../../lib/data";
import { useApplyAppearance, useStore } from "../../lib/store";
import { Wordmark } from "../../components/chrome";
import { ArrowRight, CloseIcon, MailIcon, MenuIcon, SendIcon, TypeChip, Tick } from "../../components/ui";
import { CompassIcon, Walkthrough, type TourStep } from "../../components/Walkthrough";
import { CalendarView, KanbanView } from "./Pipeline";
import { LeadsView } from "./Leads";
import { SequencesView } from "./Sequences";
import { CmsView } from "./Cms";
import { ShopManagerView, TradeInboxView } from "./Ops";
import { OutreachView } from "./Outreach";

export type Tab = "overview" | "pipeline" | "calendar" | "leads" | "sequences" | "cms" | "trade" | "shop" | "outreach";

const TABS: { id: Tab; label: string; group: string }[] = [
  { id: "overview", label: "Today", group: "Day to day" },
  { id: "pipeline", label: "Enquiries pipeline", group: "Day to day" },
  { id: "calendar", label: "Booked dates", group: "Day to day" },
  { id: "leads", label: "Enquiries", group: "Day to day" },
  { id: "trade", label: "Trade orders", group: "Wine side" },
  { id: "shop", label: "Shop & stock", group: "Wine side" },
  { id: "sequences", label: "Email sequences", group: "Behind the scenes" },
  { id: "cms", label: "Website content", group: "Behind the scenes" },
  { id: "outreach", label: "Outreach (Bee23)", group: "Behind the scenes" },
];

function Glyph({ tab }: { tab: Tab }) {
  const p = "w-4 h-4";
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const };
  switch (tab) {
    case "overview":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" {...s} />
          <path d="M12 8v4l2.8 1.8" {...s} />
        </svg>
      );
    case "pipeline":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <rect x="3.5" y="4.5" width="5" height="15" {...s} />
          <rect x="10" y="4.5" width="5" height="10" {...s} />
          <rect x="16.5" y="4.5" width="5" height="7" {...s} />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <rect x="3.5" y="5.5" width="17" height="15" {...s} />
          <path d="M3.5 10h17M8 3.5v4M16 3.5v4" {...s} />
        </svg>
      );
    case "leads":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <circle cx="12" cy="8.5" r="3.5" {...s} />
          <path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" {...s} />
        </svg>
      );
    case "trade":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <path d="M4 8h16v11H4zM4 8l2-4h12l2 4M9.5 12.5h5" {...s} />
        </svg>
      );
    case "shop":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <path d="M10 3.5h4v4.2c0 1.6 3 2.3 3 5.3a5 5 0 0 1-10 0c0-3 3-3.7 3-5.3V3.5Z" {...s} />
          <path d="M8 20.5h8" {...s} />
        </svg>
      );
    case "sequences":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <rect x="3.5" y="5.5" width="17" height="13" {...s} />
          <path d="m4 7 8 6 8-6" {...s} />
        </svg>
      );
    case "cms":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <path d="m14.5 5 4.5 4.5L8 20.5H3.5V16L14.5 5Z" {...s} />
        </svg>
      );
    case "outreach":
      return (
        <svg viewBox="0 0 24 24" className={p} aria-hidden="true">
          <path d="M20 4 10 14M20 4l-6.5 16-3.5-6L4 10.5 20 4Z" {...s} />
        </svg>
      );
  }
}

/* ---------------- the guided tour ---------------- */

const TOUR_SEEN_KEY = "hv-walkthrough-seen";

function buildTourSteps(go: (t: Tab) => void): TourStep[] {
  const at = (t: Tab) => () => go(t);
  return [
    {
      id: "welcome",
      title: "Welcome to the family office.",
      body: "This is your desk. Two of you run this place, and everything you need is on this one screen — enquiries, bookings, trade orders, and the website itself.",
      tip: "Nothing here can break. Click about. Use \u2190 and \u2192 to move through this tour, or Esc to leave it.",
      placement: "centre",
    },
    {
      id: "nav",
      title: "Everything lives down the left.",
      body: "Three groups. \u201cDay to day\u201d is where you'll spend most mornings. \u201cWine side\u201d is orders and stock. \u201cBehind the scenes\u201d is the automatic stuff you set once and leave alone.",
      tip: "The ochre number beside Enquiries counts anything you haven't opened yet.",
      target: "admin-nav",
      before: at("overview"),
    },
    {
      id: "today",
      title: "Start every morning here.",
      body: "New enquiries sit at the top because they're the thing worth answering first. Click any name to open the full enquiry and reply.",
      tip: "If this panel is empty, you're genuinely ahead. Go and walk the rows.",
      target: "admin-today",
      before: at("overview"),
    },
    {
      id: "pipeline",
      title: "Drag enquiries along as they progress.",
      body: "Every enquiry starts in New enquiry and moves right: Info pack sent, Visiting, Negotiating, Booked. Drag the cards between columns. Anything you set to Booked lands on the calendar on its own.",
      tip: "The dot colour tells you the kind of enquiry at a glance: ochre for weddings, vine green for events, grey for trade.",
      placement: "dock",
      before: at("pipeline"),
    },
    {
      id: "calendar",
      title: "Booked dates, at a glance.",
      body: "Everything you've marked as Booked lands on this calendar automatically. It's the fastest way to answer \u201care you free that Saturday?\u201d without opening a spreadsheet.",
      tip: "One wedding a day is the house rule — this view is how you keep that promise.",
      placement: "dock",
      before: at("calendar"),
    },
    {
      id: "leads",
      title: "The full enquiry record.",
      body: "Search and filter every enquiry that has ever come in. Open one and you get their details, the emails already sent, and a notes panel for anything said on the phone.",
      tip: "Write the note while you're still on the call. Nobody has ever regretted too much detail here.",
      placement: "dock",
      before: at("leads"),
    },
    {
      id: "trade",
      title: "Trade orders to pack.",
      body: "When a bottle shop or restaurant orders, it appears here. Pack the order, mark it dispatched, and the confirmation email goes out on its own.",
      tip: "Keep packing materials within arm's reach of the desk. Future you says thanks.",
      placement: "dock",
      before: at("trade"),
    },
    {
      id: "shop",
      title: "Wines, prices and stock.",
      body: "Edit a wine's price, tasting note or stock count and the public site updates the moment you save. Drop the count to zero and the shop marks it sold out straight away.",
      tip: "Adjust stock the day you bottle, not the day you notice it's wrong.",
      placement: "dock",
      before: at("shop"),
    },
    {
      id: "sequences",
      title: "Let the emails write themselves.",
      body: "Each enquiry type has its own run of emails. Someone asks about a wedding, they get your wedding information without you touching the keyboard. You can still write personally on top.",
      tip: "Write like a person, not a brochure. \u201cThanks for thinking of us\u201d beats \u201cThank you for your enquiry\u201d every time.",
      placement: "dock",
      before: at("sequences"),
    },
    {
      id: "cms",
      title: "The website, editable.",
      body: "Headlines, opening hours, the photographs, the accent colours — change them here and the live site follows. No developer, no waiting.",
      tip: "Change one thing at a time and look at the site after each. It's easier to undo that way.",
      placement: "dock",
      before: at("cms"),
    },
    {
      id: "outreach",
      title: "Going out and finding work.",
      body: "Bee23 works the other direction: it finds venues and stockists that look like your best customers, and the outbox holds the notes you're sending them.",
      tip: "Two considered emails a week beats fifty sent in one afternoon.",
      placement: "dock",
      before: at("outreach"),
    },
    {
      id: "actions",
      title: "The top bar, whenever you need it.",
      body: "View live site opens the public website in the same window. Reset demo data puts the sample enquiries back if you've been experimenting. And Tour reopens this walkthrough — it's always there.",
      tip: "Take the tour again whenever something feels unfamiliar. It costs a minute.",
      target: "admin-actions",
      before: at("overview"),
    },
    {
      id: "done",
      title: "That's the whole desk.",
      body: "The rest you'll pick up by using it. If a label ever reads oddly or a step feels back to front, tell us — we'd rather rename it than have you work around it.",
      tip: "Plain English on purpose. If wording confuses you, that's our bug, not yours.",
      placement: "centre",
    },
  ];
}

/* ---------------- sign-in gate (demo magic link) ---------------- */

function SignIn({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const go = () => {
    if (sent) {
      onIn();
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 900);
  };

  return (
    <div className="min-h-svh grid place-items-center bg-bone px-4">
      <div className="w-full max-w-md border-2 border-granite-900 bg-bone shadow-hard p-8 sm:p-10 rise-in">
        <Wordmark />
        <h1 className="font-display text-3xl font-medium mt-7">The family office.</h1>
        <p className="text-sm text-granite-700 mt-2 leading-relaxed">Two people, one desk, every enquiry and booking in one place. Sign in with a magic link — no passwords to forget.</p>
        <div className="mt-6">
          <label className="field-label" htmlFor="adm-email">
            Your email
          </label>
          <input id="adm-email" type="email" className="field-input" placeholder="you@harcourtvalley.example" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary w-full mt-5" onClick={go} disabled={sending}>
          {sent ? "Open the office" : sending ? "Sending link…" : "Send sign-in link"}
        </button>
        {sent ? <p className="text-sm text-vine font-medium mt-3">Link "arrived" — this is the demo, so just press the button again.</p> : null}
        <p className="text-xs text-granite-500 mt-5">In production this is Supabase magic-link auth for the two admin users only. No public sign-up.</p>
      </div>
    </div>
  );
}

/* ---------------- overview ---------------- */

function Overview({ go, openLead }: { go: (t: Tab) => void; openLead: (id: string) => void }) {
  const { leads, dueEmails, sendDueEmails, toast, tradeOrders } = useStore();

  const newLeads = leads.filter((l) => l.status === "new");
  const today = new Date();
  const in30 = new Date(Date.now() + 30 * 86400000);
  const upcoming = leads
    .filter((l) => l.status === "booked" && l.bookedDate && new Date(l.bookedDate + "T12:00:00") >= today && new Date(l.bookedDate + "T12:00:00") <= in30)
    .sort((a, b) => (a.bookedDate! < b.bookedDate! ? -1 : 1));
  const tradeNew = tradeOrders.filter((t) => t.status === "new");

  const sendNow = () => {
    const n = sendDueEmails();
    toast(n > 0 ? `${n} email${n === 1 ? "" : "s"} sent from the sequences.` : "Nothing due right now.");
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-granite-500">{fmtDateLong(new Date().toISOString())}</p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Today at the valley.</h1>
        </div>
        {dueEmails.length > 0 ? (
          <button type="button" className="btn btn-primary" onClick={sendNow}>
            <SendIcon className="w-4 h-4" /> Send {dueEmails.length} due email{dueEmails.length === 1 ? "" : "s"}
          </button>
        ) : (
          <button type="button" className="btn btn-dark" onClick={() => go("pipeline")}>
            Open the pipeline <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main focus area - what needs attention */}
      <div className="mt-8 space-y-4">
        {/* New enquiries - most important */}
        <div data-tour="admin-today" className="border-2 border-granite-900 bg-bone lux-lift">
          <div className="px-6 py-4 border-b-2 border-granite-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-ochre pulse-dot text-ochre" aria-hidden="true" />
              <p className="kicker text-granite-500">New enquiries need your attention</p>
            </div>
            <button type="button" onClick={() => go("leads")} className="text-sm font-label font-semibold text-garnet hover:underline underline-offset-4">
              View all {newLeads.length} →
            </button>
          </div>
          <div className="divide-y divide-granite-200">
            {newLeads.slice(0, 5).map((l) => (
              <button key={l.id} type="button" onClick={() => openLead(l.id)} className="w-full text-left px-6 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-granite-50 transition-colors">
                <span className="font-label font-semibold text-sm w-48 truncate">{l.names}</span>
                <TypeChip type={l.type} subtype={l.subtype} />
                <span className="text-sm text-granite-500 ml-auto">{timeAgo(l.createdAt)}</span>
              </button>
            ))}
            {newLeads.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Tick className="w-6 h-6 text-vine mx-auto mb-2" />
                <p className="text-sm text-granite-600">Inbox zero. Take a walk through the vines.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Two column layout for secondary info */}
        <div className="grid md:grid-cols-2 gap-4 stagger">
          {/* Upcoming bookings */}
          <div className="border-2 border-granite-900 bg-bone lux-lift">
            <div className="px-5 py-3.5 border-b-2 border-granite-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-vine" aria-hidden="true" />
                <p className="kicker text-granite-500 text-[0.7rem]">Coming up · next 30 days</p>
              </div>
              <button type="button" onClick={() => go("calendar")} className="text-xs font-label font-semibold text-granite-600 hover:text-granite-900">
                Calendar →
              </button>
            </div>
            <ul className="divide-y divide-granite-200 max-h-56 overflow-y-auto thin-scroll">
              {upcoming.slice(0, 4).map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => openLead(l.id)} className="w-full text-left px-5 py-2.5 flex items-center gap-3 hover:bg-granite-50 transition-colors">
                    <span className="text-xs font-label font-semibold text-granite-700 w-16 shrink-0">{fmtDate(l.bookedDate)}</span>
                    <span className="text-sm text-granite-700 truncate">{l.names}</span>
                  </button>
                </li>
              ))}
              {upcoming.length === 0 ? (
                <li className="px-5 py-4 text-center text-sm text-granite-500">No bookings this month</li>
              ) : null}
            </ul>
          </div>

          {/* Trade orders */}
          <div className="border-2 border-granite-900 bg-bone lux-lift">
            <div className="px-5 py-3.5 border-b-2 border-granite-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-granite-500" aria-hidden="true" />
                <p className="kicker text-granite-500 text-[0.7rem]">Trade orders to pack</p>
              </div>
              <button type="button" onClick={() => go("trade")} className="text-xs font-label font-semibold text-granite-600 hover:text-granite-900">
                Trade inbox →
              </button>
            </div>
            <ul className="divide-y divide-granite-200 max-h-56 overflow-y-auto thin-scroll">
              {tradeNew.slice(0, 4).map((t) => (
                <li key={t.id} className="px-5 py-2.5">
                  <button type="button" onClick={() => go("trade")} className="w-full text-left hover:bg-granite-50 transition-colors rounded px-[-5px] py-[-2.5px]">
                    <p className="text-sm font-label font-semibold text-granite-700 truncate">{t.business}</p>
                    <p className="text-xs text-granite-500">
                      {t.lines.reduce((n, l) => n + l.qty, 0)} bottles · {timeAgo(t.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
              {tradeNew.length === 0 ? (
                <li className="px-5 py-4 text-center text-sm text-granite-500">No orders waiting</li>
              ) : null}
            </ul>
          </div>
        </div>

        {/* Sequence emails - full width when due */}
        {dueEmails.length > 0 ? (
          <div className="border-2 border-granite-900 bg-bone">
            <div className="px-5 py-3.5 border-b-2 border-granite-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MailIcon className="w-4 h-4 text-ochre" />
                <p className="kicker text-granite-500 text-[0.7rem]">Emails ready to send</p>
              </div>
              <button type="button" onClick={sendNow} className="btn btn-sm btn-primary">
                <SendIcon className="w-3.5 h-3.5" /> Send all {dueEmails.length}
              </button>
            </div>
            <ul className="divide-y divide-granite-200 max-h-48 overflow-y-auto thin-scroll">
              {dueEmails.slice(0, 5).map((s) => (
                <li key={s.id} className="px-5 py-2.5 flex items-center gap-3">
                  <span className="text-sm text-granite-700 truncate">{s.leadName}</span>
                  <span className="text-xs text-granite-500">·</span>
                  <span className="text-xs text-granite-600">{s.stepLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border-2 border-dashed border-granite-300 bg-bone/50 rounded-none px-5 py-4 text-center">
            <p className="text-sm text-granite-600">All caught up on sequence emails. Well done.</p>
          </div>
        )}
      </div>

      {/* Recent activity strip */}
      <div className="mt-8 border-2 border-granite-900 bg-granite-100/40 lux-lift">
        <div className="px-6 py-4 border-b-2 border-granite-900 flex items-center justify-between">
          <p className="kicker text-granite-500">Latest enquiries</p>
          <button type="button" className="kicker text-garnet hover:underline underline-offset-4" onClick={() => go("leads")}>
            See all
          </button>
        </div>
        <ul className="divide-y divide-granite-300">
          {leads.slice(0, 5).map((l: Lead) => (
            <li key={l.id}>
              <button type="button" onClick={() => openLead(l.id)} className="w-full text-left px-6 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 hover:bg-bone transition-colors">
                <span className="font-label font-semibold text-sm w-56 truncate">{l.names}</span>
                <TypeChip type={l.type} subtype={l.subtype} />
                <span className="text-sm text-granite-500">{fmtDate(l.preferredDate)}</span>
                <span className="text-sm text-granite-500 ml-auto">{timeAgo(l.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- shell ---------------- */

export default function Admin() {
  useApplyAppearance();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("hv-admin") === "1");
  const [tab, setTab] = useState<Tab>("overview");
  const [focusLeadId, setFocusLeadId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => localStorage.getItem(TOUR_SEEN_KEY) !== "1");
  const { resetDemo, toast, leads } = useStore();

  const newCount = useMemo(() => leads.filter((l) => l.status === "new").length, [leads]);

  useEffect(() => {
    if (authed) sessionStorage.setItem("hv-admin", "1");
  }, [authed]);

  const openLead = (id: string) => {
    setFocusLeadId(id);
    setTab("leads");
    setNavOpen(false);
  };

  const signOut = useCallback(() => {
    setAuthed(false);
    sessionStorage.removeItem("hv-admin");
  }, []);

  const go = useCallback((t: Tab) => {
    setTab(t);
    setNavOpen(false);
  }, []);

  const tourSteps = useMemo(() => buildTourSteps(go), [go]);

  const endTour = useCallback(() => {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
    setTourOpen(false);
  }, []);

  const finishTour = useCallback(() => {
    endTour();
    go("overview");
    toast("Tour finished — reopen it any time from \u201cTour\u201d in the top bar.");
  }, [endTour, go, toast]);

  if (!authed) return <SignIn onIn={() => setAuthed(true)} />;

  const groups = ["Day to day", "Wine side", "Behind the scenes"] as const;

  const nav = (
    <nav aria-label="Admin sections" className="flex md:flex-col gap-1 overflow-x-auto thin-scroll md:overflow-visible px-3 md:px-4 py-3">
      {groups.map((g) => (
        <div key={g} className="md:mb-4 shrink-0 md:shrink">
          <p className="kicker text-granite-500 text-[0.6rem] px-2.5 mb-1.5 hidden md:block">{g}</p>
          {TABS.filter((t) => t.group === g).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`w-auto md:w-full flex items-center gap-2.5 px-2.5 py-2.5 min-h-[44px] font-label text-[0.8rem] font-semibold border-2 transition-colors whitespace-nowrap ${
                tab === t.id ? "border-granite-900 bg-granite-900 text-bone" : "border-transparent text-granite-700 hover:bg-granite-100"
              }`}
            >
              <Glyph tab={t.id} />
              {t.label}
              {t.id === "leads" && newCount > 0 ? (
                <span className={`ml-auto text-[0.65rem] font-bold px-1.5 py-0.5 border ${tab === t.id ? "border-bone/50 text-bone" : "border-granite-900 text-granite-900 bg-ochre"}`}>
                  {newCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-svh bg-bone flex flex-col">
      {/* top bar */}
      <header className="sticky top-0 z-50 bg-bone/95 backdrop-blur-[2px] border-b-2 border-granite-900">
        <div className="px-4 sm:px-6 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/" aria-label="Back to the live site" className="shrink-0">
              <Wordmark />
            </Link>
            <span className="hidden xl:inline-flex btn btn-sm btn-dark pointer-events-none select-none">Family office</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0" data-tour="admin-actions">
            <button
              type="button"
              className="btn btn-sm btn-ghost px-3 lg:px-4"
              onClick={() => setTourOpen(true)}
              aria-label="Replay the walkthrough"
            >
              <CompassIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Tour</span>
            </button>
            <Link to="/" className="btn btn-sm btn-ghost hidden md:inline-flex">
              View live site
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-ghost hidden lg:inline-flex"
              onClick={() => {
                resetDemo();
                toast("Demo data reset to the seed.");
              }}
            >
              Reset demo data
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost hidden sm:inline-flex"
              onClick={signOut}
            >
              Sign out
            </button>
            <button type="button" className="btn btn-sm btn-ghost px-3 md:hidden" onClick={() => setNavOpen(!navOpen)} aria-expanded={navOpen} aria-label="Toggle sections">
              {navOpen ? <CloseIcon className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {navOpen ? (
          <div className="md:hidden border-t-2 border-granite-900 bg-bone">
            {nav}
            <div className="px-3 pb-3 flex flex-wrap gap-2 sm:hidden">
              <Link to="/" className="btn btn-sm btn-ghost">
                View live site
              </Link>
              <button type="button" className="btn btn-sm btn-ghost" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="flex-1 flex">
        {/* sidebar (desktop) */}
        <aside data-tour="admin-nav" className="hidden md:block w-60 shrink-0 border-r-2 border-granite-900 bg-bone sticky top-[64px] h-[calc(100svh-64px)] overflow-y-auto thin-scroll">
          {nav}
          <div className="px-6 pb-6 mt-2">
            <p className="text-xs text-granite-500 leading-relaxed border-t border-granite-300 pt-4">
              Plain-English on purpose. If a label here ever confuses you, tell us and we'll rename it.
            </p>
          </div>
        </aside>

        {/* content */}
        <main key={tab} className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-8 max-w-[1200px] page-in">
          {tab === "overview" ? <Overview go={go} openLead={openLead} /> : null}
          {tab === "pipeline" ? <KanbanView openLead={openLead} /> : null}
          {tab === "calendar" ? <CalendarView openLead={openLead} /> : null}
          {tab === "leads" ? <LeadsView focusLeadId={focusLeadId} clearFocus={() => setFocusLeadId(null)} /> : null}
          {tab === "sequences" ? <SequencesView /> : null}
          {tab === "cms" ? <CmsView /> : null}
          {tab === "trade" ? <TradeInboxView /> : null}
          {tab === "shop" ? <ShopManagerView /> : null}
          {tab === "outreach" ? <OutreachView /> : null}
        </main>
      </div>

      <Walkthrough steps={tourSteps} open={tourOpen} onClose={endTour} onFinish={finishTour} />
    </div>
  );
}
