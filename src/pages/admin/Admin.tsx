import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fmtDate, fmtDateLong, timeAgo, type Lead } from "../../lib/data";
import { useApplyAppearance, useStore } from "../../lib/store";
import { Wordmark } from "../../components/chrome";
import { ArrowRight, CloseIcon, MailIcon, MenuIcon, SendIcon, TypeChip } from "../../components/ui";
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

      <div className="mt-8 grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* New enquiries */}
        <button type="button" onClick={() => go("leads")} className="text-left border-2 border-granite-900 bg-bone p-6 hover:shadow-hard transition-shadow">
          <p className="kicker text-granite-500">New enquiries</p>
          <p className="font-display text-5xl font-medium mt-2">{newLeads.length}</p>
          <div className="mt-4 space-y-2">
            {newLeads.slice(0, 3).map((l) => (
              <p key={l.id} className="text-sm text-granite-700 truncate">
                <span className="font-label font-semibold">{l.names}</span> · {timeAgo(l.createdAt)}
              </p>
            ))}
            {newLeads.length === 0 ? <p className="text-sm text-granite-500">Inbox zero. Enjoy it while it lasts.</p> : null}
          </div>
        </button>

        {/* Upcoming bookings */}
        <button type="button" onClick={() => go("calendar")} className="text-left border-2 border-granite-900 bg-bone p-6 hover:shadow-hard transition-shadow">
          <p className="kicker text-granite-500">Booked · next 30 days</p>
          <p className="font-display text-5xl font-medium mt-2">{upcoming.length}</p>
          <div className="mt-4 space-y-2">
            {upcoming.slice(0, 3).map((l) => (
              <p key={l.id} className="text-sm text-granite-700 truncate">
                <span className="font-label font-semibold">{fmtDate(l.bookedDate)}</span> · {l.names}
              </p>
            ))}
            {upcoming.length === 0 ? <p className="text-sm text-granite-500">Nothing on the calendar this month.</p> : null}
          </div>
        </button>

        {/* Sequence emails */}
        <div className="border-2 border-granite-900 bg-bone p-6">
          <p className="kicker text-granite-500">Sequence emails due</p>
          <p className="font-display text-5xl font-medium mt-2">{dueEmails.length}</p>
          <div className="mt-4 space-y-2">
            {dueEmails.slice(0, 3).map((s) => (
              <p key={s.id} className="text-sm text-granite-700 truncate">
                <MailIcon className="w-3.5 h-3.5 inline mr-1.5 text-ochre" />
                {s.leadName} · {s.stepLabel}
              </p>
            ))}
            {dueEmails.length === 0 ? <p className="text-sm text-granite-500">All caught up.</p> : null}
          </div>
        </div>

        {/* Trade */}
        <button type="button" onClick={() => go("trade")} className="text-left border-2 border-granite-900 bg-bone p-6 hover:shadow-hard transition-shadow">
          <p className="kicker text-granite-500">Trade orders to pack</p>
          <p className="font-display text-5xl font-medium mt-2">{tradeNew.length}</p>
          <div className="mt-4 space-y-2">
            {tradeNew.slice(0, 3).map((t) => (
              <p key={t.id} className="text-sm text-granite-700 truncate">
                <span className="font-label font-semibold">{t.business}</span> · {timeAgo(t.createdAt)}
              </p>
            ))}
            {tradeNew.length === 0 ? <p className="text-sm text-granite-500">No trade orders waiting.</p> : null}
          </div>
        </button>
      </div>

      {/* Recent activity strip */}
      <div className="mt-8 border-2 border-granite-900 bg-granite-100/40">
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

  const go = (t: Tab) => {
    setTab(t);
    setNavOpen(false);
  };

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
          <div className="flex items-center gap-4">
            <Link to="/" aria-label="Back to the live site">
              <Wordmark />
            </Link>
            <span className="hidden sm:inline-flex btn btn-sm btn-dark pointer-events-none select-none">Family office</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="btn btn-sm btn-ghost hidden sm:inline-flex">
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
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setAuthed(false);
                sessionStorage.removeItem("hv-admin");
              }}
            >
              Sign out
            </button>
            <button type="button" className="btn btn-sm btn-ghost px-3 md:hidden" onClick={() => setNavOpen(!navOpen)} aria-expanded={navOpen} aria-label="Toggle sections">
              {navOpen ? <CloseIcon className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {navOpen ? <div className="md:hidden border-t-2 border-granite-900 bg-bone">{nav}</div> : null}
      </header>

      <div className="flex-1 flex">
        {/* sidebar (desktop) */}
        <aside className="hidden md:block w-60 shrink-0 border-r-2 border-granite-900 bg-bone sticky top-[64px] h-[calc(100svh-64px)] overflow-y-auto thin-scroll">
          {nav}
          <div className="px-6 pb-6 mt-2">
            <p className="text-xs text-granite-500 leading-relaxed border-t border-granite-300 pt-4">
              Plain-English on purpose. If a label here ever confuses you, tell us and we'll rename it.
            </p>
          </div>
        </aside>

        {/* content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-8 max-w-[1200px]">
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
    </div>
  );
}
