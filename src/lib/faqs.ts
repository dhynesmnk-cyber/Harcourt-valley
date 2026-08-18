import type { Faq } from "./seo";

/* ------------------------------------------------------------------ */
/*  The questions people actually ask, answered in full sentences.     */
/*                                                                     */
/*  These do double duty: they render on the page as an accordion, and */
/*  they emit FAQPage structured data. Answers are written to stand    */
/*  alone — an answer engine will quote one sentence out of context,   */
/*  so every answer names the winery, the place, or the number.        */
/* ------------------------------------------------------------------ */

export const HOME_FAQS: Faq[] = [
  {
    q: "Where is Harcourt Valley Vineyards?",
    a: "Harcourt Valley Vineyards is at 41 Schoolhouse Rd, Harcourt VIC 3453, in the Bendigo wine region of Central Victoria. It is a 30-minute drive from Bendigo, 15 minutes from Castlemaine and about 90 minutes from Melbourne on the Calder Freeway.",
  },
  {
    q: "When is the cellar door open?",
    a: "The cellar door is open Friday, Saturday and Sunday from 11am to 5pm. Weddings, functions and group visits run on other days by arrangement — ring (03) 5474 2210.",
  },
  {
    q: "Do I need to book a tasting, and what does it cost?",
    a: "Walk-ins are welcome on open days. A tasting costs $10 a person and is waived if you buy a bottle. Groups of more than eight should ring ahead so someone is free to look after you.",
  },
  {
    q: "What wines does Harcourt Valley Vineyards make?",
    a: "Shiraz — including a limited Old Vine Shiraz from vines planted in 1975 and capped at 60 cases — plus Cabernet Sauvignon, Chardonnay, Riesling, Malbec Rosé and a Sparkling Rosé. The winery also makes Ginger Kid ginger beer in 4.5% and 8% strengths, both gluten free.",
  },
  {
    q: "Can you get married at Harcourt Valley Vineyards?",
    a: "Yes. The vineyard hosts one wedding a day, with the property yours from 10am to midnight. It seats 120 guests or holds 180 standing, with a ceremony site among the vine rows and the old shearing shed as a wet-weather plan.",
  },
  {
    q: "What makes the wine here different?",
    a: "The vineyard sits on decomposed granite, which drains hard and holds little nutrition. The vines yield less and the berries stay small, which concentrates colour, tannin and aroma. It is the reason Harcourt Valley's Shiraz reads savoury and structured rather than jammy, and it is behind more than 500 show medals and a 5-star Halliday Wine Companion rating.",
  },
];

export const WEDDING_FAQS: Faq[] = [
  {
    q: "How much does a wedding at Harcourt Valley Vineyards cost?",
    a: "A ceremony and reception for 80 to 120 guests runs between $8,900 and $12,400. Midweek and winter dates start from $6,500 with the same day-long access, and a ceremony alone for up to 40 guests starts at $2,200. Saturdays in autumn are the most expensive dates.",
  },
  {
    q: "How many guests can the venue hold?",
    a: "120 guests seated in the function room, or 180 standing. The ceremony site among the vines is set with 140 chairs.",
  },
  {
    q: "Do you host more than one wedding a day?",
    a: "No. Harcourt Valley Vineyards hosts one wedding a day, always. The whole property is yours from 10am until midnight.",
  },
  {
    q: "What is the wet-weather plan?",
    a: "The old shearing shed, dressed properly for the occasion — not a marquee on a car park. It is a genuine indoor alternative for the ceremony and the reception, and it photographs well.",
  },
  {
    q: "What is included in the venue hire?",
    a: "The property from 10am to midnight, the ceremony site with 140 chairs set and packed away, the function room dressed for 120 seated, the shearing shed as a wet-weather plan, long tables, cross-back chairs, linen, festoon lights, an on-site coordinator from bump-in to the last dance, parking for 60 cars, and a tasting for two before the day.",
  },
  {
    q: "Can we hold a date before paying a deposit?",
    a: "Yes. Harcourt Valley will hold a date for 14 days with no deposit while you decide.",
  },
];

export const EVENT_FAQS: Faq[] = [
  {
    q: "What kinds of events can you hold at the vineyard?",
    a: "Long-table dinners, birthday parties and long lunches, product launches and brand days, and corporate retreats. The function room, the garden and the old shearing shed can each take a different format.",
  },
  {
    q: "What does a long-table dinner cost?",
    a: "Long-table dinners start from $120 a head for 40 to 80 guests, which covers five courses with matched pours. Parties and long lunches start at $1,400 for the space with food from $95 a head, and product launches run $1,800 for a half day or $2,800 for a full day.",
  },
  {
    q: "Can we bring our own caterer?",
    a: "Yes. Harcourt Valley's long-table kitchen can cater the event, or you can bring your own caterer. The wine is ours, priced at cellar door rates on the day.",
  },
  {
    q: "What is included with an event booking?",
    a: "Trestles, linen, cross-back chairs, festoon lights and the sound system are all in the hire, with a projector and microphone available on request. You have the property from 10am to midnight, and bump-in the day before if you need it.",
  },
];

export const WINERY_FAQS: Faq[] = [
  {
    q: "Can I buy Harcourt Valley wine online?",
    a: "Yes. The full range ships from the winery in Harcourt, Victoria, and freight is free on six bottles or more. Some wines, including the Old Vine Shiraz and the Rosé, regularly sell out before the next vintage is ready.",
  },
  {
    q: "What is the Old Vine Shiraz?",
    a: "It is made from vines planted in 1975 by Ray and Barbara Broughton — the oldest vines in the Mount Alexander Shire. They sit at the lowest, coolest part of the property, so they yield less and ripen slowly. The wine is only made in exceptional years and production is capped at 60 cases.",
  },
  {
    q: "Do you sell to bottle shops, bars and restaurants?",
    a: "Yes. Harcourt Valley supplies independent bottle shops, wine bars and restaurants, mostly across regional Victoria and the Murray. Trade orders go through the trade page, and samples can be dropped off in person around Central Victoria.",
  },
  {
    q: "Is the Ginger Kid ginger beer gluten free?",
    a: "Yes. Ginger Kid is gluten free in both the 4.5% and the 8% strengths, and it is made with genuine Australian ginger rather than sweetened flavouring.",
  },
];
