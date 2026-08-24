import React, { useMemo, useState } from "react";
import { publishedPosts } from "../lib/data";
import { useApplyAppearance, useStore } from "../lib/store";
import { useSeo, breadcrumbSchema, webPageSchema } from "../lib/seo";
import { SITE_NAME, absUrl } from "../lib/site";
import { ContourDivider, EmptyState, Reveal, SectionHead } from "../components/ui";
import { PostCard } from "../components/journal";

export default function Journal() {
  useApplyAppearance();
  const { posts } = useStore();
  const [category, setCategory] = useState<string>("All");

  const live = useMemo(() => publishedPosts(posts), [posts]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(live.map((p) => p.category)))], [live]);
  const visible = useMemo(() => (category === "All" ? live : live.filter((p) => p.category === category)), [live, category]);
  const [lead, ...rest] = visible;

  useSeo({
    title: "Journal — wine, weddings and the Bendigo region",
    description:
      "Notes from a family vineyard in Harcourt: what granite soil does to Shiraz, what a vineyard wedding really costs, how to spend a day in the Bendigo wine region, and reports from each vintage.",
    path: "/journal",
    image: live[0]?.image,
    imageAlt: live[0]?.imageAlt,
    keywords: ["Bendigo wine region", "vineyard wedding Victoria", "Central Victorian Shiraz", "Harcourt winery"],
    jsonLd: [
      webPageSchema({
        path: "/journal",
        name: "Journal",
        description: "Articles from Harcourt Valley Vineyards on wine, weddings, events and the Bendigo wine region.",
        primaryImage: live[0]?.image,
      }),
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Journal", path: "/journal" },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        "@id": `${absUrl("/journal")}#blog`,
        name: `${SITE_NAME} Journal`,
        description: "Wine, weddings, events and the Bendigo wine region, written by the family that runs the vineyard.",
        url: absUrl("/journal"),
        inLanguage: "en-AU",
        publisher: { "@id": `${absUrl("/")}#winery` },
        blogPost: live.slice(0, 12).map((p) => ({
          "@type": "BlogPosting",
          "@id": `${absUrl(`/journal/${p.slug}`)}#article`,
          headline: p.title,
          description: p.excerpt,
          url: absUrl(`/journal/${p.slug}`),
          image: p.image,
          datePublished: p.publishedAt,
          dateModified: p.updatedAt,
          author: { "@type": "Person", name: p.author },
          keywords: p.tags.join(", "),
        })),
      },
    ],
  });

  return (
    <div>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16">
        <Reveal>
          <p className="kicker text-granite-500">The journal</p>
          <h1 className="font-display font-medium text-[2.4rem] sm:text-6xl leading-[1.03] mt-4 max-w-3xl">Notes from the valley.</h1>
          <p className="mt-5 max-w-2xl text-granite-700 leading-relaxed" data-speakable>
            What granite soil does to Shiraz, what a vineyard wedding in Victoria actually costs, how to spend a day in the Bendigo wine region, and an honest
            report after every vintage. Written by the family that grows it.
          </p>
        </Reveal>

        {categories.length > 2 ? (
          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter journal by topic">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`px-4 py-2 min-h-[42px] border-2 border-granite-900 font-label text-[0.72rem] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  category === c ? "bg-granite-900 text-bone" : "bg-bone hover:bg-granite-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {visible.length === 0 ? (
          <EmptyState title="Nothing published here yet." note="New pieces land after each vintage, and whenever we learn something worth passing on." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Reveal className="lg:col-span-7">
              <PostCard post={lead} size="lg" />
            </Reveal>
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-8 content-start">
              {rest.slice(0, 2).map((p, i) => (
                <Reveal key={p.id} delay={80 + i * 80}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
            {rest.slice(2).map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 80} className="lg:col-span-4">
                <PostCard post={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <ContourDivider />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SectionHead
          kicker="Rather taste than read"
          title={<>The cellar door is open Friday to Sunday.</>}
          lead="11am to 5pm at 41 Schoolhouse Rd, Harcourt. Tastings are $10 and waived if you take something home. Thirty minutes from Bendigo, ninety from Melbourne."
        />
      </section>
    </div>
  );
}
