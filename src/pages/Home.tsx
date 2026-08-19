import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IMG, publishedPosts } from "../lib/data";
import { useApplyAppearance, useStore, useVariant } from "../lib/store";
import { VariantToggle } from "../components/chrome";
import { TypedLines } from "../components/TypedLines";
import { PostCard } from "../components/journal";
import { HOME_FAQS } from "../lib/faqs";
import { breadcrumbSchema, faqSchema, useSeo, webPageSchema } from "../lib/seo";
import { BUSINESS, DISTANCES, KEY_FACTS, SITE_NAME, absUrl, fullAddress } from "../lib/site";
import {
  ArrowRight, ArrowUpRight, ClockIcon, ContourDivider, FactGrid, FaqList, MedalRow, PinIcon,
  Reveal, SectionHead,
} from "../components/ui";

/* ================= Variant A — fullscreen interactive triptych ================= */

const PANELS = [
  {
    to: "/winery",
    img: IMG.cellarDoor,
    alt: "Red wine being poured at the timber cellar door bar",
    title: "The Winery",
    desc: "CELLAR DOOR · WINES · TRADE",
    blurb: "500+ medals on the shelf, poured by the family.",
  },
  {
    to: "/weddings",
    img: IMG.wedding,
    alt: "Wedding ceremony aisle set between rows of vines",
    title: "Weddings",
    desc: "MARRIED IN THE VINES",
    blurb: "One wedding a day, among the rows.",
  },
  {
    to: "/events",
    img: IMG.longTable,
    alt: "Long banquet table under festoon lights in the function shed",
    title: "Events",
    desc: "PARTIES · DINNERS · LAUNCHES",
    blurb: "Long tables under the granite hills.",
  },
];

