"use client";

import Link from "next/link";
import { ArrowRight, Article, Books, Quotes } from "@phosphor-icons/react/ssr";
import { siteHref } from "../lib/site-href";
import { ui } from "../lib/i18n";

export function ContentEmptyState({ kind }: { kind: "posts" | "thoughts" | "columns" }) {
  const s = ui();
  const emptyContent = {
    posts: {
      icon: Article,
      eyebrow: s.emptyPostsEyebrow,
      title: s.emptyPostsTitle,
      description: s.emptyPostsDesc,
      actionHref: "/",
      actionLabel: s.emptyPostsCta,
    },
    thoughts: {
      icon: Quotes,
      eyebrow: s.emptyThoughtsEyebrow,
      title: s.emptyThoughtsTitle,
      description: s.emptyThoughtsDesc,
      actionHref: "/blog",
      actionLabel: s.emptyThoughtsCta,
    },
    columns: {
      icon: Books,
      eyebrow: s.emptyColumnsEyebrow,
      title: s.emptyColumnsTitle,
      description: s.emptyColumnsDesc,
      actionHref: "/blog",
      actionLabel: s.emptyColumnsCta,
    },
  } as const;
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
      <Link href={siteHref(content.actionHref)}>
        {content.actionLabel}
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}
