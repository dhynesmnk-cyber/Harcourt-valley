import React, { useState } from "react";
import { IMG, type EventSubtype } from "../lib/data";
import { useApplyAppearance, useStore } from "../lib/store";
import { EnquiryForm } from "../components/EnquiryForm";
import { AnchorLink, ArrowRight, ClockIcon, FaqList, MailIcon, PinIcon, Reveal, SectionHead } from "../components/ui";
import { TypedLines } from "../components/TypedLines";
import { EVENT_FAQS } from "../lib/faqs";
import { breadcrumbSchema, faqSchema, useSeo, webPageSchema } from "../lib/seo";
import { BUSINESS, absUrl } from "../lib/site";

interface EventTypeSection {
  id: EventSubtype;
  name: string;
  kicker: string;
  copy: string;
  img: string;
  alt: string;
}

const SECTIONS: EventTypeSection[] = [
  {
    id: "party",
    name: "Parties & long lunches",
    kicker: "Birthdays · anniversaries · any excuse",
    copy: "A long table in the garden or the function room, grazing food or something cooked, and our wine poured by the people who made it. You bring the people; the valley does the rest.",
    img: IMG.longTable,
    alt: "Long table dressed for a celebration under festoon lights",
  },
  {
    id: "dinner",
    name: "Long-table dinners",
    kicker: "40–80 guests · five courses · matched pours",
    copy: "One table, candles, and a menu built around what's in season and what's in barrel. Readings between courses are welcome — it's been done, it worked.",
    img: IMG.barrels,
    alt: "Oak barrels in the granite cellar where dinner wines rest",
  },
  {
    id: "launch",
    name: "Launches & brand days",
    kicker: "Products · films · collections",
    copy: "Standing format, power for your setup, festoon lights already rigged, and a backdrop that doesn't need styling. Half-day or full-day, with our wine at trade pricing on the day.",
    img: IMG.bottles,
    alt: "Bottles lined up on granite — ready for a launch table",
  },
  {
    id: "retreat",
    name: "Retreats & planning days",
    kicker: "Corporate · creative · slow",
    copy: "Morning in the function room, lunch in the garden, a vine walk before the drive home. Whiteboard, projector and decent coffee included; the quiet does the rest.",
    img: IMG.granite,
    alt: "Granite hillside above the vineyard — the walking track",
  },
];

