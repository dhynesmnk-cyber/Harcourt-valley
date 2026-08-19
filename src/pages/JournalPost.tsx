import React, { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { bodyToText, fmtPostDate, publishedPosts } from "../lib/data";
import { useApplyAppearance, useStore } from "../lib/store";
import { useSeo, breadcrumbSchema } from "../lib/seo";
import { BUSINESS, SITE_NAME, absUrl, fullAddress } from "../lib/site";
import { ArrowRight, ClockIcon, ContourDivider, PinIcon, Reveal } from "../components/ui";
import { PostBody, PostCard, PostMeta } from "../components/journal";

export default function JournalPost() {
  useApplyAppearance();
  const { slug } = useParams<{ slug: string }>();
  const { posts } = useStore();

  const live = useMemo(() => publishedPosts(posts), [posts]);
  const post = live.find((p) => p.slug === slug) ?? null;
  /* Same category first, then anything else — a post should never dead-end. */
  const related = useMemo(() => {
    if (!post) return [];
    const others = live.filter((p) => p.id !== post.id);
    return [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, 3);
  }, [live, post]);

  const url = `/journal/${post?.slug ?? ""}`;

  useSeo({
    title: post?.title ?? "Journal",
    description: post?.excerpt ?? "An article from Harcourt Valley Vineyards.",
    path: url,
    image: post?.image,
    imageAlt: post?.imageAlt,
    type: "article",
    noindex: !post,
    publishedTime: post?.publishedAt,
    modifiedTime: post?.updatedAt,
    keywords: post?.tags,
    jsonLd: post
      ? [
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "@id": `${absUrl(url)}#article`,
            headline: post.title,
            description: post.excerpt,
            articleSection: post.category,
            keywords: post.tags.join(", "),
            url: absUrl(url),
            mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(url) },
            image: { "@type": "ImageObject", url: post.image, caption: post.imageAlt },
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            wordCount: bodyToText(post.body).split(/\s+/).filter(Boolean).length,
            timeRequired: `PT${post.readMinutes}M`,
            inLanguage: "en-AU",
            author: { "@type": "Person", name: post.author, jobTitle: post.authorRole, worksFor: { "@id": `${absUrl("/")}#winery` } },
            publisher: { "@id": `${absUrl("/")}#winery` },
            isPartOf: { "@id": `${absUrl("/journal")}#blog` },
            about: { "@id": `${absUrl("/")}#winery` },
            speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", "[data-speakable]"] },
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal" },
            { name: post.title, path: url },
          ]),
        ]
      : [],
  });

  if (!post) return <Navigate to="/journal" replace />;

  return (
    <div>
      <article>
        {/* Header */}
        <header className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
          <nav aria-label="Breadcrumb" className="kicker text-granite-500 flex flex-wrap items-center gap-2">
            <Link to="/" className="hover:text-granite-900">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/journal" className="hover:text-granite-900">
              Journal
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-granite-700 normal-case tracking-normal font-normal truncate max-w-[16rem]">{post.category}</span>
          </nav>
          <h1 className="font-display font-medium text-[2.1rem] sm:text-5xl leading-[1.05] mt-5">{post.title}</h1>
          <p className="mt-5 text-lg text-granite-700 leading-relaxed" data-speakable>
            {post.excerpt}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-granite-900 pt-4">
            <PostMeta post={post} />
            <p className="text-sm text-granite-500 sm:ml-auto">
              {post.author} · <span className="text-granite-700">{post.authorRole}</span>
            </p>
          </div>
        </header>

        {/* The one image */}
        <figure className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
          <div className="img-frame border-2 border-granite-900 shadow-hard">
            <img
              src={post.image}
              alt={post.imageAlt}
              className="w-full h-[260px] sm:h-[440px] object-cover img-in"
              width={1600}
              height={900}
              decoding="async"
            />
          </div>
          <figcaption className="mt-3 text-xs text-granite-500">{post.imageAlt}</figcaption>
        </figure>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <PostBody body={post.body} />

          {post.tags.length > 0 ? (
            <ul className="mt-12 flex flex-wrap gap-2" aria-label="Topics">
              {post.tags.map((t) => (
                <li key={t} className="border-2 border-granite-900 bg-granite-100/60 px-3 py-1 font-label text-[0.7rem] font-semibold uppercase tracking-[0.1em]">
                  {t}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-8 text-xs text-granite-500">
            Published <time dateTime={post.publishedAt}>{fmtPostDate(post.publishedAt)}</time>
            {post.updatedAt !== post.publishedAt ? (
              <>
                {" · updated "}
                <time dateTime={post.updatedAt}>{fmtPostDate(post.updatedAt)}</time>
              </>
            ) : null}
            {" by "}
            {post.author}, {SITE_NAME}.
          </p>

          {/* Visit block — every article ends somewhere useful */}
          <aside className="mt-10 border-2 border-granite-900 bg-granite-100/50 p-6">
            <p className="kicker text-granite-500">Come and taste it</p>
            <p className="mt-2 flex items-start gap-2.5 text-sm text-granite-700">
              <PinIcon className="w-4 h-4 text-garnet shrink-0 mt-0.5" /> {fullAddress}
            </p>
            <p className="mt-1.5 flex items-start gap-2.5 text-sm text-granite-700">
              <ClockIcon className="w-4 h-4 text-garnet shrink-0 mt-0.5" /> {BUSINESS.openingHoursText}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/winery" className="btn btn-primary btn-sm">
                See the wines <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/weddings" className="btn btn-ghost btn-sm">
                Weddings here
              </Link>
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 ? (
        <>
          <ContourDivider />
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14" aria-label="More from the journal">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h2 className="font-display text-2xl sm:text-3xl font-medium">Keep reading.</h2>
              <Link to="/journal" className="kicker text-garnet hover:underline underline-offset-4">
                All of the journal
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
