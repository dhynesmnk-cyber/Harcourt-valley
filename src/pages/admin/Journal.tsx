import React, { useEffect, useMemo, useState } from "react";
import { IMG, fmtPostDate, readingMinutes, slugify, type BlogPost } from "../../lib/data";
import { useStore } from "../../lib/store";
import { SITE_URL } from "../../lib/site";
import { ArrowRight, EmptyState, PlusIcon, Tick } from "../../components/ui";

/* ------------------------------------------------------------------ */
/*  Write and edit journal posts. One image per post, chosen from the  */
/*  photo library or pasted in — and alt text is a first-class field,  */
/*  not an afterthought, because it is doing real work for search.     */
/* ------------------------------------------------------------------ */

const IMAGE_LIBRARY: { src: string; label: string }[] = [
  { src: IMG.vines, label: "Vine rows at dusk" },
  { src: IMG.cellarDoor, label: "The cellar door pour" },
  { src: IMG.wedding, label: "Ceremony in the vines" },
  { src: IMG.longTable, label: "The long table" },
  { src: IMG.barrels, label: "Barrels in the cellar" },
  { src: IMG.granite, label: "Granite & gums" },
  { src: IMG.bottles, label: "The full range" },
];

const CATEGORIES = ["Wine", "Weddings", "Events", "Visiting", "The vineyard"];

/** Plain-English checks that decide whether a post can do any work in search. */
function seoChecks(p: BlogPost) {
  const titleLen = p.title.trim().length;
  const excerptLen = p.excerpt.trim().length;
  const words = p.body.trim().split(/\s+/).filter(Boolean).length;
  return [
    {
      ok: titleLen >= 25 && titleLen <= 65,
      label: "Headline is 25–65 characters",
      note: titleLen === 0 ? "Nothing written yet." : `Currently ${titleLen}. Google shows about 60 before it trims.`,
    },
    {
      ok: excerptLen >= 90 && excerptLen <= 165,
      label: "Summary is 90–165 characters",
      note: excerptLen === 0 ? "This becomes the grey line under the headline in search results." : `Currently ${excerptLen}.`,
    },
    { ok: p.imageAlt.trim().length >= 15, label: "Photo has a description", note: "Describe what's in the photo. It's read aloud, and it's what image search sees." },
    { ok: words >= 300, label: "At least 300 words", note: `Currently ${words}. Shorter than that and it rarely ranks for anything.` },
    { ok: /\n## /.test("\n" + p.body), label: "Has at least one sub-heading", note: 'Start a line with "## " to make one.' },
    { ok: p.tags.length >= 2, label: "Two or more topics", note: "Topics tell search engines and AI answers what this is about." },
  ];
}

function Toggle({ id, checked, onChange, label, note }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; note?: string }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-5 h-5 accent-[var(--acc-garnet)]" />
      <span>
        <span className="block font-label font-semibold text-sm">{label}</span>
        {note ? <span className="block text-xs text-granite-500 mt-0.5">{note}</span> : null}
      </span>
    </label>
  );
}

