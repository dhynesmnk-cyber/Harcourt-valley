import React, { useMemo, useRef, useState } from "react";
import { FONT_CATALOG, PALETTE_CATALOG, SEASONS, TYPED_PAGES, typedPageLabel, uid, type Ballpark, type TypedLine, type TypedPage } from "../../lib/data";
import { useStore } from "../../lib/store";
import { useStoredImage } from "../../lib/media";
import { PlusIcon, TrashIcon, UploadIcon } from "../../components/ui";
import { TypedPreview } from "../../components/TypedLines";
import { SiteImageOption, SitePhotosPanel } from "../../components/admin/SitePhotos";

function BallparkEditor({ label, rows, onSave }: { label: string; rows: Ballpark[]; onSave: (rows: Ballpark[]) => void }) {
  const [draft, setDraft] = useState<Ballpark[]>(rows);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rows);
  const set = (i: number, patch: Partial<Ballpark>) => setDraft((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <fieldset className="border-2 border-granite-900 bg-bone">
      <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">{label}</legend>
      <div className="p-5 space-y-4">
        {draft.map((r, i) => (
          <div key={i} className="grid sm:grid-cols-[1.2fr_0.8fr_1.4fr_auto] gap-3 items-end border border-granite-300 p-4 bg-granite-100/40">
            <div>
              <label className="field-label" htmlFor={`bp-${label}-${i}-l`}>
                What it is
              </label>
              <input id={`bp-${label}-${i}-l`} className="field-input" value={r.label} onChange={(e) => set(i, { label: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor={`bp-${label}-${i}-r`}>
                The number
              </label>
              <input id={`bp-${label}-${i}-r`} className="field-input" value={r.range} onChange={(e) => set(i, { range: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor={`bp-${label}-${i}-n`}>
                The small print
              </label>
              <input id={`bp-${label}-${i}-n`} className="field-input" value={r.note} onChange={(e) => set(i, { note: e.target.value })} />
            </div>
            <button
              type="button"
              className="btn btn-sm btn-ghost text-garnet h-[48px] whitespace-nowrap"
              disabled={draft.length === 1}
              onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
              title={draft.length === 1 ? "The last row has to stay." : `Delete "${r.label || `row ${i + 1}`}"`}
            >
              <TrashIcon className="w-4 h-4" /> Delete
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft([...draft, { label: "", range: "", note: "" }])}>
            <PlusIcon className="w-3.5 h-3.5" /> Add a line
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!dirty} onClick={() => onSave(draft.filter((r) => r.label.trim()))}>
            {dirty ? "Save these figures" : "Saved"}
          </button>
        </div>
      </div>
    </fieldset>
  );
}

function ListEditor({ label, items, onSave, placeholder }: { label: string; items: string[]; onSave: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState<string[]>(items);
  const dirty = JSON.stringify(draft) !== JSON.stringify(items);
  return (
    <fieldset className="border-2 border-granite-900 bg-bone">
      <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">{label}</legend>
      <div className="p-5 space-y-3">
        {draft.map((item, i) => (
          <div key={i} className="flex gap-3 items-center">
            <input className="field-input" value={item} onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`${label} item ${i + 1}`} />
            <button
              type="button"
              className="btn btn-sm btn-ghost text-garnet shrink-0 whitespace-nowrap"
              disabled={draft.length === 1}
              onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
              title={draft.length === 1 ? "The last one has to stay." : `Delete "${item}"`}
            >
              <TrashIcon className="w-4 h-4" /> Delete
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft([...draft, placeholder])}>
            <PlusIcon className="w-3.5 h-3.5" /> Add an item
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!dirty} onClick={() => onSave(draft.filter((x) => x.trim()))}>
            {dirty ? "Save this list" : "Saved"}
          </button>
        </div>
      </div>
    </fieldset>
  );
}

function CopyTab() {
  const { config, updateConfig, toast } = useStore();
  const [hero, setHero] = useState({ headline: config.heroHeadline, sub: config.heroSub });
  const [wedHeadline, setWedHeadline] = useState(config.weddingsHeadline);
  const heroDirty = hero.headline !== config.heroHeadline || hero.sub !== config.heroSub;
  const wedDirty = wedHeadline !== config.weddingsHeadline;

  return (
    <div className="space-y-8">
      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Home page · opening words</legend>
        <div className="p-5 space-y-4">
          <div>
            <label className="field-label" htmlFor="cms-hero-h">
              Headline
            </label>
            <input id="cms-hero-h" className="field-input font-display text-xl" value={hero.headline} onChange={(e) => setHero({ ...hero, headline: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="cms-hero-s">
              The sentence underneath
            </label>
            <textarea id="cms-hero-s" className="field-input min-h-[90px]" value={hero.sub} onChange={(e) => setHero({ ...hero, sub: e.target.value })} />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!heroDirty}
            onClick={() => {
              updateConfig({ heroHeadline: hero.headline, heroSub: hero.sub });
              toast("Home page words saved — live on the site.");
            }}
          >
            {heroDirty ? "Save home page words" : "Saved"}
          </button>
        </div>
      </fieldset>

      <div className="grid gap-8 xl:grid-cols-2">
        <fieldset className="border-2 border-granite-900 bg-bone h-fit">
          <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Weddings · headline</legend>
          <div className="p-5">
            <label className="field-label" htmlFor="cms-wed-h">
              The big line at the top
            </label>
            <input id="cms-wed-h" className="field-input font-display text-xl" value={wedHeadline} onChange={(e) => setWedHeadline(e.target.value)} />
            <button
              type="button"
              className="btn btn-primary btn-sm mt-4"
              disabled={!wedDirty}
              onClick={() => {
                updateConfig({ weddingsHeadline: wedHeadline });
                toast("Wedding headline saved — live on the site.");
              }}
            >
              {wedDirty ? "Save the headline" : "Saved"}
            </button>
          </div>
        </fieldset>

        <ListEditor
          label="Weddings · what's included"
          items={config.inclusions}
          placeholder="New thing that's included"
          onSave={(items) => {
            updateConfig({ inclusions: items });
            toast("Inclusions list saved — live on the site.");
          }}
        />
      </div>

      <BallparkEditor
        label="Weddings · ballpark figures"
        rows={config.weddingBallparks}
        onSave={(rows) => {
          updateConfig({ weddingBallparks: rows });
          toast("Wedding ballparks saved — live on the site.");
        }}
      />
      <BallparkEditor
        label="Events · ballpark figures"
        rows={config.eventBallparks}
        onSave={(rows) => {
          updateConfig({ eventBallparks: rows });
          toast("Event ballparks saved — live on the site.");
        }}
      />
    </div>
  );
}

/* ---------------- typed lines ---------------- */

function TypedTab() {
  const { config, updateConfig, toast } = useStore();
  const [page, setPage] = useState<TypedPage>("home");
  const [draft, setDraft] = useState<TypedLine[]>(config.typedLines ?? []);

  const rows = useMemo(() => draft.filter((l) => l.page === page), [draft, page]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config.typedLines ?? []);

  const set = (id: string, patch: Partial<TypedLine>) => setDraft((d) => d.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => setDraft((d) => d.filter((l) => l.id !== id));
  const add = () => setDraft((d) => [...d, { id: uid(), page, text: "", author: "" }]);

  /** Moves a line within its own page, leaving the other pages' lines alone. */
  const move = (id: string, dir: -1 | 1) => {
    setDraft((d) => {
      const mine = d.filter((l) => l.page === page);
      const at = mine.findIndex((l) => l.id === id);
      const to = at + dir;
      if (at < 0 || to < 0 || to >= mine.length) return d;
      const reordered = [...mine];
      [reordered[at], reordered[to]] = [reordered[to], reordered[at]];
      let n = 0;
      return d.map((l) => (l.page === page ? reordered[n++] : l));
    });
  };

  const save = () => {
    updateConfig({ typedLines: draft.filter((l) => l.text.trim()).map((l) => ({ ...l, text: l.text.trim(), author: l.author.trim() })) });
    toast("Typed lines saved — live on the site.");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-2 border-granite-900 bg-granite-100/40 p-5">
        <p className="kicker text-granite-500">How this reads on the site</p>
        <p className="text-sm text-granite-700 mt-2 leading-relaxed">
          These lines type themselves out one letter at a time, one after another, where the boxes of numbers used to be. Leave{" "}
          <span className="font-semibold">who said it</span> empty and the line reads as a plain statement about the place. Fill it in and it reads as a review, in quote marks with
          their name underneath.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Which page">
        {TYPED_PAGES.map((p) => {
          const n = draft.filter((l) => l.page === p && l.text.trim()).length;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-pressed={page === p}
              className={`btn btn-sm ${page === p ? "btn-dark" : "btn-ghost"}`}
            >
              {typedPageLabel[p]}
              <span className={`text-[0.65rem] font-bold px-1.5 border ${page === p ? "border-bone/50" : "border-granite-300"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Preview · {typedPageLabel[page]}</legend>
        <div className="p-5">
          <TypedPreview lines={rows} />
        </div>
      </fieldset>

      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">{typedPageLabel[page]} · the lines</legend>
        <div className="p-5 space-y-4">
          {rows.map((l, i) => (
            <div key={l.id} className="border border-granite-300 bg-granite-100/40 p-4">
              <div className="grid sm:grid-cols-[1fr_260px] gap-3">
                <div>
                  <label className="field-label" htmlFor={`tl-${l.id}-t`}>
                    The line
                  </label>
                  <textarea
                    id={`tl-${l.id}-t`}
                    className="field-input min-h-[70px]"
                    value={l.text}
                    placeholder="Something a guest actually said, or a plain fact about the place"
                    onChange={(e) => set(l.id, { text: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={`tl-${l.id}-a`}>
                    Who said it <span className="normal-case tracking-normal font-normal text-granite-500">— leave empty for a feature</span>
                  </label>
                  <input
                    id={`tl-${l.id}-a`}
                    className="field-input"
                    value={l.author}
                    placeholder="e.g. Jess & Tom O'Neill"
                    onChange={(e) => set(l.id, { author: e.target.value })}
                  />
                  <p className="text-[0.75rem] text-granite-500 mt-2">{l.author.trim() ? "Shows in quote marks, with the name underneath." : "Shows as a plain line, no quote marks."}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" className="btn btn-sm btn-ghost px-3" onClick={() => move(l.id, -1)} disabled={i === 0} aria-label={`Move line ${i + 1} earlier`}>
                  ↑
                </button>
                <button type="button" className="btn btn-sm btn-ghost px-3" onClick={() => move(l.id, 1)} disabled={i === rows.length - 1} aria-label={`Move line ${i + 1} later`}>
                  ↓
                </button>
                <span className="text-xs text-granite-500 ml-1">
                  {i + 1} of {rows.length}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost px-3 ml-auto text-garnet"
                  onClick={() => remove(l.id)}
                  title={`Delete line ${i + 1}`}
                >
                  <TrashIcon className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="border-2 border-dashed border-granite-300 px-6 py-8 text-center">
              <p className="font-display text-xl text-granite-700">Nothing types here yet.</p>
              <p className="text-sm text-granite-500 mt-1.5">Add a line and this section of the site starts writing itself out.</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
              <PlusIcon className="w-3.5 h-3.5" /> Add a line
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!dirty} onClick={save}>
              {dirty ? "Save these lines" : "Saved"}
            </button>
            {dirty ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(config.typedLines ?? [])}>
                Undo my changes
              </button>
            ) : null}
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function AppearanceTab() {
  const { config, updateConfig, setCustomHeroImage, clearCustomHeroImage, toast } = useStore();
  const [palette, setPalette] = useState(config.palette);
  const [font, setFont] = useState(config.displayFont);
  const [heroImage, setHeroImage] = useState(config.heroImage);
  const [textColor, setTextColor] = useState(config.textColor);
  const [bgLight, setBgLight] = useState(config.bgLight);
  const [bgDark, setBgDark] = useState(config.bgDark);
  const dirty =
    palette !== config.palette || font !== config.displayFont || heroImage !== config.heroImage ||
    textColor !== config.textColor || bgLight !== config.bgLight || bgDark !== config.bgDark;

  const heroOptions = ["vines", "cellarDoor", "wedding"] as const;
  const customHeroUrl = useStoredImage(config.customHeroImage);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroError, setHeroError] = useState("");

  const uploadHero = async (file: File) => {
    setHeroBusy(true);
    setHeroError("");
    const r = await setCustomHeroImage(file);
    setHeroBusy(false);
    if (r.ok) toast("Your photo is now the homepage hero.");
    else setHeroError(r.error ?? "That photo couldn't be uploaded.");
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Colour mood</legend>
        <div className="p-5 space-y-6">
          <p className="text-xs text-granite-500">Curated by season — pick any of the eight, whatever the time of year actually is.</p>
          {SEASONS.map((season) => (
            <div key={season.id}>
              <p className="kicker text-granite-500 flex items-baseline gap-2">
                {season.name} <span className="text-granite-400 normal-case tracking-normal font-normal">— {season.blurb}</span>
              </p>
              <div className="mt-2.5 grid sm:grid-cols-2 gap-4">
                {PALETTE_CATALOG.filter((p) => p.season === season.id).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPalette(p.id)}
                    aria-pressed={palette === p.id}
                    className={`border-2 p-4 text-left transition-all ${palette === p.id ? "border-granite-900 shadow-hard-sm bg-granite-100/50" : "border-granite-300 hover:border-granite-900"}`}
                  >
                    <span className="flex gap-2">
                      {[p.garnet, p.vine, p.ochre].map((s) => (
                        <span key={s} className="w-8 h-8 border-2 border-granite-900" style={{ background: s }} />
                      ))}
                    </span>
                    <span className="block font-label font-semibold text-sm mt-3">
                      {p.name} {palette === p.id ? <span className="text-vine">· current</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Headline lettering</legend>
        <div className="p-5 space-y-6">
          <p className="text-xs text-granite-500">Also curated by season — the mood of the letterforms, independent of colour.</p>
          {SEASONS.map((season) => (
            <div key={season.id}>
              <p className="kicker text-granite-500">{season.name}</p>
              <div className="mt-2.5 grid sm:grid-cols-2 gap-4">
                {FONT_CATALOG.filter((f) => f.season === season.id).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFont(f.id)}
                    aria-pressed={font === f.id}
                    className={`border-2 p-4 text-left transition-all ${font === f.id ? "border-granite-900 shadow-hard-sm bg-granite-100/50" : "border-granite-300 hover:border-granite-900"}`}
                  >
                    <span className="block text-4xl leading-none" style={{ fontFamily: `${f.family}, serif` }}>
                      Aa
                    </span>
                    <span className="block font-label font-semibold text-sm mt-3">{f.name}</span>
                    <span className="block text-xs text-granite-500 mt-1">{f.note}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Home page photograph</legend>
        <div className="p-5">
          <div className="grid sm:grid-cols-3 gap-4">
            {heroOptions.map((key) => (
              <SiteImageOption key={key} imgKey={key} currentValue={customHeroUrl ? "" : heroImage} onSelect={(src) => setHeroImage(src)} />
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-granite-300 flex flex-wrap items-center gap-4">
            {customHeroUrl ? (
              <div className="flex items-center gap-3">
                <img src={customHeroUrl} alt="Your uploaded hero photo" className="w-20 h-14 object-cover border-2 border-granite-900" />
                <div>
                  <p className="text-xs font-label font-semibold">Your own photo is set as the hero.</p>
                  <button
                    type="button"
                    className="text-xs text-garnet hover:underline underline-offset-4"
                    onClick={() => {
                      clearCustomHeroImage();
                      toast("Back to the preset photo above.");
                    }}
                  >
                    Remove it
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-sm btn-ghost border border-granite-500" onClick={() => heroInputRef.current?.click()} disabled={heroBusy}>
                <UploadIcon className="w-3.5 h-3.5" /> {heroBusy ? "Uploading…" : "Or upload your own photo"}
              </button>
            )}
            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadHero(file);
                e.target.value = "";
              }}
            />
          </div>
          {heroError ? <p className="mt-2 text-xs text-garnet">{heroError}</p> : null}
        </div>
      </fieldset>

      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Text &amp; background colours</legend>
        <div className="p-5">
          <p className="text-xs text-granite-500 max-w-2xl">
            Independent of the season palette above — these don't touch borders, shadows, or the accent colours. Just the colour of body
            and heading text, the site's light surface, and its dark surfaces (the nav, the footer, dark buttons).
          </p>
          <div className="mt-4 grid sm:grid-cols-3 gap-4">
            <div>
              <label className="field-label" htmlFor="cms-text-color">
                Text colour
              </label>
              <div className="flex items-center gap-2.5">
                <input id="cms-text-color" type="color" className="w-12 h-10 border-2 border-granite-900 cursor-pointer" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                <span className="text-xs font-mono text-granite-500 uppercase">{textColor}</span>
              </div>
              {textColor !== "#26231f" ? (
                <button type="button" className="text-xs text-garnet hover:underline underline-offset-4 mt-1.5" onClick={() => setTextColor("#26231f")}>
                  Reset to default
                </button>
              ) : null}
            </div>
            <div>
              <label className="field-label" htmlFor="cms-bg-light">
                Light background
              </label>
              <div className="flex items-center gap-2.5">
                <input id="cms-bg-light" type="color" className="w-12 h-10 border-2 border-granite-900 cursor-pointer" value={bgLight} onChange={(e) => setBgLight(e.target.value)} />
                <span className="text-xs font-mono text-granite-500 uppercase">{bgLight}</span>
              </div>
              {bgLight !== "#f6f2e9" ? (
                <button type="button" className="text-xs text-garnet hover:underline underline-offset-4 mt-1.5" onClick={() => setBgLight("#f6f2e9")}>
                  Reset to default
                </button>
              ) : null}
            </div>
            <div>
              <label className="field-label" htmlFor="cms-bg-dark">
                Dark background
              </label>
              <div className="flex items-center gap-2.5">
                <input id="cms-bg-dark" type="color" className="w-12 h-10 border-2 border-granite-900 cursor-pointer" value={bgDark} onChange={(e) => setBgDark(e.target.value)} />
                <span className="text-xs font-mono text-granite-500 uppercase">{bgDark}</span>
              </div>
              {bgDark !== "#26231f" ? (
                <button type="button" className="text-xs text-garnet hover:underline underline-offset-4 mt-1.5" onClick={() => setBgDark("#26231f")}>
                  Reset to default
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </fieldset>

      <SitePhotosPanel />

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!dirty}
          onClick={() => {
            updateConfig({ palette, displayFont: font, heroImage, textColor, bgLight, bgDark });
            toast("Appearance saved — the whole site just changed.");
          }}
        >
          {dirty ? "Apply to the whole site" : "Applied"}
        </button>
        <p className="text-xs text-granite-500 max-w-xs">Applies the moment you press it — check the live site through the link at the top.</p>
      </div>
    </div>
  );
}

export function CmsView() {
  const [tab, setTab] = useState<"copy" | "typed" | "appearance">("copy");
  return (
    <div>
      <p className="kicker text-granite-500">Website content</p>
      <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Change the words, change the look.</h1>
      <p className="text-sm text-granite-500 mt-2 max-w-xl">No code, no JSON. Forms with labels, a save button, done. If you can fill in a booking sheet, you can run this.</p>
      <div className="mt-6 inline-flex border-2 border-granite-900">
        {(
          [
            { id: "copy", label: "Words & figures" },
            { id: "typed", label: "Reviews & features" },
            { id: "appearance", label: "Colours & type" },
          ] as const
        ).map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`px-5 py-2.5 font-label text-[0.78rem] font-semibold uppercase tracking-[0.1em] min-h-[44px] transition-colors ${tab === t.id ? "bg-dark text-bone" : "hover:bg-granite-100"} ${i > 0 ? "border-l-2 border-granite-900" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-7">
        {tab === "copy" ? <CopyTab /> : null}
        {tab === "typed" ? <TypedTab /> : null}
        {tab === "appearance" ? <AppearanceTab /> : null}
      </div>
    </div>
  );
}
