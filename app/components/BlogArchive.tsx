"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { postHref, posts, topics } from "../lib/content";
import { ContentEmptyState } from "./ContentEmptyState";

export const archiveHref = (topic?: string) => {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
};

function day(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function BlogArchive() {
  const searchParams = useSearchParams();
  const requestedTopic = searchParams.get("topic") ?? "";
  const selectedTopic = topics.includes(requestedTopic) ? requestedTopic : undefined;
  const filtered = (selectedTopic ? posts.filter((post) => post.topic === selectedTopic) : posts)
    .slice()
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const years = new Map<string, typeof filtered>();
  for (const post of filtered) {
    const year = day(post.date).slice(0, 4) || "未知";
    const list = years.get(year);
    if (list) list.push(post);
    else years.set(year, [post]);
  }

  return (
    <div className="sh-listgrid">
      <div>
        {filtered.length ? [...years.entries()].map(([year, entries]) => (
          <section className="sh-year" key={year} aria-labelledby={`y-${year}`}>
            <h2 id={`y-${year}`}>{year}<span className="n">{entries.length}</span></h2>
            <ol className="sh-rows">
              {entries.map((post) => (
                <li className="sh-row" key={post.path}>
                  <time className="archive-meta" dateTime={day(post.date)}>{day(post.date).slice(5)}</time>
                  <div className="archive-copy">
                    {post.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="archive-cover" src={post.cover} alt="" />
                    ) : null}
                    <h3>
                      <Link href={postHref(post)}>{post.title}</Link>
                      {post.pinned ? <span className="pin">置顶</span> : null}
                    </h3>
                    {post.description ? <p>{post.description}</p> : null}
                  </div>
                  {post.topic ? <Link className="cat" href={archiveHref(post.topic)}>{post.topic}</Link> : null}
                </li>
              ))}
            </ol>
          </section>
        )) : <ContentEmptyState kind="posts" />}
      </div>
      <ul className="sh-filters" aria-label="按分类筛选">
        <li>
          <Link className="sh-chip" href="/blog" aria-current={selectedTopic ? undefined : "true"}>
            全部<span className="n">{posts.length}</span>
          </Link>
        </li>
        {topics.map((topic) => (
          <li key={topic}>
            <Link className="sh-chip" href={archiveHref(topic)} aria-current={selectedTopic === topic ? "true" : undefined}>
              {topic}<span className="n">{posts.filter((post) => post.topic === topic).length}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
