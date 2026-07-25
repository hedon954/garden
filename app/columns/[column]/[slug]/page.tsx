import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import {
  columns,
  extractHeadings,
  findColumnEntry,
  formatDate,
} from "../../../lib/content";
import { MarkdownArticle } from "../../../components/MarkdownArticle";
import { TableOfContents } from "../../../components/TableOfContents";
import { Comments } from "../../../components/Comments";
import { Webmentions } from "../../../components/Webmentions";
import {
  absoluteUrl,
  getSiteUrl,
  webmentionApiEndpoint,
} from "../../../lib/site";

export function generateStaticParams() {
  return columns.map((entry) => ({
    column: entry.column,
    slug: entry.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ column: string; slug: string }>;
}) {
  const { column, slug } = await params;
  const entry = findColumnEntry(column, slug);
  if (!entry) return {};
  const baseUrl = await getSiteUrl();
  const pathname = `/columns/${column}/${slug}`;
  return {
    title: entry.title.replace(/^\d+\s*·\s*/u, ""),
    description: entry.description,
    alternates: { canonical: pathname },
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
      images: entry.cover ? [{ url: entry.cover, alt: entry.coverAlt }] : undefined,
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
  params: Promise<{ column: string; slug: string }>;
}) {
  const { column, slug } = await params;
  const entry = findColumnEntry(column, slug);
  if (!entry) notFound();
  const series = columns.filter((item) => item.column === column);
  const currentIndex = series.findIndex((item) => item.slug === slug);
  const next = series[currentIndex + 1];
  const headings = extractHeadings(entry.content);
  const baseUrl = await getSiteUrl();
  const pathname = `/columns/${column}/${slug}`;
  const canonicalUrl = absoluteUrl(pathname, baseUrl);

  return (
    <main className="column-reading-page">
      <aside className="series-nav">
        <Link href="/columns" className="back-link">
          <ArrowLeft size={15} />
          所有专栏
        </Link>
        <p>主题专栏</p>
        <h2>{entry.columnTitle}</h2>
        <ol>
          {series.map((item) => (
            <li key={item.slug} className={item.slug === slug ? "active" : ""}>
              <Link href={`/columns/${column}/${item.slug}`}>{item.title}</Link>
            </li>
          ))}
        </ol>
        <small>{series.length} 篇 · 持续更新</small>
      </aside>

      <article className="article-column series-article h-entry">
        <Link className="u-url sr-only" href={pathname}>
          {entry.title} 永久链接
        </Link>
        <a
          className="p-author h-card sr-only"
          href="https://github.com/hedon954"
          rel="author"
        >
          Hedon
        </a>
        <header className="article-header">
          <p className="eyebrow">
            {entry.columnTitle} · 第 {currentIndex + 1} 篇
          </p>
          <h1 className="p-name">
            {entry.title.replace(/^\d+\s*·\s*/u, "")}
          </h1>
          <p className="article-deck p-summary">{entry.description}</p>
          <div className="article-meta">
            <time className="dt-published" dateTime={entry.date}>
              {formatDate(entry.date)}
            </time>
            <span>{entry.readingTime}</span>
          </div>
        </header>
        <div className="e-content">
          <MarkdownArticle content={entry.content} />
        </div>
        {next && (
          <Link
            href={`/columns/${column}/${next.slug}`}
            className="next-entry"
          >
            <span>下一篇</span>
            <strong>{next.title}</strong>
            <ArrowRight size={20} />
          </Link>
        )}
        <Webmentions
          target={canonicalUrl}
          endpoint={webmentionApiEndpoint()}
        />
        <Comments slug={`${column}:${slug}`} />
      </article>

      <TableOfContents headings={headings} />
    </main>
  );
}
