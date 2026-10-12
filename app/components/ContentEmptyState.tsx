"use client";

import Link from "next/link";
import { ArrowRight, Article, Books, Quotes } from "@phosphor-icons/react/ssr";

const emptyContent = {
  posts: {
    icon: Article,
    eyebrow: "NO POSTS YET / 暂无博文",
    title: "暂无博文。",
    description: "发布文章后会在这里按主题与时间归档。",
    actionHref: "/",
    actionLabel: "返回首页",
  },
  thoughts: {
    icon: Quotes,
    eyebrow: "NO THOUGHTS YET / 暂无随想",
    title: "暂无随想。",
    description: "日常的碎片记录、短笔记与链接会落在这里。",
    actionHref: "/blog",
    actionLabel: "先读博文",
  },
  columns: {
    icon: Books,
    eyebrow: "NO COLUMNS YET / 暂无专栏",
    title: "暂无专栏。",
    description: "文章积累成系列后会在这里按顺序呈现。",
    actionHref: "/blog",
    actionLabel: "浏览全部博文",
  },
} as const;

export function ContentEmptyState({ kind }: { kind: keyof typeof emptyContent }) {
  const content = emptyContent[kind];
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
      <Link href={content.actionHref}>
        {content.actionLabel}
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}
