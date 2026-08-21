import { useState } from "react";
import { fmtDate, timeAgo, type OutboxItem } from "../../../lib/data";
import { MailIcon, Tick } from "../../../components/ui";
import { copyText, draftToText } from "./copy";

const COLUMNS = [
  { key: "draft", label: "Drafts", hint: "Written by BeeSearch. Read it over before it goes anywhere." },
  { key: "approved", label: "Ready to send", hint: "You've read it. Copy it into your email when you're ready." },
  { key: "sent", label: "You marked as sent", hint: "You told BeeSearch you'd sent it. It has no way to know by itself." },
  { key: "replied", label: "Replied", hint: "They wrote back. Convert it when you're ready." },
] as const;

export function OutboxBoard({
  outbox,
  onOpen,
  onState,
  onConvert,
  onViewLead,
  toast,
}: {
  outbox: OutboxItem[];
  onOpen: (o: OutboxItem) => void;
  onState: (id: string, state: OutboxItem["state"]) => void;
  onConvert: (o: OutboxItem) => void;
  onViewLead?: (id: string) => void;
  toast: (m: string) => void;
}) {
  const [showClosed, setShowClosed] = useState(false);

  const closed = outbox.filter((o) => o.state === "declined" || o.state === "converted");
  const grouped = {
    draft: outbox.filter((o) => o.state === "draft"),
    approved: outbox.filter((o) => o.state === "approved"),
    sent: outbox.filter((o) => o.state === "sent"),
    replied: outbox.filter((o) => o.state === "replied"),
  };

  const copy = async (o: OutboxItem) => {
    toast((await copyText(draftToText(o.subject, o.body)))
      ? "Copied. Paste it into your own email and send it from there."
      : "Couldn't reach the clipboard — open it and copy by hand.");
  };

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-granite-500">The outbox</p>
          <h2 className="font-display text-2xl font-medium mt-1">Drafts live here until you copy them out.</h2>
        </div>
        <p className="text-xs text-granite-500 max-w-sm sm:text-right leading-relaxed">
          Nothing is transmitted from this page. The last two columns are your own record of what you
          sent from your inbox.
        </p>
      </div>

      <div className="mt-5 grid lg:grid-cols-4 gap-5 items-start">
        {COLUMNS.map((col) => {
          const items = grouped[col.key];
          return (
            <div key={col.key} className="border-2 border-granite-900 bg-granite-100/60">
              <div className="px-4 py-3 border-b-2 border-granite-900 bg-bone">
                <p className="font-label font-semibold text-sm">
                  {col.label} · {items.length}
                </p>
                <p className="text-xs text-granite-500 mt-0.5 leading-relaxed">{col.hint}</p>
              </div>
              <div className="p-3 space-y-3 min-h-[120px]">
                {items.length === 0 ? (
                  <p className="text-sm text-granite-500 px-1 py-6 text-center">Empty for now.</p>
                ) : (
                  items.map((o) => {
                    const email = o.emails?.[0] ?? null;
                    return (
                      <div key={o.id} className="kb-card bg-bone border-2 border-granite-900 p-4">
                        <p className="font-label font-semibold text-sm">{o.business}</p>
                        <p className="text-xs text-granite-500 mt-0.5">{fmtDate(o.updatedAt.slice(0, 10))}</p>
                        <p className="text-xs mt-1.5 truncate">
                          {email ? (
                            <>
                              <MailIcon className="w-3 h-3 inline -mt-0.5 mr-1 text-granite-500" />
                              {email}
                            </>
                          ) : (
                            <span className="text-granite-500">No address found</span>
                          )}
                        </p>
                        {o.compositeScore != null ? (
                          <p className="text-xs text-garnet mt-1 font-label font-semibold">Fit score {Math.round(o.compositeScore)}</p>
                        ) : null}
                        <p className="text-sm text-granite-700 mt-2 line-clamp-2 leading-snug">{o.subject}</p>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <button type="button" className="btn btn-sm btn-ghost flex-1" onClick={() => onOpen(o)}>
                            Read &amp; edit
                          </button>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => copy(o)}>
                            Copy
                          </button>
                          {o.state === "draft" ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-dark w-full"
                              onClick={() => { onState(o.id, "approved"); toast("Marked ready."); }}
                            >
                              Mark it ready
                            </button>
                          ) : null}
                          {o.state === "approved" ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-dark w-full"
                              onClick={() => { onState(o.id, "sent"); toast("Logged as sent. Watching for a reply is on you."); }}
                            >
                              <Tick className="w-3.5 h-3.5" /> I've sent this
                            </button>
                          ) : null}
                          {o.state === "sent" ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary flex-1"
                                onClick={() => { onState(o.id, "replied"); toast("Marked as replied."); }}
                              >
                                They replied
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost flex-1"
                                onClick={() => { onState(o.id, "declined"); toast("Marked declined."); }}
                              >
                                No thanks
                              </button>
                            </>
                          ) : null}
                          {o.state === "replied" ? (
                            <button type="button" className="btn btn-sm btn-primary w-full" onClick={() => onConvert(o)}>
                              <Tick className="w-3.5 h-3.5" /> Convert to enquiry
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {closed.length > 0 ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            aria-expanded={showClosed}
            className="text-sm font-label font-semibold text-granite-700 hover:text-granite-900 underline underline-offset-2"
          >
            {showClosed ? "Hide" : "Show"} closed out ({closed.length})
          </button>
          {showClosed ? (
            <ul className="mt-3 divide-y divide-granite-300 border-2 border-granite-300">
              {closed.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="font-label font-semibold text-sm">{o.business}</span>
                  <span
                    className={`text-[0.62rem] font-label font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 border ${
                      o.state === "converted" ? "border-vine text-vine" : "border-granite-300 text-granite-500"
                    }`}
                  >
                    {o.state === "converted" ? "Converted to enquiry" : "Declined"}
                  </span>
                  <span className="text-xs text-granite-500 ml-auto">{timeAgo(o.updatedAt)}</span>
                  {o.state === "converted" && o.convertedLeadId && onViewLead ? (
                    <button
                      type="button"
                      className="text-xs font-label font-semibold text-granite-700 hover:text-granite-900"
                      onClick={() => onViewLead(o.convertedLeadId!)}
                    >
                      View enquiry →
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
