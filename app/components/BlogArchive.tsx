"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ArchivePost, ArchiveSeries } from "../lib/archive";
import {
  TAG_PARAM,
  canonicalTags,
  filterByTags,
  selectedTags,
  tagFilterHref,
  tagOptions,
  tagSummary,
  toggleTag,
  visibleTagOptions,
} from "../lib/tag-filter";
import { ContentEmptyState } from "./ContentEmptyState";

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

// Kept local: importing ../lib/content here would pull every post body into the client bundle.
const postHref = (post: Pick<ArchivePost, "path">) => `/blog/${post.path}`;
const columnIndexHref = (slug: string) => `/columns/#${slug}`;

function ColumnLabel({ column }: { column?: ArchivePost["column"] }) {
  return column ? <Link className="cat" href={columnIndexHref(column.slug)}>{column.title}</Link> : null;
}

type ArchiveData = { posts: ArchivePost[]; series: ArchiveSeries[] };

const NO_TAGS: string[] = [];

/** Reads the selected tags from the URL; needs a Suspense boundary. */
export function BlogArchive({ posts, series }: ArchiveData) {
  const router = useRouter();
  const pathname = usePathname() || "/blog";
  const searchParams = useSearchParams();
  const paramKey = searchParams.getAll(TAG_PARAM).join("\u0000");
  const selected = useMemo(() => canonicalTags(posts, selectedTags(paramKey ? paramKey.split("\u0000") : [])), [paramKey, posts]);
  // This list replaces the static fallback after scripts load, which can undo
  // the browser's jump to a #year link. Jump again once, to the same place the
  // browser would (scrollIntoView honours the page's scroll-padding).
  useEffect(() => {
    let id = "";
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);
  return <ArchiveView posts={posts} series={series} selected={selected} go={(next) => router.push(tagFilterHref(next, pathname), { scroll: false })} />;
}

/**
 * The full, unfiltered list. Rendered into the static page as the Suspense
 * fallback, so the list is there before scripts run (or without them).
 */
export function BlogArchiveFallback({ posts, series }: ArchiveData) {
  return <ArchiveView posts={posts} series={series} selected={NO_TAGS} go={(next) => window.location.assign(tagFilterHref(next))} />;
}

function ArchiveView({ posts, series, selected, go }: ArchiveData & { selected: string[]; go: (next: string[]) => void }) {
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const options = useMemo(() => tagOptions(posts, selected), [posts, selected]);
  const { shown, hidden } = visibleTagOptions(options, expanded);
  const filtered = filterByTags(posts, selected)
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
        {options.length ? (
          <div className="sh-tagfilter">
            <ul className="sh-tagchips" aria-label="按标签筛选">
              {shown.map((option) => (
                <li key={option.tag}>
                  <button
                    type="button"
                    className="sh-tagchip"
                    aria-pressed={option.selected}
                    disabled={option.disabled}
                    onClick={() => go(toggleTag(selected, option.tag))}
                  >
                    <span className="label">#{option.tag}</span>
                    <span className="n num">{option.next}</span>
                    {option.selected ? <span className="x" aria-hidden="true">×</span> : null}
                  </button>
                </li>
              ))}
              {hidden > 0 || expanded ? (
                <li>
                  <button type="button" className="sh-tagmore" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                    {expanded ? "收起" : `展开全部 ${options.length} 个标签`}
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
        <div className="sh-status">
          <span aria-live="polite">{tagSummary(selected.length, filtered.length)}</span>
          {selected.length ? <button type="button" onClick={() => go([])}>清除</button> : null}
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
                      <h3>
                        <Link href={postHref(post)}>{post.title}</Link>
                        {post.pinned ? <span className="pin">置顶</span> : null}
                      </h3>
                      {post.description ? <p>{post.description}</p> : null}
                    </div>
                    <ColumnLabel column={post.column} />
                  </li>
                ))}
              </ol>
            </section>
          )) : selected.length ? (
            <div className="sh-tagempty">
              <p>没有同时带这些标签的文章。</p>
              <div className="acts">
                {selected.length > 1 ? (
                  <button type="button" onClick={() => go(selected.slice(0, -1))}>去掉「{selected[selected.length - 1]}」</button>
                ) : null}
                <button type="button" onClick={() => go([])}>看全部文章</button>
              </div>
            </div>
          ) : <ContentEmptyState kind="posts" />}
        </div>
      </div>
      <aside className="sh-rail" aria-label="按年份跳转">
        {years.size ? <h2>按年份</h2> : null}
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
              {series.map((column) => (
                <li key={column.slug}>
                  <Link href={columnIndexHref(column.slug)}><span>{column.title}</span><span className="n num">{column.count}</span></Link>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </aside>
    </div>
  );
}
