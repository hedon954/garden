"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { columns, postHref, posts, topics } from "../lib/content";
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
  const [compact, setCompact] = useState(false);
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

  const series = Array.from(
    columns.reduce((result, entry) => {
      const key = entry.column ?? "";
      const list = result.get(key);
      if (list) list.push(entry);
      else result.set(key, [entry]);
      return result;
    }, new Map<string, typeof columns>()),
  );

  return (
    <div className="sh-listgrid">
      <div>
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
        <div className="sh-status">
          <span aria-live="polite">{selectedTopic ? `${selectedTopic} ${filtered.length} 篇` : `全部 ${posts.length} 篇`}</span>
          {selectedTopic ? <Link href="/blog">清除筛选</Link> : null}
          <div className="sh-view" role="group" aria-label="列表密度">
            <button type="button" aria-pressed={!compact} onClick={() => setCompact(false)}>摘要</button>
            <button type="button" aria-pressed={compact} onClick={() => setCompact(true)}>紧凑</button>
          </div>
        </div>
        <div id="sh-list" className={compact ? "is-compact" : undefined}>
          {filtered.length ? [...years.entries()].map(([year, entries]) => (
            <section className="sh-year" id={`y${year}`} key={year} aria-labelledby={`yh${year}`}>
              <h2 id={`yh${year}`}>{year}<span className="n">{entries.length} 篇</span></h2>
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
      </div>
      <aside className="sh-rail" aria-label="按年份跳转">
        <h2>按年份</h2>
        <ol>
          {[...years.keys()].map((year) => (
            <li key={year}>
              <a href={`#y${year}`}><span>{year}</span><span className="n num">{years.get(year)?.length ?? 0}</span></a>
            </li>
          ))}
        </ol>
        {series.length ? (
          <>
            <h2>专栏</h2>
            <ol>
              {series.map(([slug, entries]) => (
                <li key={slug}>
                  <Link href={`/columns#${slug}`}><span>{entries[0]?.columnTitle ?? slug}</span><span className="n num">{entries.length}</span></Link>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </aside>
    </div>
  );
}