export default function Events() {
  useApplyAppearance();

  useSeo({
    title: "Vineyard events & long-table dinners near Bendigo",
    description:
      "Long-table dinners, parties, product launches and corporate retreats at a working vineyard in Harcourt, Victoria. 40 to 180 guests, the property from 10am to midnight, dinners from $120 a head.",
    path: "/events",
    image: IMG.longTable,
    imageAlt: "A long banquet table under festoon lights in the function shed at Harcourt Valley Vineyards",
    keywords: ["long table dinner Victoria", "vineyard function venue Bendigo", "corporate retreat Central Victoria", "product launch venue"],
    jsonLd: [
      webPageSchema({
        path: "/events",
        name: "Events & long tables",
        description: "Event and function hire at Harcourt Valley Vineyards — long-table dinners, parties, launches and retreats.",
        primaryImage: IMG.longTable,
      }),
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Events", path: "/events" },
      ]),
      faqSchema(EVENT_FAQS),
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${absUrl("/events")}#service`,
        name: "Vineyard event and function venue hire",
        serviceType: "Event venue",
        provider: { "@id": `${absUrl("/")}#winery` },
        url: absUrl("/events"),
        description:
          "Private events at Harcourt Valley Vineyards, Harcourt, Victoria: long-table dinners for 40 to 80 guests, parties and long lunches, product launches, and corporate retreats.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "AUD",
          lowPrice: 1400,
          highPrice: 2800,
          offerCount: 4,
          availability: "https://schema.org/InStock",
        },
      },
    ],
  });
  const { config } = useStore();
  const [presetSubtype, setPresetSubtype] = useState<EventSubtype | undefined>(undefined);

  const enquire = (t: EventSubtype) => {
    setPresetSubtype(t);
    document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      {/* Opener */}
      <section className="relative h-[56svh] min-h-[420px] border-b-2 border-granite-900 overflow-hidden">
        <img src={IMG.longTable} alt="Long banquet table under festoon lights in the function shed" className="absolute inset-0 w-full h-full object-cover img-in" />
        <div className="absolute inset-0 bg-gradient-to-t from-granite-900 via-granite-900/30 to-granite-900/10" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14 text-bone">
            <p className="kicker text-granite-300">Events</p>
            <h1 className="font-display font-medium text-4xl sm:text-6xl xl:text-7xl leading-[1.02] mt-4 max-w-3xl">The valley, booked for your thing.</h1>
            <p className="mt-5 max-w-xl text-granite-100 leading-relaxed">Four shapes of event, one property. Flexible on format, fixed on wine quality.</p>
          </div>
        </div>
      </section>

      {/* Anchor chips */}
      <nav className="sticky top-[72px] z-40 bg-bone/95 backdrop-blur-[2px] border-b-2 border-granite-900" aria-label="Event types">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-3 overflow-x-auto thin-scroll py-3">
          {SECTIONS.map((s) => (
            <AnchorLink key={s.id} to={`type-${s.id}`} className="btn btn-sm btn-ghost whitespace-nowrap">
              {s.name.split(" & ")[0]}
            </AnchorLink>
          ))}
          <AnchorLink to="enquire" className="btn btn-sm btn-dark whitespace-nowrap">
            Enquire
          </AnchorLink>
        </div>
      </nav>

      {/* What people say, written out a letter at a time */}
      <section aria-label="What people say" className="border-b-2 border-granite-900 bg-granite-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <TypedLines page="events" />
        </div>
      </section>

      {/* Type sections */}
      {SECTIONS.map((s, idx) => {
        const ballpark = config.eventBallparks[idx];
        return (
          <section key={s.id} id={`type-${s.id}`} className={`py-16 sm:py-20 ${idx % 2 === 1 ? "bg-granite-100/50 border-y-2 border-granite-300" : ""}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center">
              <Reveal className={idx % 2 === 1 ? "lg:order-2" : ""}>
                <div className={`${idx % 2 === 1 ? "img-frame-alt" : "img-frame"} border-2 border-granite-900 shadow-hard-sm lux-zoom`}>
                  <img src={s.img} alt={s.alt} className="w-full h-[260px] sm:h-[360px] object-cover img-in" loading="lazy" />
                </div>
              </Reveal>
              <Reveal delay={120} className={idx % 2 === 1 ? "lg:order-1" : ""}>
                <div>
                  <span className="block w-12 h-[2px] bg-gradient-to-r from-garnet to-ochre" aria-hidden="true" />
                  <p className="kicker text-granite-500 mt-4">{s.kicker}</p>
                  <h2 className="font-display text-3xl sm:text-4xl font-medium leading-[1.05] mt-1.5">{s.name}</h2>
                </div>
                <p className="mt-5 text-granite-700 leading-relaxed max-w-lg">{s.copy}</p>
                {ballpark ? (
                  <div className="mt-6 inline-flex flex-col border-2 border-granite-900 bg-bone px-5 py-3.5">
                    <span className="kicker text-granite-500">Ballpark</span>
                    <span className="font-display text-xl sm:text-2xl font-medium text-vine">{ballpark.range}</span>
                    <span className="text-xs text-granite-500 mt-1">{ballpark.note}</span>
                  </div>
                ) : null}
                <div className="mt-7">
                  <button type="button" className="btn btn-primary" onClick={() => enquire(s.id)}>
                    Enquire about this <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Reveal>
            </div>
          </section>
        );
      })}

      {/* Enquire */}
      {/* Questions, answered on the page */}
      <section id="questions" className="max-w-4xl mx-auto px-4 sm:px-6 py-16" aria-labelledby="evt-faq-heading">
        <p className="kicker text-granite-500">Before you enquire</p>
        <h2 id="evt-faq-heading" className="font-display text-3xl sm:text-5xl font-medium leading-[1.05] mt-2">
          The practical questions.
        </h2>
        <FaqList faqs={EVENT_FAQS} className="mt-10" />
        <p className="mt-8 text-sm text-granite-500">
          Something not covered here? Ring{" "}
          <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="underline underline-offset-4 hover:text-garnet">
            {BUSINESS.phoneDisplay}
          </a>
          .
        </p>
      </section>

      <section id="enquire" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHead
          kicker="Enquire"
          title={<>Sketch the shape of it.</>}
          lead="Tell us the format and a headcount; we'll sketch the numbers. The event guide arrives as three short emails, never a flood."
        />
        <div className="mt-10 grid lg:grid-cols-12 gap-10 items-start">
          <Reveal className="lg:col-span-7">
            <EnquiryForm kind="event" presetSubtype={presetSubtype} />
          </Reveal>
          <Reveal delay={120} className="lg:col-span-5">
            <div className="border-2 border-granite-900 p-6 sm:p-7 bg-bone">
              <p className="kicker text-granite-500">The practical bits</p>
              <ul className="mt-4 space-y-2.5 text-sm text-granite-700">
                <li className="flex gap-3">
                  <ClockIcon className="w-4 h-4 text-vine shrink-0" /> Access 10am – midnight; bump-in the day before if you need it
                </li>
                <li className="flex gap-3">
                  <PinIcon className="w-4 h-4 text-vine shrink-0" /> Trestles, linen, festoon lights, sound system included
                </li>
                <li className="flex gap-3">
                  <MailIcon className="w-4 h-4 text-vine shrink-0" /> events@harcourtvalley.example · (03) 5474 2210
                </li>
              </ul>
              <p className="mt-5 text-sm text-granite-700 leading-relaxed">
                Catering can be ours or yours. Power, projector and mic on request. If it rains, the shearing shed has hosted better parties than the function room.
              </p>
            </div>
            <div className="mt-6 border-2 border-granite-900 bg-granite-100/50 p-6">
              <p className="kicker text-granite-500">All four ballparks</p>
              <ul className="mt-4 divide-y divide-granite-300">
                {config.eventBallparks.map((b) => (
                  <li key={b.label} className="py-2.5 flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-sm font-label font-semibold text-granite-900">{b.label}</span>
                    <span className="font-display text-lg font-medium text-vine">{b.range}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
