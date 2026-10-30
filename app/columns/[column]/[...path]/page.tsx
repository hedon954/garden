import type { Metadata } from "next";
import { FEED_ALTERNATES } from "../../../lib/page-alternates";
import { notFound } from "next/navigation";
import {
  columns,
  findColumnEntry,
  columnHref,
  columnEntryPath,
} from "../../../lib/content";
import { PostReadingView } from "../../../components/PostReadingView";
import {
  absoluteUrl,
  getSiteUrl,
} from "../../../lib/site";
import { isStaticPlaceholder, STATIC_PLACEHOLDER, staticParams } from "../../../../ui/garden/static-params.mjs";
import { columnStatusLabel, ui } from "../../../lib/i18n";

const stripColumnIndex = (title: string) => title.replace(/^\d+\s*·\s*/u, "");

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
  const title = stripColumnIndex(entry.title);
  return {
    title,
    description: entry.description,
    alternates: { canonical: pathname, types: FEED_ALTERNATES },
    openGraph: {
      type: "article",
      url: absoluteUrl(pathname, baseUrl),
      title,
      description: entry.description,
      publishedTime: new Date(entry.date).toISOString(),
      modifiedTime: entry.updated
        ? new Date(entry.updated).toISOString()
        : undefined,
      tags: entry.tags,
      images: entry.cover ? [{ url: entry.cover, alt: entry.title }] : undefined,
    },
    twitter: {
      card: entry.cover ? "summary_large_image" : "summary",
      title,
      description: entry.description,
      images: entry.cover ? [entry.cover] : undefined,
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
  const baseUrl = await getSiteUrl();
  const pathname = columnHref(entry);
  const canonicalUrl = absoluteUrl(pathname, baseUrl);
  const t = ui();
  const displayTitle = stripColumnIndex(entry.title);

  return (
    <PostReadingView
      post={entry}
      pathname={pathname}
      canonicalUrl={canonicalUrl}
      title={displayTitle}
      commentsSlug={`${column}:${entry.path}`}
      pagerLabel={t.columnPagerLabel}
      prev={prev ? { href: columnHref(prev), title: stripColumnIndex(prev.title) } : null}
      next={next ? { href: columnHref(next), title: stripColumnIndex(next.title) } : null}
      series={{
        columnTitle: entry.columnTitle ?? column,
        statusLabel: t.columnSideCount(series.length, columnStatusLabel(entry.columnStatus)),
        items: listed.map((item) => ({
          path: item.path,
          href: columnHref(item),
          title: stripColumnIndex(item.title),
          current: item.path === entry.path,
        })),
      }}
    />
  );
}