function Editor({ post, onDone }: { post: BlogPost; onDone: () => void }) {
  const { updatePost, deletePost, toast } = useStore();
  const [draft, setDraft] = useState<BlogPost>(post);
  const [tagText, setTagText] = useState(post.tags.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* Switching posts in the list swaps the whole draft, unsaved changes and all. */
  useEffect(() => {
    setDraft(post);
    setTagText(post.tags.join(", "));
    setConfirmDelete(false);
  }, [post.id]);

  const set = (patch: Partial<BlogPost>) => setDraft((d) => ({ ...d, ...patch }));
  const tags = useMemo(() => tagText.split(",").map((t) => t.trim()).filter(Boolean), [tagText]);
  const next: BlogPost = { ...draft, tags };
  const dirty = JSON.stringify(next) !== JSON.stringify({ ...post, tags: post.tags });
  const checks = seoChecks(next);
  const passing = checks.filter((c) => c.ok).length;
  const previewSlug = slugify(draft.slug || draft.title) || draft.id;

  const save = () => {
    if (!next.title.trim()) {
      toast("Give it a headline first — everything else hangs off it.");
      return;
    }
    updatePost(post.id, { ...next, slug: previewSlug });
    toast(next.published ? "Saved and published — it's live on the site." : "Saved as a draft. Nobody can see it yet.");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="kicker text-granite-500">{draft.published ? "Published" : "Draft"}</p>
          <h2 className="font-display text-2xl font-medium mt-1 truncate">{draft.title || "Untitled post"}</h2>
          <p className="text-xs text-granite-500 mt-1 break-all">
            {SITE_URL}/journal/{previewSlug}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {draft.published ? (
            <a href={`/journal/${previewSlug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              View on the site <ArrowRight className="w-3.5 h-3.5" />
            </a>
          ) : null}
          <button type="button" className="btn btn-primary btn-sm" disabled={!dirty} onClick={save}>
            {dirty ? "Save this post" : "Saved"}
          </button>
        </div>
      </div>

      {/* Words */}
      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">The words</legend>
        <div className="p-5 space-y-4">
          <div>
            <label className="field-label" htmlFor="jp-title">
              Headline
            </label>
            <input
              id="jp-title"
              className="field-input font-display text-xl"
              value={draft.title}
              placeholder="What granite soil does to Shiraz"
              onChange={(e) => set({ title: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="jp-excerpt">
              Summary — the grey line under the headline in search results
            </label>
            <textarea
              id="jp-excerpt"
              className="field-input min-h-[80px]"
              value={draft.excerpt}
              placeholder="One or two sentences that answer the question in the headline."
              onChange={(e) => set({ excerpt: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="jp-body">
              The piece itself
            </label>
            <textarea
              id="jp-body"
              className="field-input min-h-[420px] font-mono text-sm leading-relaxed"
              value={draft.body}
              placeholder={'Leave a blank line between paragraphs.\n\n## Start a line like this for a sub-heading\n\n- A line starting with a dash becomes a bullet'}
              onChange={(e) => set({ body: e.target.value })}
            />
            <p className="text-[0.78rem] text-granite-500 mt-1.5">
              Blank line between paragraphs. <span className="font-mono">## </span> makes a sub-heading, <span className="font-mono">- </span> makes a bullet,{" "}
              <span className="font-mono">&gt; </span> makes a pull quote. About {readingMinutes(draft.body)} min to read.
            </p>
          </div>
        </div>
      </fieldset>

      {/* The one photo */}
      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">The photo — one per post</legend>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {IMAGE_LIBRARY.map((im) => (
              <button
                key={im.src}
                type="button"
                onClick={() => set({ image: im.src })}
                aria-pressed={draft.image === im.src}
                className={`border-2 overflow-hidden text-left transition-all ${draft.image === im.src ? "border-granite-900 shadow-hard-sm" : "border-granite-300 hover:border-granite-900"}`}
              >
                <span className="block relative">
                  <img src={im.src} alt={im.label} className="w-full h-24 object-cover" loading="lazy" />
                  {draft.image === im.src ? (
                    <span className="absolute top-2 right-2 grid place-items-center w-6 h-6 bg-vine text-bone border border-granite-900">
                      <Tick className="w-3.5 h-3.5" />
                    </span>
                  ) : null}
                </span>
                <span className="block font-label font-semibold text-[0.7rem] px-2.5 py-1.5">{im.label}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="field-label" htmlFor="jp-image">
              Or paste the address of a different photo
            </label>
            <input id="jp-image" className="field-input" value={draft.image} onChange={(e) => set({ image: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <label className="field-label" htmlFor="jp-alt">
              Describe the photo
            </label>
            <input
              id="jp-alt"
              className="field-input"
              value={draft.imageAlt}
              onChange={(e) => set({ imageAlt: e.target.value })}
              placeholder="Ceremony chairs set between vine rows with the granite hills behind"
            />
            <p className="text-[0.78rem] text-granite-500 mt-1.5">
              Read aloud to anyone who can't see it, and it's the only thing image search has to go on. Say what's in the picture, not "photo of vineyard".
            </p>
          </div>
        </div>
      </fieldset>

      {/* Filing */}
      <div className="grid xl:grid-cols-2 gap-8">
        <fieldset className="border-2 border-granite-900 bg-bone h-fit">
          <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Filing</legend>
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="jp-cat">
                  Section
                </label>
                <select id="jp-cat" className="field-input" value={draft.category} onChange={(e) => set({ category: e.target.value })}>
                  {Array.from(new Set([...CATEGORIES, draft.category])).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="jp-date">
                  Date on the piece
                </label>
                <input id="jp-date" type="date" className="field-input" value={draft.publishedAt} onChange={(e) => set({ publishedAt: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="jp-tags">
                Topics, separated by commas
              </label>
              <input id="jp-tags" className="field-input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Shiraz, Bendigo wine region, Granite soil" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="jp-author">
                  Written by
                </label>
                <input id="jp-author" className="field-input" value={draft.author} onChange={(e) => set({ author: e.target.value })} />
              </div>
              <div>
                <label className="field-label" htmlFor="jp-role">
                  Their job here
                </label>
                <input id="jp-role" className="field-input" value={draft.authorRole} onChange={(e) => set({ authorRole: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="jp-slug">
                Web address
              </label>
              <input id="jp-slug" className="field-input font-mono text-sm" value={draft.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="left blank, we make one from the headline" />
              <p className="text-[0.78rem] text-granite-500 mt-1.5">Once a piece is out in the world, changing this breaks any link to it. Best left alone after publishing.</p>
            </div>
            <div className="space-y-3 border-t border-granite-300 pt-4">
              <Toggle id="jp-published" checked={draft.published} onChange={(v) => set({ published: v })} label="Published" note="Off means only you can see it." />
              <Toggle id="jp-featured" checked={draft.featured} onChange={(v) => set({ featured: v })} label="Feature this one" note="Marks it as a highlight for future layouts." />
            </div>
          </div>
        </fieldset>

        {/* Search readiness */}
        <fieldset className="border-2 border-granite-900 bg-bone h-fit">
          <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">
            Ready for search — {passing} of {checks.length}
          </legend>
          <div className="p-5">
            <div className="h-2 bg-granite-100 border border-granite-900" aria-hidden="true">
              <div className="h-full bg-vine transition-all duration-500" style={{ width: `${(passing / checks.length) * 100}%` }} />
            </div>
            <ul className="mt-5 space-y-3.5">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-3">
                  <span
                    className={`mt-0.5 grid place-items-center w-5 h-5 shrink-0 border-2 border-granite-900 ${c.ok ? "bg-vine text-bone" : "bg-bone text-granite-300"}`}
                    aria-hidden="true"
                  >
                    {c.ok ? <Tick className="w-3 h-3" /> : null}
                  </span>
                  <span>
                    <span className={`block font-label font-semibold text-sm ${c.ok ? "text-granite-900" : "text-granite-700"}`}>{c.label}</span>
                    <span className="block text-xs text-granite-500 mt-0.5">{c.note}</span>
                  </span>
                  <span className="sr-only">{c.ok ? "Done" : "Not yet"}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-granite-500 mt-5 border-t border-granite-300 pt-4">
              None of these are rules. A short, true piece beats a long, padded one — but a piece with no summary and no photo description is invisible to search and to AI
              answers alike.
            </p>
          </div>
        </fieldset>
      </div>

      {/* Danger zone */}
      <div className="border-2 border-granite-900 bg-granite-100/40 p-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-granite-700">
          Written {fmtPostDate(draft.publishedAt)}
          {post.updatedAt !== post.publishedAt ? ` · last changed ${fmtPostDate(post.updatedAt)}` : ""}
        </p>
        {confirmDelete ? (
          <div className="flex flex-wrap gap-3 items-center">
            <p className="text-sm font-label font-semibold">Delete it for good?</p>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                deletePost(post.id);
                toast("Post deleted.");
                onDone();
              }}
            >
              Yes, delete
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(true)}>
            Delete this post
          </button>
        )}
      </div>
    </div>
  );
}

export function JournalView() {
  const { posts, addPost, toast } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(posts[0]?.id ?? null);

  const ordered = useMemo(
    () => posts.slice().sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0)),
    [posts],
  );
  const selected = posts.find((p) => p.id === selectedId) ?? null;
  const liveCount = posts.filter((p) => p.published).length;

  const create = () => {
    const post = addPost();
    setSelectedId(post.id);
    toast("New draft started. Nobody can see it until you publish.");
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-granite-500">The journal</p>
          <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Write something worth finding.</h1>
          <p className="text-sm text-granite-500 mt-2 max-w-xl">
            Every piece here is a new page search engines can send people to, and a page an AI assistant can quote when someone asks about weddings or the Bendigo wine region.
            One photo each, and a checklist that tells you when a post is ready.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={create}>
          <PlusIcon className="w-4 h-4" /> Write a new one
        </button>
      </div>

      <div className="mt-8 grid xl:grid-cols-[300px_1fr] gap-8 items-start">
        {/* List */}
        <div className="border-2 border-granite-900 bg-bone xl:sticky xl:top-[88px]">
          <div className="px-4 py-3 border-b-2 border-granite-900 flex items-center justify-between">
            <p className="kicker text-granite-500 text-[0.65rem]">
              {posts.length} post{posts.length === 1 ? "" : "s"}
            </p>
            <p className="kicker text-vine text-[0.65rem]">{liveCount} live</p>
          </div>
          <ul className="divide-y divide-granite-300 max-h-[70vh] overflow-y-auto thin-scroll">
            {ordered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  aria-current={selectedId === p.id ? "true" : undefined}
                  className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-colors ${selectedId === p.id ? "bg-granite-900 text-bone" : "hover:bg-granite-100"}`}
                >
                  <img src={p.image} alt="" className="w-12 h-12 object-cover border border-granite-900 shrink-0" loading="lazy" />
                  <span className="min-w-0">
                    <span className="block font-label font-semibold text-sm leading-snug line-clamp-2">{p.title || "Untitled post"}</span>
                    <span className={`block text-[0.7rem] mt-1 ${selectedId === p.id ? "text-granite-300" : "text-granite-500"}`}>
                      {p.published ? fmtPostDate(p.publishedAt) : "Draft"} · {p.category}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {posts.length === 0 ? <div className="p-4 text-sm text-granite-500">Nothing written yet.</div> : null}
        </div>

        {/* Editor */}
        <div className="min-w-0">
          {selected ? (
            <Editor key={selected.id} post={selected} onDone={() => setSelectedId(null)} />
          ) : (
            <EmptyState title="Pick a post, or start a new one." note="Drafts stay private until you tick 'Published'." />
          )}
        </div>
      </div>
    </div>
  );
}
