import React, { useState } from "react";
import { IMG, type EventSubtype } from "../lib/data";
import { useApplyAppearance, useStore } from "../lib/store";
import { EnquiryForm } from "../components/EnquiryForm";
import { AnchorLink, ArrowRight, ClockIcon, ContourDivider, MailIcon, PhoneIcon, PinIcon, Reveal, SectionHead, Tick } from "../components/ui";
import { TypedLines } from "../components/TypedLines";

const ANCHORS = [
  { id: "story", label: "The venue" },
  { id: "ballparks", label: "Ballparks" },
  { id: "included", label: "What's included" },
  { id: "enquire", label: "Enquire" },
];

export default function Weddings() {
  useApplyAppearance();
  const { config } = useStore();
  const [presetSubtype] = useState<EventSubtype | undefined>(undefined);

  return (
    <div>
      {/* Opener */}
      <section className="relative h-[64svh] min-h-[440px] border-b-2 border-granite-900 overflow-hidden">
        <img src={IMG.wedding} alt="Ceremony aisle between vine rows with the granite hills behind" className="absolute inset-0 w-full h-full object-cover img-in" />
        <div className="absolute inset-0 bg-gradient-to-t from-granite-900 via-granite-900/30 to-granite-900/10" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14 text-bone">
            <p className="kicker text-granite-300">Weddings</p>
            <h1 className="font-display font-medium text-4xl sm:text-6xl xl:text-7xl leading-[1.02] mt-4 max-w-3xl">{config.weddingsHeadline}</h1>
            <p className="mt-5 max-w-xl text-granite-100 leading-relaxed">
              A working vineyard 30 minutes from Bendigo. Ceremony among the rows, dinner with our wine, and granite hills behind every photo.
            </p>
          </div>
        </div>
      </section>

      {/* Anchor nav */}
      <nav className="sticky top-[72px] z-40 bg-bone/95 backdrop-blur-[2px] border-b-2 border-granite-900" aria-label="Weddings sections">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 overflow-x-auto thin-scroll">
          {ANCHORS.map((a) => (
            <AnchorLink key={a.id} to={a.id} className="nav-link kicker text-granite-700 py-3.5 whitespace-nowrap">
              {a.label}
            </AnchorLink>
          ))}
        </div>
      </nav>

      {/* Story + facts */}
      <section id="story" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 items-start">
        <Reveal>
          <p className="kicker text-granite-500">The venue</p>
          <h2 className="font-display text-3xl sm:text-5xl font-medium leading-[1.05] mt-3">One wedding a day. It stays that way.</h2>
          <div className="mt-6 space-y-4 text-granite-700 leading-relaxed max-w-xl">
            <p>
              The property is yours from ten in the morning until midnight — the vine rows, the function room, the garden, and the old shearing shed when the weather turns. No
              double bookings, no shared driveway, no clock-watching staff.
            </p>
            <p>
              We've been hosting weddings here long enough to know the light at every hour, which corner the wind dies in, and exactly how long it takes to get 120 people from
              the ceremony rows to the first pour.
            </p>
            <p className="font-display italic text-xl text-granite-900">"You'll know within ten minutes of standing here. Couples always do."</p>
          </div>
          <div className="mt-9 border-t-2 border-granite-300 pt-7">
            <TypedLines page="weddings" />
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="img-frame border-2 border-granite-900 shadow-hard lux-zoom">
            <img src={IMG.granite} alt="Granite boulders and gums behind the vineyard — the photo backdrop" className="w-full h-[300px] sm:h-[420px] object-cover img-in" loading="lazy" />
          </div>
          <div className="mt-6 img-frame-alt border-2 border-granite-900 lux-zoom">
            <img src={IMG.longTable} alt="The function shed dressed for a wedding dinner" className="w-full h-[220px] sm:h-[280px] object-cover img-in" loading="lazy" />
          </div>
        </Reveal>
      </section>

      <ContourDivider />

      {/* Ballparks */}
      <section id="ballparks" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHead
          kicker="Ballpark figures"
          title={<>Straight numbers, no pricing games.</>}
          lead="What a day here actually costs. Final quotes move with season, day of week and guest count — these are honest starting points."
        />
        <div className="mt-10 border-2 border-granite-900 bg-bone divide-y-2 divide-granite-300">
          {config.weddingBallparks.map((b, i) => (
            <Reveal key={b.label} delay={i * 70}>
              <div className="grid md:grid-cols-[1.2fr_0.8fr_1.2fr] gap-2 md:gap-8 px-6 sm:px-8 py-5 items-baseline hover:bg-granite-100/60 transition-colors">
                <p className="font-label font-semibold text-granite-900">{b.label}</p>
                <p className="font-display text-2xl sm:text-3xl font-medium text-garnet">{b.range}</p>
                <p className="text-sm text-granite-500">{b.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-sm text-granite-500">Figures are updated as the seasons change — what you see here is what we'll quote from.</p>
      </section>

      {/* Inclusions */}
      <section id="included" className="bg-granite-100/50 border-y-2 border-granite-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <SectionHead kicker="What's included" title={<>The whole property, not a room.</>} />
          <div className="mt-10 grid sm:grid-cols-2 gap-x-10 gap-y-4 max-w-4xl">
            {config.inclusions.map((item, i) => (
              <Reveal key={item} delay={(i % 2) * 70}>
                <div className="flex gap-3.5 items-start py-1.5">
                  <span className="grid place-items-center w-7 h-7 border-2 border-granite-900 bg-bone shrink-0 mt-0.5">
                    <Tick className="w-3.5 h-3.5 text-vine" />
                  </span>
                  <span className="text-granite-700 leading-relaxed">{item}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Enquire */}
      <section id="enquire" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHead
          kicker="Enquire"
          title={<>Tell us about the day.</>}
          lead="We reply within one business day. Ask for the info pack and it arrives as three short emails — never a flood."
        />
        <div className="mt-10 grid lg:grid-cols-12 gap-10 items-start">
          <Reveal className="lg:col-span-7">
            <EnquiryForm kind="wedding" presetSubtype={presetSubtype} />
          </Reveal>
          <Reveal delay={120} className="lg:col-span-5">
            <div className="border-2 border-granite-900 p-6 sm:p-7 bg-bone">
              <p className="kicker text-granite-500">Prefer to see it first?</p>
              <p className="mt-3 text-granite-700 leading-relaxed">
                Visits take about an hour. We'll walk the ceremony rows, the function room and the shed, and open something worth tasting. Tick <em>"Book a visit"</em> on the form
                and we'll suggest times.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-granite-700">
                <li className="flex items-center gap-3">
                  <PhoneIcon className="w-4 h-4 text-ochre shrink-0" /> (03) 5474 2210
                </li>
                <li className="flex items-center gap-3">
                  <MailIcon className="w-4 h-4 text-ochre shrink-0" /> weddings@harcourtvalley.example
                </li>
                <li className="flex items-center gap-3">
                  <PinIcon className="w-4 h-4 text-ochre shrink-0" /> 41 Schoolhouse Rd, Harcourt VIC 3453
                </li>
                <li className="flex items-center gap-3">
                  <ClockIcon className="w-4 h-4 text-ochre shrink-0" /> 90 min from Melbourne · 30 from Bendigo
                </li>
              </ul>
            </div>
            <div className="mt-6 border-2 border-granite-900 bg-granite-900 text-bone p-6 sm:p-7">
              <p className="kicker text-granite-300">How the info pack works</p>
              <ol className="mt-4 space-y-3 text-sm text-granite-100">
                <li className="flex gap-3">
                  <span className="kicker text-ochre">Day 0</span> The full pack — capacities, inclusions, ballparks.
                </li>
                <li className="flex gap-3">
                  <span className="kicker text-ochre">Day 2</span> FAQs and what happens next.
                </li>
                <li className="flex gap-3">
                  <span className="kicker text-ochre">Day 6</span> An invitation to come and stand in the vines.
                </li>
              </ol>
              <p className="mt-4 text-xs text-granite-300">Written and sent by the family. Stops automatically once you've booked.</p>
            </div>
            <AnchorLink to="ballparks" className="btn btn-ghost w-full mt-6">
              Re-read the ballparks <ArrowRight className="w-4 h-4 rotate-90" />
            </AnchorLink>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
