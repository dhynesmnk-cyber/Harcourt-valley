import { ArrowUpRight, MailIcon, SearchIcon } from "../../../components/ui";
import type { BeeSearchDiscoverySuggestion } from "../../../lib/beesearchEngine";

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * What the search found, shown on the card that ran it. The old screen wrote
 * every result into one shared panel near the top of the page, so pressing
 * "Find matches" on a target further down appeared to do nothing at all.
 */
export function DiscoveryResults({
  suggestions,
  writingId,
  dismissingId,
  onWrite,
  onDismiss,
}: {
  suggestions: BeeSearchDiscoverySuggestion[];
  writingId: number | null;
  dismissingId: number | null;
  onWrite: (s: BeeSearchDiscoverySuggestion) => void;
  onDismiss: (s: BeeSearchDiscoverySuggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-5 border-t-2 border-granite-900 pt-5">
      <p className="kicker text-granite-500">
        <SearchIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
        {suggestions.length} {suggestions.length === 1 ? "business" : "businesses"} found
      </p>

      <ul className="mt-3 space-y-3">
        {suggestions.map((s) => {
          const email = s.emails?.[0] ?? null;
          return (
            <li key={s.id} className="border border-granite-300 bg-granite-100/50 p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-label font-semibold">{s.accountName}</p>
                {s.relevanceScore > 0 ? (
                  <span className="text-[0.68rem] font-label font-bold uppercase tracking-[0.08em] text-ochre">
                    Relevance {Math.round(s.relevanceScore)}
                  </span>
                ) : null}
              </div>

              {s.reason ? <p className="text-sm text-granite-700 mt-1.5 leading-relaxed">{s.reason}</p> : null}

              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {s.websiteUrl ? (
                  <a
                    href={s.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-label font-semibold text-granite-700 hover:text-granite-900 underline underline-offset-2"
                  >
                    {hostOf(s.websiteUrl)} <ArrowUpRight className="w-3 h-3 inline -mt-0.5" />
                  </a>
                ) : (
                  <span className="text-granite-500">No website found</span>
                )}

                {email ? (
                  <span className="text-granite-700">
                    <MailIcon className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                    {email}
                  </span>
                ) : (
                  <span className="text-granite-500">No address on their site — you'd need to find one</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  disabled={writingId === s.id}
                  onClick={() => onWrite(s)}
                >
                  {writingId === s.id ? "Writing…" : "Write the draft"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={dismissingId === s.id}
                  onClick={() => onDismiss(s)}
                >
                  {dismissingId === s.id ? "Noting…" : "Not this one"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
