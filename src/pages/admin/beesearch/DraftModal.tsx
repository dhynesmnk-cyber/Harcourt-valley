import { useState } from "react";
import type { OutboxItem } from "../../../lib/data";
import { Modal } from "../../../components/Modal";
import { MailIcon, Tick } from "../../../components/ui";
import { copyText, draftToText } from "./copy";

/**
 * Read, rewrite and copy a draft.
 *
 * The copy button is the whole point: this site has no mail service, so
 * copying the text into the user's own email client is the only way it ever
 * reaches anyone. Previously the text was read-only and could only be
 * extracted by selecting it with the mouse.
 */
export function DraftModal({
  item,
  onClose,
  onSave,
  onState,
  onConvert,
  toast,
}: {
  item: OutboxItem;
  onClose: () => void;
  onSave: (patch: { subject?: string; body?: string }) => void;
  onState: (state: OutboxItem["state"]) => void;
  onConvert: () => void;
  toast: (m: string) => void;
}) {
  const [subject, setSubject] = useState(item.subject);
  const [body, setBody] = useState(item.body);
  const email = item.emails?.[0] ?? null;

  const saveIfChanged = () => {
    const patch: { subject?: string; body?: string } = {};
    if (subject !== item.subject) patch.subject = subject;
    if (body !== item.body) patch.body = body;
    if (patch.subject !== undefined || patch.body !== undefined) onSave(patch);
  };

  const copyDraft = async () => {
    saveIfChanged();
    toast((await copyText(draftToText(subject, body)))
      ? "Copied. Paste it into your own email and send it from there."
      : "Couldn't reach the clipboard — select the text and copy it by hand.");
  };

  const copyAddress = async () => {
    if (!email) return;
    toast((await copyText(email)) ? "Address copied." : "Couldn't reach the clipboard.");
  };

  const act = (state: OutboxItem["state"], message: string) => {
    saveIfChanged();
    onState(state);
    onClose();
    toast(message);
  };

  return (
    <Modal
      onClose={() => { saveIfChanged(); onClose(); }}
      title={
        <>
          <p className="kicker text-granite-500">Draft</p>
          <p className="font-display text-xl font-medium mt-0.5">{item.business}</p>
        </>
      }
      footer={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-dark btn-sm" onClick={copyDraft}>
            Copy the draft
          </button>
          {item.state === "draft" ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => act("approved", "Marked ready. Copy it across whenever you like.")}>
              Mark it ready
            </button>
          ) : null}
          {item.state === "approved" ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => act("sent", "Logged as sent. Watching for a reply is on you.")}>
              <Tick className="w-3.5 h-3.5" /> I've sent this
            </button>
          ) : null}
          {item.state === "sent" ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => act("replied", "Marked as replied. Convert it whenever you're ready.")}>
                They replied
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => act("declined", "Marked declined. It's tucked away in Closed out.")}>
                No thanks
              </button>
            </>
          ) : null}
          {item.state === "replied" ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { saveIfChanged(); onConvert(); }}>
              <Tick className="w-3.5 h-3.5" /> Convert to enquiry
            </button>
          ) : null}
        </div>
      }
    >
      {/* where it goes — the address the engine scraped off their own site */}
      <div className="border border-granite-300 bg-granite-100/50 px-4 py-3">
        {email ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-500">To</span>
            <span className="text-sm">
              <MailIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              {email}
            </span>
            <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={copyAddress}>
              Copy address
            </button>
          </div>
        ) : (
          <p className="text-sm text-granite-700">
            BeeSearch didn't find an address on their website. You'll need to look one up before you send this.
          </p>
        )}
        {item.websiteUrl ? (
          <p className="text-xs text-granite-500 mt-1.5">
            <a href={item.websiteUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {item.websiteUrl}
            </a>
          </p>
        ) : null}
      </div>

      {/* why it matched */}
      {item.matchedOn || item.compositeScore != null || item.recommendedStrategy ? (
        <div className="mt-4 border border-granite-300 p-4">
          <p className="kicker text-granite-500">Why this one</p>
          {item.matchedOn ? <p className="text-sm text-granite-700 mt-1.5 leading-relaxed">{item.matchedOn}</p> : null}
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-granite-700">
            {item.compositeScore != null ? <span>Fit score: <strong>{Math.round(item.compositeScore)}</strong></span> : null}
            {item.recommendedStrategy ? <span>Suggested approach: <strong>{item.recommendedStrategy}</strong></span> : null}
          </div>
        </div>
      ) : null}

      {/* the draft itself, editable */}
      <label className="block mt-5">
        <span className="block font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-700 mb-1.5">Subject</span>
        <input className="field-input" value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={saveIfChanged} />
      </label>

      <label className="block mt-4">
        <span className="block font-label text-xs font-bold uppercase tracking-[0.08em] text-granite-700 mb-1.5">Message</span>
        <textarea
          className="field-input min-h-[280px] leading-relaxed thin-scroll"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={saveIfChanged}
        />
        <span className="block text-xs text-granite-500 mt-1.5">
          Change anything you like — it's your voice that has to land. Edits save as you go.
        </span>
      </label>
    </Modal>
  );
}
