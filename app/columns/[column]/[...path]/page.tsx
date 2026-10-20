import Link from "next/link";
import { ArticlePager } from "../../../components/ArticlePager";
import { CoverImage } from "../../../components/CoverImage";
import type { Metadata } from "next";
import { FEED_ALTERNATES } from "../../../lib/page-alternates";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import {
  columns,
  extractHeadings,
  findColumnEntry,
  formatDate,
  columnHref,
  columnEntryPath,
} from "../../../lib/content";
import { ArticleMeasure } from "../../../components/ArticleMeasure";
import { ArticleReferences } from "../../../components/ArticleReferences";
import { ArticleTitle, originalUrl } from "../../../components/ArticleTitle";
import { MarkdownArticle } from "../../../components/MarkdownArticle";
import { TableOfContents } from "../../../components/TableOfContents";
import { Comments } from "../../../components/Comments";
import { Webmentions } from "../../../components/Webmentions";
import { ArticleTags } from "../../../components/ArticleTags";
import {
  absoluteUrl,
  getSiteUrl,
  webmentionApiEndpoint,
} from "../../../lib/site";
import { githubUrl, siteConfig } from "../../../site.config";
import { siteHref } from "../../../lib/site-href";
import { isStaticPlaceholder, STATIC_PLACEHOLDER, staticParams } from "../../../../ui/garden/static-params.mjs";
import { siteLang, ui } from "../../../lib/i18n";

export function generateStaticParams() {
  return staticParams(
    columns.map((entry) => ({
      column: entry.column,
      path: columnEntryPath(entry).split("/"),
    })),
    { column: STATIC_PLACEHOLDER, path: [STATIC_PLACEHOLDER] },
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ column: string; path: string[] }>;
}) {
  const { column, path } = await params;
  const entry = findColumnEntry(column, path.join("/"));
  if (!entry) return {};
  const baseUrl = await getSiteUrl();
  const pathname = columnHref(entry);
  return {
    title: entry.title.replace(/^\d+\s*·\s*/u, ""),
    description: entry.description,
    alternates: { canonical: pathname, types: FEED_ALTERNATES },
    openGraph: {
      type: "article",
      url: absoluteUrl(pathname, baseUrl),
      title: entry.title.replace(/^\d+\s*·\s*/u, ""),
      description: entry.description,
      publishedTime: new Date(entry.date).toISOString(),
      modifiedTime: entry.updated
        ? new Date(entry.updated).toISOString()
        : undefined,
      tags: entry.tags,
      images: entry.cover ? [{ url: entry.cover, alt: entry.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title.replace(/^\d+\s*·\s*/u, ""),
      description: entry.description,
      images: entry.cover ? [entry.cover] : ["/og.png"],
    },
  } satisfies Metadata;
}

export default async function ColumnEntryPage({
  params,
}: {
  params: Promise<{ column: string; path: string[] }>;
}) {
  const { column, path } = await params;
  const entry = findColumnEntry(column, path.join("/"));
  if (!entry) {
    if (isStaticPlaceholder(column)) return null;
    notFound();
  }
  const series = columns.filter((item) => item.column === column);
  const listed = [...series].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  const currentIndex = series.findIndex((item) => item.path === entry.path);
  const prev = series[currentIndex - 1] ?? null;
  const next = series[currentIndex + 1] ?? null;
  const headings = extractHeadings(entry.content, { numbering: entry.numbering });
  const baseUrl = await getSiteUrl();
  const pathname = columnHref(entry);
  const canonicalUrl = absoluteUrl(pathname, baseUrl);

  const en = siteLang === "en";

  return (
    <main className="column-reading-page">
      <aside className="series-nav">
        <Link href={siteHref("/columns")} className="back-link">
          <ArrowLeft size={15} />
          {en ? "All columns" : "所有专栏"}
        </Link>
        <p>{en ? "Column" : "主题专栏"}</p>
        <h2>{entry.columnTitle}</h2>
        <ol>
          {listed.map((item) => (
            <li key={item.path} className={item.path === entry.path ? "active" : ""}>
              <Link href={columnHref(item)}>{item.title}</Link>
            </li>
          ))}
        </ol>
        <small>{en ? `${series.length} posts · ${entry.columnStatus ?? "ongoing"}` : `${series.length} 篇 · 持续更新`}</small>
      </aside>

      <article className="article-column series-article h-entry">
        <Link className="u-url sr-only" href={pathname}>
          {entry.title} {en ? "permalink" : "永久链接"}
        </Link>
        <a
          className="p-author h-card sr-only"
          href={githubUrl}
          rel="author"
        >
          {siteConfig.author.name}
        </a>
        <header className="article-header hero">
          <ArticleTitle title={entry.title.replace(/^\d+\s*·\s*/u, "")} />
          <ul className="meta article-meta">
            <li>{siteConfig.author.name}</li>
            <li>
              <time className="dt-published" dateTime={entry.date}>
                {formatDate(entry.date)}
              </time>
            </li>
            {originalUrl(entry) ? (
              <li><a className="orig ext" href={originalUrl(entry)} target="_blank" rel="noopener noreferrer">{en ? "Original ↗" : "原文 ↗"}</a></li>
            ) : null}
          </ul>
          <ArticleTags tags={entry.tags} />
          {entry.cover && (
            <figure className="article-hero article-cover cover-img">
              <CoverImage className="u-photo" src={entry.cover} image={entry.coverImage} alt={en ? `${entry.title} cover` : `${entry.title} 封面`} sizes="(max-width: 852px) calc(100vw - 40px), 812px" priority />
            </figure>
          )}
        </header>
        <ArticleMeasure />
        <div className="e-content">
          {entry.description ? <p className="lead p-summary">{entry.description}</p> : null}
          <MarkdownArticle content={entry.content} numbering={entry.numbering} />
        </div>
        <ArticleReferences references={entry.references} />
        <Webmentions
          target={canonicalUrl}
          endpoint={webmentionApiEndpoint()}
        />
        <ArticlePager
          label={ui().columnPagerLabel}
          prev={prev ? { href: columnHref(prev), title: prev.title } : null}
          next={next ? { href: columnHref(next), title: next.title } : null}
        />
        <Comments slug={`${column}:${entry.path}`} />
      </article>

      <TableOfContents headings={headings} />
    </main>
  );
}
