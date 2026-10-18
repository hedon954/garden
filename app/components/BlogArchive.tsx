"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { columnIndexHref, columnOfPost, columns, postHref, posts } from "../lib/content";
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

function ColumnLabel({ path }: { path: string }) {
  const column = columnOfPost({ path });
  return column ? <Link className="cat" href={columnIndexHref(column.slug)}>{column.title}</Link> : null;
}

const NO_TAGS: string[] = [];

/** Reads the selected tags from the URL; needs a Suspense boundary. */
export function BlogArchive() {
  const router = useRouter();
  const pathname = usePathname() || "/blog";
  const searchParams = useSearchParams();
  const paramKey = searchParams.getAll(TAG_PARAM).join("\u0000");
  const selected = useMemo(() => canonicalTags(posts, selectedTags(paramKey ? paramKey.split("\u0000") : [])), [paramKey]);
  return <ArchiveView selected={selected} go={(next) => router.push(tagFilterHref(next, pathname), { scroll: false })} />;
}

/**
 * The full, unfiltered list. Rendered into the static page as the Suspense
 * fallback, so the list is there before scripts run (or without them).
 */
export function BlogArchiveFallback() {
  return <ArchiveView selected={NO_TAGS} go={(next) => window.location.assign(tagFilterHref(next))} />;
}

function ArchiveView({ selected, go }: { selected: string[]; go: (next: string[]) => void }) {
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const options = useMemo(() => tagOptions(posts, selected), [selected]);
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
                    <ColumnLabel path={post.path} />
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
              {series.map(([slug, entries]) => (
                <li key={slug}>
                  <Link href={columnIndexHref(slug)}><span>{entries[0]?.columnTitle ?? slug}</span><span className="n num">{entries.length}</span></Link>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </aside>
    </div>
  );
}