function Triptych() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="flex flex-col md:flex-row h-[calc(100svh-72px)] border-b-2 border-granite-900" onMouseLeave={() => setActive(null)}>
      {PANELS.map((p, i) => {
        const isActive = active === i || (active === null && i === 1);
        return (
          <Link
            key={p.to}
            to={p.to}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className="group relative overflow-hidden flex-1 border-granite-900 border-b-2 md:border-b-0 md:border-r-2 last:border-b-0 md:last:border-r-0 outline-none focus-visible:outline focus-visible:outline-garnet"
            style={{ flexGrow: isActive ? 2.5 : 1, transition: "flex-grow 750ms var(--ease-soft)" }}
            aria-label={`${p.title} — ${p.desc.toLowerCase()}`}
          >
            <img
              src={p.img}
              alt={p.alt}
              className="absolute inset-0 w-full h-full object-cover img-in"
              style={{ transform: isActive ? "scale(1.03)" : "scale(1.08)", transition: "transform 1.4s var(--ease-soft), opacity .5s ease" }}
              loading={i === 1 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-granite-900 via-granite-900/25 to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 text-bone">
              <p className="kicker text-granite-300 mb-2">{p.desc}</p>
              <h2 className="font-display font-medium leading-none text-4xl sm:text-5xl xl:text-6xl group-hover:italic transition-all duration-300">{p.title}</h2>
              <div
                className="overflow-hidden"
                style={{ maxHeight: isActive ? "96px" : "0px", opacity: isActive ? 1 : 0, transition: "max-height .6s var(--ease-soft), opacity .45s ease" }}
              >
                <p className="text-sm text-granite-100 mt-3 max-w-[24rem]">{p.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-2.5 btn btn-sm bg-bone text-granite-900 pointer-events-none">
                  Enter <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ================= Variant B — classic editorial landing ================= */

function Classic() {
  const { config } = useStore();
  return (
    <>
      {/* Opening: split editorial hero, not a centred trio */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6">
          <Reveal>
            <p className="kicker text-granite-500">Harcourt Valley · est. 1975</p>
            <h1 className="font-display font-medium text-[2.6rem] leading-[1.02] sm:text-6xl xl:text-[4.4rem] mt-5 text-granite-900">
              {config.heroHeadline.split(",").map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 ? "," : ""}
                  {i === 0 ? <br /> : null}
                </span>
              ))}
            </h1>
            <p className="mt-6 max-w-md text-granite-700 leading-relaxed">{config.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/winery" className="btn btn-primary">
                Visit the cellar door <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/weddings" className="btn btn-ghost">
                Plan a wedding
              </Link>
            </div>
            <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-granite-500">
              <span className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" /> Cellar door Fri–Sun, 11am–5pm
              </span>
              <span className="flex items-center gap-2">
                <PinIcon className="w-4 h-4" /> Harcourt, Victoria
              </span>
            </p>
          </Reveal>
        </div>
        <Reveal delay={120} className="lg:col-span-6">
          <div className="img-frame border-2 border-granite-900 shadow-hard lux-zoom">
            <img src={config.heroImage} alt="Vine rows running toward the granite hills at golden hour" className="w-full h-[320px] sm:h-[440px] object-cover img-in" />
          </div>
        </Reveal>
      </section>

      {/* What people say, written out a letter at a time */}
      <section aria-label="What people say" className="border-y-2 border-granite-900 bg-granite-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <TypedLines page="home" />
        </div>
      </section>

      <MedalRow />

      {/* Destinations — editorial, deliberately uneven */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHead kicker="Where to next" title={<>Three doors, one valley.</>} lead="The winery, the wedding, or the long table — every path starts in the same granite soil." />
        <div className="mt-12 grid lg:grid-cols-12 gap-8">
          <Reveal className="lg:col-span-7">
            <Link to="/winery" className="group block border-2 border-granite-900 bg-bone lux-card lux-sheen">
              <div className="img-frame-alt overflow-hidden lux-zoom">
                <img src={IMG.cellarDoor} alt="A pour of Shiraz at the cellar door" className="w-full h-64 sm:h-80 object-cover" loading="lazy" />
              </div>
              <div className="p-6 sm:p-8">
                <p className="kicker text-granite-500">The winery</p>
                <h3 className="font-display text-3xl sm:text-4xl font-medium mt-2">Bendigo's most-awarded winery.</h3>
                <p className="mt-3 text-granite-700 max-w-lg">Shiraz grown on granite, Riesling picked cold, mead from the orchard hives. Order online or come and taste it where it grew.</p>
                <span className="mt-5 inline-flex items-center gap-2.5 kicker text-garnet">
                  Shop the wines <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </div>
            </Link>
          </Reveal>
          <div className="lg:col-span-5 flex flex-col gap-8">
            <Reveal delay={100}>
              <Link to="/weddings" className="group block border-2 border-granite-900 bg-bone lux-card lux-sheen">
                <div className="flex flex-col sm:flex-row">
                  <div className="img-frame sm:w-44 shrink-0 overflow-hidden lux-zoom">
                    <img src={IMG.wedding} alt="Ceremony chairs between vine rows" className="w-full h-40 sm:h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-5 sm:p-6">
                    <p className="kicker text-granite-500">Weddings</p>
                    <h3 className="font-display text-2xl font-medium mt-1.5">Married in the vines.</h3>
                    <p className="mt-2 text-sm text-granite-700">Ceremony among the rows, straight ballparks, one wedding a day.</p>
                    <span className="mt-3 inline-flex items-center gap-2 kicker text-ochre">
                      Start planning <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
            <Reveal delay={180}>
              <Link to="/events" className="group block border-2 border-granite-900 bg-bone lux-card lux-sheen">
                <div className="flex flex-col sm:flex-row">
                  <div className="img-frame-alt sm:w-44 shrink-0 overflow-hidden lux-zoom">
                    <img src={IMG.longTable} alt="Long table dressed for dinner under festoon lights" className="w-full h-40 sm:h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-5 sm:p-6">
                    <p className="kicker text-granite-500">Events</p>
                    <h3 className="font-display text-2xl font-medium mt-1.5">Long tables & launches.</h3>
                    <p className="mt-2 text-sm text-granite-700">Parties, dinners, product launches and slow retreats.</p>
                    <span className="mt-3 inline-flex items-center gap-2 kicker text-vine">
                      See the spaces <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <ContourDivider />

      {/* Story + visit */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 items-start">
        <Reveal>
          <div className="img-frame border-2 border-granite-900 shadow-hard lux-zoom">
            <img src={IMG.granite} alt="Granite boulders and river red gums on the Harcourt hillside" className="w-full h-[300px] sm:h-[420px] object-cover img-in" loading="lazy" />
          </div>
        </Reveal>
        <Reveal delay={120}>
          <p className="kicker text-granite-500">The valley</p>
          <h2 className="font-display text-3xl sm:text-5xl font-medium leading-[1.05] mt-3">Granite makes slow wine. We're not in a hurry either.</h2>
          <div className="mt-6 space-y-4 text-granite-700 leading-relaxed max-w-xl">
            <p>
              Harcourt sits on an old granite seam in Central Victoria. The soil is poor, the vines struggle, and the fruit comes in small and intense — which is exactly what
              500-odd show medals are made of.
            </p>
            <p>
              The family planted the first block when the shire was still counting orchards, and it's still the oldest vineyard around. Two generations later, we grow it, make it,
              and pour it ourselves. The cellar door is the front room; the function shed used to shear sheep.
            </p>
            <p>Everything happens within a five-minute walk: the rows, the barrels, the long table, and the best photo backdrop in the region.</p>
          </div>
          <div className="mt-8 border-2 border-granite-900 bg-bone p-6 max-w-md">
            <p className="kicker text-granite-500">Come and stand in it</p>
            <p className="mt-2 flex items-center gap-2.5 text-sm text-granite-700">
              <PinIcon className="w-4 h-4 text-garnet shrink-0" /> 41 Schoolhouse Rd, Harcourt VIC 3453
            </p>
            <p className="mt-1.5 flex items-center gap-2.5 text-sm text-granite-700">
              <ClockIcon className="w-4 h-4 text-garnet shrink-0" /> Fri–Sun, 11am–5pm · tastings $10, waived with purchase
            </p>
            <Link to="/winery" className="btn btn-dark btn-sm mt-5">
              Plan the drive <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

/* ================= shared sections (both variants) ================= */

/**
 * The latest journal posts. Lives on the home page because a crawler that
 * only ever sees "/" should still find dated, topical writing and three
 * internal links into it.
 */
function JournalStrip() {
  const { posts } = useStore();
  const latest = useMemo(() => publishedPosts(posts).slice(0, 3), [posts]);
  if (latest.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20" aria-labelledby="journal-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead
          kicker="From the journal"
          title={<span id="journal-heading">What we've been writing down.</span>}
          lead="Notes on the region, the granite, and the practical business of getting married or feeding eighty people in a vineyard."
        />
        <Reveal delay={80}>
          <Link to="/journal" className="btn btn-ghost btn-sm">
            All of the journal <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {latest.map((p, i) => (
          <Reveal key={p.id} delay={i * 90}>
            <PostCard post={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Short, checkable claims — the block an answer engine lifts wholesale. */
function QuickFacts() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20" aria-labelledby="facts-heading">
      <SectionHead
        kicker="The short answers"
        title={<span id="facts-heading">Harcourt Valley, in numbers.</span>}
        lead={`A family vineyard at ${fullAddress}, in the Bendigo wine region. Cellar door ${BUSINESS.openingHoursText}.`}
      />
      <div className="mt-10">
        <FactGrid facts={KEY_FACTS} />
      </div>
      <div className="mt-8 border-2 border-granite-900 bg-granite-100/50 p-6">
        <p className="kicker text-granite-500">How far is it?</p>
        <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
          {DISTANCES.map((d) => (
            <li key={d.from} className="border-b border-granite-300 pb-2">
              <span className="block text-sm text-granite-700">From {d.from}</span>
              <span className="block font-label font-semibold whitespace-nowrap">
                {d.minutes} min · {d.km} km
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HomeFaqs() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20" aria-labelledby="faq-heading">
      <p className="kicker text-granite-500">Before you ring</p>
      <h2 id="faq-heading" className="font-display text-3xl sm:text-5xl font-medium leading-[1.05] mt-2">
        The questions we get asked most.
      </h2>
      <FaqList faqs={HOME_FAQS} className="mt-10" />
      <p className="mt-8 text-sm text-granite-500">
        Anything else, ring{" "}
        <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="underline underline-offset-4 hover:text-garnet">
          {BUSINESS.phoneDisplay}
        </a>{" "}
        — the family answers it.
      </p>
    </section>
  );
}

/* ================= page ================= */

export default function Home() {
  const [variant, setVariant] = useVariant();
  useApplyAppearance();
  const { config } = useStore();

  useSeo({
    title: "Harcourt Valley Vineyards — wine, weddings & events in Harcourt, Victoria",
    description:
      "Bendigo's most-awarded winery: 500+ show medals and a 5-star Halliday rating. Cellar door Friday to Sunday, weddings in the vines, and long-table events — 30 minutes from Bendigo, 90 from Melbourne.",
    path: "/",
    image: config.heroImage,
    imageAlt: "Vine rows running toward the granite hills at Harcourt Valley Vineyards",
    keywords: [
      "Harcourt Valley Vineyards",
      "Bendigo wine region",
      "winery Harcourt Victoria",
      "vineyard wedding Victoria",
      "cellar door Central Victoria",
    ],
    jsonLd: [
      webPageSchema({
        path: "/",
        name: "Wine, weddings & events in Harcourt, Victoria",
        description:
          "Harcourt Valley Vineyards is a family-run winery in the Bendigo wine region with a cellar door, a wedding venue among the vines, and a long-table event space.",
        primaryImage: config.heroImage,
      }),
      breadcrumbSchema([{ name: "Home", path: "/" }]),
      faqSchema(HOME_FAQS),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `What you can do at ${SITE_NAME}`,
        itemListElement: [
          { name: "Cellar door & wine shop", path: "/winery", description: "Taste and buy the range at the vineyard, or order it online." },
          { name: "Weddings in the vines", path: "/weddings", description: "One wedding a day, 120 seated or 180 standing, the property yours 10am to midnight." },
          { name: "Events & long tables", path: "/events", description: "Long-table dinners, parties, product launches and corporate retreats." },
          { name: "Journal", path: "/journal", description: "Writing on the region, the winemaking, and planning a wedding or event here." },
        ].map((i, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: i.name,
          description: i.description,
          url: absUrl(i.path),
        })),
      },
    ],
  });

  return (
    <div>
      {variant === "a" ? (
        <>
          <Triptych />
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
            <SectionHead
              as="h1"
              kicker="Harcourt Valley Vineyards"
              title={<>One valley, three doors.</>}
              lead="Bendigo's most-awarded winery in Harcourt, Victoria — 500+ show medals, a 5-star Halliday rating, and the oldest vineyard in the Mount Alexander Shire. Choose your door above."
            />
            <div className="mt-10 border-t-2 border-granite-300 pt-8">
              <TypedLines page="home" />
            </div>
          </section>
        </>
      ) : (
        <Classic />
      )}
      <ContourDivider />
      <JournalStrip />
      <QuickFacts />
      <HomeFaqs />
      <VariantToggle variant={variant} onChange={setVariant} />
    </div>
  );
}
