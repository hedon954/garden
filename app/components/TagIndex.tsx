"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { postHref, type ContentEntry } from "../lib/content";

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

export function TagIndex({ posts }: { posts: ContentEntry[] }) {
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh"));
  }, [posts]);
  const [selected, setSelected] = useState<string | null>(null);
  const visible = posts
    .filter((post) => !selected || (post.tags ?? []).includes(selected))
    .slice()
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));

  return (
    <>
      <ul className="sh-tagcloud" aria-label="标签">
        <li>
          <button type="button" className="sh-chip" aria-pressed={selected === null} onClick={() => setSelected(null)}>
            全部<span className="n">{posts.length}</span>
          </button>
        </li>
        {tags.map(([tag, count]) => (
          <li key={tag}>
            <button type="button" className="sh-chip" data-tag={tag} aria-pressed={selected === tag} onClick={() => setSelected(tag)}>
              {tag}<span className="n">{count}</span>
            </button>
          </li>
        ))}
      </ul>
      <ol className="sh-rows">
        {visible.map((post) => (
          <li className="sh-row" key={post.path}>
            <time className="num" dateTime={day(post.date)}>{day(post.date)}</time>
            <h3><Link href={postHref(post)}>{post.title}</Link></h3>
            {post.description ? <p>{post.description}</p> : null}
            {post.topic ? <span className="cat">{post.topic}</span> : null}
          </li>
        ))}
      </ol>
      <p className="sh-colnote">专栏在 <Link href="/columns">专栏</Link>，不出现在分类里。</p>
    </>
  );
}
