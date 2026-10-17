"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
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

function joinTags(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join("、")}和${names[names.length - 1]}`;
}

export function TagIndex({ posts }: { posts: ContentEntry[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh"));
  }, [posts]);
  const requested = params.get("t") ?? "";
  const active = tags.some(([tag]) => tag === requested) ? requested : "";
  const common = tags.filter(([, count]) => count > 1);
  const once = tags.filter(([, count]) => count === 1);
  const visible = posts
    .filter((post) => active && (post.tags ?? []).includes(active))
    .slice()
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const choose = (tag: string) => {
    const next = active === tag ? "" : tag;
    router.replace(next ? `${pathname}?t=${encodeURIComponent(next)}` : pathname, { scroll: false });
  };

  return (
    <div className="sh-listgrid" id="sh-tags">
      <div>
        <ul className="sh-tagcloud" aria-label="常用标签">
          {common.map(([tag, count]) => (
            <li key={tag}>
              <button type="button" className="sh-chip" data-tag={tag} aria-pressed={active === tag} onClick={() => choose(tag)}>
                {tag}<span className="n">{count}</span>
              </button>
            </li>
          ))}
        </ul>
        {once.length ? (
          <details className="sh-once" open={once.some(([tag]) => tag === active) || undefined}>
            <summary>只出现一次的标签<span className="num">{once.length}</span><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 5.5 7 9l3.5-3.5" /></svg></summary>
            <ul className="sh-tagcloud">
              {once.map(([tag]) => (
                <li key={tag}>
                  <button type="button" className="sh-chip" data-tag={tag} aria-pressed={active === tag} onClick={() => choose(tag)}>
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <section className="sh-tagresult" id="sh-tagresult" aria-live="polite">
          <h2 id="sh-tag-h">{active ? `“${active}”的 ${visible.length} 篇文章` : "选择一个标签"}</h2>
          <p className="hint" hidden={Boolean(active)}>
            {common.length ? `还没有选择标签。常用的有 ${joinTags(common.slice(0, 4).map(([tag]) => tag))}。` : "还没有选择标签。"}
          </p>
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
        </section>
      </div>
      <aside className="sh-rail" aria-label="说明">
        <h2>标签与分类</h2>
        <p>分类回答“这篇属于哪一块”，每篇一个；标签回答“提到了什么”，每篇可以有多个。</p>
      </aside>
    </div>
  );
}
