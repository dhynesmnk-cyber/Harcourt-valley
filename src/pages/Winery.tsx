import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IMG, money, type Product, type ProductType } from "../lib/data";
import { useApplyAppearance, useStore } from "../lib/store";
import { ArrowRight, BottleArt, CloseIcon, ContourDivider, FaqList, MedalRow, MinusIcon, Reveal, SectionHead, Tick } from "../components/ui";
import { TypedLines } from "../components/TypedLines";
import { WINERY_FAQS } from "../lib/faqs";
import { breadcrumbSchema, faqSchema, useSeo, webPageSchema } from "../lib/seo";
import { BUSINESS, absUrl } from "../lib/site";

const FILTERS: { value: "all" | ProductType; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "wine", label: "Wine" },
  { value: "beer", label: "Beer" },
  { value: "mead", label: "Mead" },
];

function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addToCart, toast, setCartOpen } = useStore();
  const [qty, setQty] = useState(1);
  const soldOut = product.stock === 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const add = () => {
    addToCart(product.id, qty);
    toast(`${qty} × ${product.name} added to your case.`);
    onClose();
    setCartOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button type="button" aria-label="Close product details" onClick={onClose} className="absolute inset-0 bg-granite-900/60 fade-in cursor-default" />
      <div className="rise-in relative bg-bone border-2 border-granite-900 shadow-hard w-full max-w-2xl grid sm:grid-cols-[240px_1fr] max-h-[90svh] overflow-y-auto thin-scroll" role="dialog" aria-modal="true" aria-label={product.name}>
        <div className="bg-granite-100 border-b-2 sm:border-b-0 sm:border-r-2 border-granite-900 grid place-items-center py-8 sm:py-0">
          <BottleArt product={product} className="h-56 sm:h-72 w-auto img-in" />
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="kicker text-granite-500">
                {product.type} {product.varietal ? `· ${product.varietal}` : ""} {product.vintage ? `· ${product.vintage}` : ""}
              </p>
              <h3 className="font-display text-3xl font-medium mt-1.5">{product.name}</h3>
            </div>
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost px-3 shrink-0" aria-label="Close">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-4 text-granite-700 leading-relaxed">{product.description}</p>
          <div className="mt-5 flex items-center gap-3 text-sm">
            <span className="font-display text-2xl font-medium">{money(product.priceCents)}</span>
            <span className="text-granite-500">per 750ml bottle</span>
          </div>
          {soldOut ? (
            <div className="mt-5 border-2 border-granite-900 bg-granite-100/70 p-4">
              <p className="font-label font-semibold text-sm uppercase tracking-[0.1em]">Sold out — enquire</p>
              <p className="text-sm text-granite-700 mt-1.5">
                This one's gone for now. Email <span className="font-semibold">hello@harcourtvalley.example</span> and we'll note you down for the next batch.
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center border-2 border-granite-900">
                <button type="button" className="px-3.5 py-2.5 hover:bg-granite-100 transition-colors" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="One fewer bottle">
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="font-label font-semibold w-8 text-center">{qty}</span>
                <button type="button" className="px-3.5 py-2.5 hover:bg-granite-100 transition-colors" onClick={() => setQty(Math.min(12, qty + 1))} aria-label="One more bottle">
                  <span className="font-label text-lg leading-none">+</span>
                </button>
              </div>
              <button type="button" className="btn btn-primary" onClick={add}>
                Add {qty > 1 ? `${qty} bottles` : "to case"} · {money(product.priceCents * qty)}
              </button>
            </div>
          )}
          <p className="mt-5 text-xs text-granite-500">
            {product.stock === 0 ? "Cellar door may still have a bottle or two — worth ringing." : product.stock <= 15 ? `Only ${product.stock} left in the rack.` : "In stock, dispatched twice a week."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Winery() {
  useApplyAppearance();
  const { products, addToCart, toast } = useStore();
  const [filter, setFilter] = useState<"all" | ProductType>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(() => products.filter((p) => p.active && (filter === "all" || p.type === filter)), [products, filter]);
  const selected = products.find((p) => p.id === selectedId) ?? null;

  useSeo({
    title: "The winery & wine shop — Bendigo's most-awarded winery",
    description:
      "Shiraz, Cabernet, Chardonnay, Riesling and Rosé grown on decomposed granite at Harcourt, Victoria. 500+ show medals, a 5-star Halliday rating, cellar door Friday to Sunday, and free freight on six bottles.",
    path: "/winery",
    image: IMG.barrels,
    imageAlt: "Oak barrels resting in the granite cellar at Harcourt Valley Vineyards",
    keywords: ["Bendigo wine region", "Central Victorian Shiraz", "buy Australian wine online", "cellar door Harcourt"],
    jsonLd: [
      webPageSchema({
        path: "/winery",
        name: "The winery & wine shop",
        description: "The Harcourt Valley range, tasting notes and online ordering, plus cellar door details.",
        primaryImage: IMG.barrels,
      }),
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "The winery", path: "/winery" },
      ]),
      faqSchema(WINERY_FAQS),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Harcourt Valley Vineyards wines",
        numberOfItems: visible.length,
        itemListElement: visible.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: `${p.name}${p.vintage ? " " + p.vintage : ""}`,
            description: p.description,
            category: p.type,
            brand: { "@id": `${absUrl("/")}#winery` },
            offers: {
              "@type": "Offer",
              price: (p.priceCents / 100).toFixed(2),
              priceCurrency: "AUD",
              availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              seller: { "@id": `${absUrl("/")}#winery` },
              url: absUrl("/winery"),
            },
          },
        })),
      },
    ],
  });

  return (
    <div>
      {/* Intro */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16">
        <SectionHead
          as="h1"
          kicker="The winery"
          title={<>Bendigo's most-awarded winery.</>}
          lead="500+ show medals, a 5-star Halliday rating, and the oldest vineyard in the shire — still family-run, still poured by the people who grew it."
        />
        <div className="mt-10 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="img-frame border-2 border-granite-900 shadow-hard lux-zoom">
              <img src={IMG.barrels} alt="Oak barrels resting in the granite cellar" className="w-full h-[280px] sm:h-[380px] object-cover img-in" />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-4 text-granite-700 leading-relaxed max-w-xl">
              <p>
                The vines sit on decomposed granite, which is a polite way of saying they have to work for a living. Small crops, intense fruit, and a cellar full of hardware to
                prove it.
              </p>
              <p>
                Everything below is grown, made and bottled within a five-minute walk of where you'd be standing. Beer from the orchard next door, mead from the hives in the rows,
                and wine from blocks your hosts can point at from the verandah.
              </p>
              <p className="font-display italic text-xl text-granite-900">"If we wouldn't pour it at our own table, it doesn't get a label." — Tom</p>
            </div>
            <div className="mt-8 border-t-2 border-granite-300 pt-7">
              <TypedLines page="winery" />
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mt-16">
        <MedalRow />
      </div>

      {/* Shop */}
      <section id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHead kicker="The shelf" title={<>Take some home.</>} lead="Six or more bottles and freight's on us. Guest checkout — no account needed." />
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <p className="kicker text-granite-500 mr-2">Filter</p>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`btn btn-sm ${filter === f.value ? "btn-dark" : "btn-ghost"}`}
            >
              {f.label}
            </button>
          ))}
          <p className="ml-auto text-sm text-granite-500 hidden sm:block" aria-live="polite">
            {visible.length} {visible.length === 1 ? "drop" : "drops"}
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visible.map((p, i) => {
            const soldOut = p.stock === 0;
            return (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <article className="group border-2 border-granite-900 bg-bone flex flex-col lux-card">
                  <button type="button" onClick={() => setSelectedId(p.id)} className="text-left w-full cursor-pointer">
                    <div className="bg-granite-100/80 border-b-2 border-granite-900 grid place-items-center py-7 overflow-hidden">
                      <BottleArt product={p} className="h-48 w-auto transition-transform duration-500 group-hover:-translate-y-1.5" />
                    </div>
                    <div className="p-5">
                      <p className="kicker text-granite-500">
                        {p.type} {p.vintage ? `· ${p.vintage}` : ""}
                      </p>
                      <h3 className="font-display text-xl font-medium mt-1 leading-snug">{p.name}</h3>
                      <p className="mt-2 text-sm text-granite-500 line-clamp-2">{p.description}</p>
                    </div>
                  </button>
                  <div className="mt-auto p-5 pt-0 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-label font-bold text-lg">{money(p.priceCents)}</p>
                      <p className={`text-xs font-label font-semibold uppercase tracking-[0.08em] ${soldOut ? "text-garnet" : p.stock <= 15 ? "text-ochre" : "text-vine"}`}>
                        {soldOut ? "Sold out" : p.stock <= 15 ? `Only ${p.stock} left` : "In stock"}
                      </p>
                    </div>
                    {soldOut ? (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedId(p.id)}>
                        Enquire
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          addToCart(p.id, 1);
                          toast(`${p.name} added to your case.`);
                        }}
                      >
                        Add
                      </button>
                    )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <ContourDivider />

      {/* Trade band */}
      <section className="bg-granite-900 text-bone mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <p className="kicker text-granite-500">Trade &amp; stockists</p>
            <h2 className="font-display text-3xl sm:text-5xl font-medium leading-[1.05] mt-3">Pour it at your place.</h2>
            <p className="mt-5 text-granite-300 max-w-lg leading-relaxed">
              We work directly with bottle shops, bars and restaurants — no distributor in the middle, margin-friendly, and the medals do half the selling for you. Minimum order 12
              bottles; we deliver through Central Victoria weekly.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-granite-300">
              {["Medal cards and shelf talkers included", "Samples dropped by hand, not couriered", "14-day terms for regulars"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Tick className="w-4 h-4 text-ochre shrink-0" /> {t}
                </li>
              ))}
            </ul>
            <Link to="/winery/trade" className="btn bg-bone text-granite-900 mt-8">
              Place a trade order <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="img-frame-alt border-2 border-bone/40 lux-zoom">
              <img src={IMG.bottles} alt="Wine, beer and mead bottles on a granite table" className="w-full h-[280px] sm:h-[380px] object-cover img-in" loading="lazy" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Cellar door strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="border-2 border-granite-900 p-6 sm:p-10 grid md:grid-cols-3 gap-6 items-center bg-granite-100/40">
          <div>
            <p className="kicker text-granite-500">Cellar door</p>
            <p className="font-display text-2xl font-medium mt-1.5">Fri – Sun, 11am – 5pm</p>
          </div>
          <p className="text-granite-700 text-sm leading-relaxed">
            Tastings are $10, waived with any purchase. The garden's open, the dogs are friendly, and someone who actually made the wine is usually behind the bar.
          </p>
          <div className="md:text-right">
            <Link to="/" className="btn btn-dark btn-sm">
              Find the valley
            </Link>
          </div>
        </div>
      </section>

      {/* Questions, answered on the page */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16" aria-labelledby="win-faq-heading">
        <p className="kicker text-granite-500">Good to know</p>
        <h2 id="win-faq-heading" className="font-display text-3xl sm:text-5xl font-medium leading-[1.05] mt-2">
          Questions about the wine.
        </h2>
        <FaqList faqs={WINERY_FAQS} className="mt-10" />
        <p className="mt-8 text-sm text-granite-500">
          Ring{" "}
          <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="underline underline-offset-4 hover:text-garnet">
            {BUSINESS.phoneDisplay}
          </a>{" "}
          for anything else — including whether a sold-out wine is back.
        </p>
      </section>

      {selected ? <ProductModal product={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
