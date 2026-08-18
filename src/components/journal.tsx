import React from "react";
import { Link } from "react-router-dom";
import { fmtPostDate, parseBody, type BlogPost } from "../lib/data";
import { ArrowUpRight } from "./ui";

/* ------------------------------------------------------------------ */
/*  Journal pieces shared by the home page, the index and the post.    */
/* ------------------------------------------------------------------ */

export function PostMeta({ post, className = "" }: { post: BlogPost; className?: string }) {
  return (
    <p className={`kicker text-granite-500 flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <span>{post.category}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.publishedAt}>{fmtPostDate(post.publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readMinutes} min read</span>
    </p>
  );
}

/**
 * One post as a card. `size` only changes the image height and type scale —
 * the markup stays identical so the schema and the reading order don't shift.
 */
export function PostCard({ post, size = "md" }: { post: BlogPost; size?: "md" | "lg" }) {
  const large = size === "lg";
  return (
    <article className="h-full">
      <Link
        to={`/journal/${post.slug}`}
        className="group flex flex-col h-full border-2 border-granite-900 bg-bone hover:shadow-hard transition-shadow duration-300"
      >
        <div className={`${large ? "img-frame" : "img-frame-alt"} overflow-hidden`}>
          <img
            src={post.image}
            alt={post.imageAlt}
            className={`w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${large ? "h-64 sm:h-80" : "h-48"}`}
            loading="lazy"
            decoding="async"
            width={1024}
            height={large ? 640 : 480}
          />
        </div>
        <div className={`flex flex-col flex-1 ${large ? "p-6 sm:p-8" : "p-5"}`}>
          <PostMeta post={post} />
          <h3 className={`font-display font-medium mt-2 leading-[1.12] ${large ? "text-2xl sm:text-3xl" : "text-xl"}`}>{post.title}</h3>
          <p className={`mt-2.5 text-granite-700 ${large ? "" : "text-sm"}`}>{post.excerpt}</p>
          <span className="mt-auto pt-5 inline-flex items-center gap-2 kicker text-garnet">
            Read it
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </Link>
    </article>
  );
}

/** Renders the markdown-lite body as real headings, lists and paragraphs. */
export function PostBody({ body }: { body: string }) {
  const blocks = parseBody(body);
  return (
    <div className="post-body">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h2":
            return (
              <h2 key={i} className="font-display text-2xl sm:text-3xl font-medium leading-[1.12] mt-10 mb-3">
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="font-display text-xl font-medium mt-7 mb-2">
                {b.text}
              </h3>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-ochre pl-5 my-6 font-display text-xl italic text-granite-700">
                {b.text}
              </blockquote>
            );
          case "list":
            return (
              <ul key={i} className="my-5 space-y-2.5">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-granite-700 leading-relaxed">
                    <span className="mt-2.5 w-1.5 h-1.5 bg-garnet shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          default:
            return (
              <p key={i} className="mt-4 text-granite-700 leading-relaxed">
                {b.text}
              </p>
            );
        }
      })}
    </div>
  );
}
