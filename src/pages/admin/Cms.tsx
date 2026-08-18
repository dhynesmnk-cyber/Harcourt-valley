import React, { useState } from "react";
import { IMG, type Ballpark } from "../../lib/data";
import { useStore } from "../../lib/store";
import { MinusIcon, PlusIcon, Tick } from "../../components/ui";

function BallparkEditor({ label, rows, onSave }: { label: string; rows: Ballpark[]; onSave: (rows: Ballpark[]) => void }) {
  const [draft, setDraft] = useState<Ballpark[]>(rows);
  const dirty = JSON.stringify(draft) !== JSON.stringify(rows);
  const set = (i: number, patch: Partial<Ballpark>) => setDraft((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <fieldset className="border-2 border-granite-900 bg-bone">
      <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">{label}</legend>
      <div className="p-5 space-y-4">
        {draft.map((r, i) => (
          <div key={i} className="grid sm:grid-cols-[1.2fr_0.8fr_1.4fr_40px] gap-3 items-end border border-granite-300 p-4 bg-granite-100/40">
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
            <button type="button" className="btn btn-ghost px-0 h-[48px]" disabled={draft.length === 1} onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} aria-label={`Remove row ${i + 1}`}>
              <MinusIcon className="w-4 h-4" />
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
            <button type="button" className="btn btn-ghost px-0 w-11 shrink-0" disabled={draft.length === 1} onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} aria-label={`Remove "${item}"`}>
              <MinusIcon className="w-4 h-4" />
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

function AppearanceTab() {
  const { config, updateConfig, toast } = useStore();
  const [palette, setPalette] = useState(config.palette);
  const [font, setFont] = useState(config.displayFont);
  const [heroImage, setHeroImage] = useState(config.heroImage);
  const dirty = palette !== config.palette || font !== config.displayFont || heroImage !== config.heroImage;

  const heroOptions = [
    { src: IMG.vines, label: "Vine rows at dusk" },
    { src: IMG.cellarDoor, label: "The cellar door pour" },
    { src: IMG.wedding, label: "Ceremony in the vines" },
  ];

  const fonts = [
    { id: "fraunces" as const, name: "Fraunces", family: '"Fraunces", serif', note: "The current voice — warm, a little weathered." },
    { id: "cormorant" as const, name: "Cormorant Garamond", family: '"Cormorant Garamond", serif', note: "Lighter and more formal." },
    { id: "marcellus" as const, name: "Marcellus", family: '"Marcellus", serif', note: "Roman, quiet, carved-in-stone." },
  ];

  const palettes = [
    { id: "granite" as const, name: "Granite (current)", swatches: ["#67252f", "#4c5b3f", "#b77a2e"] },
    { id: "orchard" as const, name: "Orchard", swatches: ["#5b2440", "#3e5a44", "#9a6b23"] },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Colour mood</legend>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          {palettes.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPalette(p.id)}
              aria-pressed={palette === p.id}
              className={`border-2 p-4 text-left transition-all ${palette === p.id ? "border-granite-900 shadow-hard-sm bg-granite-100/50" : "border-granite-300 hover:border-granite-900"}`}
            >
              <span className="flex gap-2">
                {p.swatches.map((s) => (
                  <span key={s} className="w-8 h-8 border-2 border-granite-900" style={{ background: s }} />
                ))}
              </span>
              <span className="block font-label font-semibold text-sm mt-3">{p.name}</span>
              <span className="block text-xs text-granite-500 mt-1">Wine, vine and harvest accents — both tuned for readability.</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Headline lettering</legend>
        <div className="p-5 grid sm:grid-cols-3 gap-4">
          {fonts.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFont(f.id)}
              aria-pressed={font === f.id}
              className={`border-2 p-4 text-left transition-all ${font === f.id ? "border-granite-900 shadow-hard-sm bg-granite-100/50" : "border-granite-300 hover:border-granite-900"}`}
            >
              <span className="block text-4xl leading-none" style={{ fontFamily: f.family }}>
                Aa
              </span>
              <span className="block font-label font-semibold text-sm mt-3">{f.name}</span>
              <span className="block text-xs text-granite-500 mt-1">{f.note}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-2 border-granite-900 bg-bone">
        <legend className="ml-4 px-2 kicker text-granite-500 bg-bone">Home page photograph</legend>
        <div className="p-5 grid sm:grid-cols-3 gap-4">
          {heroOptions.map((h) => (
            <button
              key={h.src}
              type="button"
              onClick={() => setHeroImage(h.src)}
              aria-pressed={heroImage === h.src}
              className={`border-2 overflow-hidden text-left transition-all ${heroImage === h.src ? "border-granite-900 shadow-hard-sm" : "border-granite-300 hover:border-granite-900"}`}
            >
              <span className="block relative">
                <img src={h.src} alt={h.label} className="w-full h-28 object-cover" loading="lazy" />
                {heroImage === h.src ? (
                  <span className="absolute top-2 right-2 grid place-items-center w-6 h-6 bg-vine text-bone border border-granite-900">
                    <Tick className="w-3.5 h-3.5" />
                  </span>
                ) : null}
              </span>
              <span className="block font-label font-semibold text-xs px-3 py-2">{h.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!dirty}
          onClick={() => {
            updateConfig({ palette, displayFont: font, heroImage });
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
  const [tab, setTab] = useState<"copy" | "appearance">("copy");
  return (
    <div>
      <p className="kicker text-granite-500">Website content</p>
      <h1 className="font-display text-3xl sm:text-4xl font-medium mt-1.5">Change the words, change the look.</h1>
      <p className="text-sm text-granite-500 mt-2 max-w-xl">No code, no JSON. Forms with labels, a save button, done. If you can fill in a booking sheet, you can run this.</p>
      <div className="mt-6 inline-flex border-2 border-granite-900">
        {(
          [
            { id: "copy", label: "Words & figures" },
            { id: "appearance", label: "Colours & type" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`px-5 py-2.5 font-label text-[0.78rem] font-semibold uppercase tracking-[0.1em] min-h-[44px] transition-colors ${tab === t.id ? "bg-granite-900 text-bone" : "hover:bg-granite-100"} ${t.id === "appearance" ? "border-l-2 border-granite-900" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-7">{tab === "copy" ? <CopyTab /> : <AppearanceTab />}</div>
    </div>
  );
}
