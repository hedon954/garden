"use client";

import Link from "next/link";
import { ArrowRight, Article, Books, Quotes } from "@phosphor-icons/react/ssr";
import { siteHref } from "../lib/site-href";
import { siteLang } from "../lib/i18n";

const emptyContent = {
  posts: {
    icon: Article,
    eyebrow: "暂无博文",
    title: "暂无博文。",
    description: "文章会按时间排在这里。",
    actionHref: "/",
    actionLabel: "返回首页",
  },
  thoughts: {
    icon: Quotes,
    eyebrow: "暂无随想",
    title: "暂无随想。",
    description: "短笔记和链接会在这里。",
    actionHref: "/blog",
    actionLabel: "先读博文",
  },
  columns: {
    icon: Books,
    eyebrow: "暂无专栏",
    title: "暂无专栏。",
    description: "一组文章会按顺序列在这里。",
    actionHref: "/blog",
    actionLabel: "浏览全部博文",
  },
} as const;

const emptyContentEn = {
  posts: {
    icon: Article,
    eyebrow: "No posts yet",
    title: "No posts yet.",
    description: "Published posts will appear here in chronological order.",
    actionHref: "/",
    actionLabel: "Back to home",
  },
  thoughts: {
    icon: Quotes,
    eyebrow: "No thoughts yet",
    title: "No thoughts yet.",
    description: "Short notes and links will appear here.",
    actionHref: "/blog",
    actionLabel: "Read posts",
  },
  columns: {
    icon: Books,
    eyebrow: "No columns yet",
    title: "No columns yet.",
    description: "Series of related posts will be listed here in reading order.",
    actionHref: "/blog",
    actionLabel: "Browse posts",
  },
} as const;

export function ContentEmptyState({ kind }: { kind: keyof typeof emptyContent }) {
  const content = (siteLang === "en" ? emptyContentEn : emptyContent)[kind];
  const Icon = content.icon;

  return (
    <section className="content-empty-state" aria-labelledby={`${kind}-empty-title`}>
      <div className="content-empty-mark" aria-hidden="true">
        <Icon size={30} weight="light" />
      </div>
      <div>
        <p className="eyebrow">{content.eyebrow}</p>
        <h2 id={`${kind}-empty-title`}>{content.title}</h2>
        <p>{content.description}</p>
      </div>
      <Link href={siteHref(content.actionHref)}>
        {content.actionLabel}
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}
