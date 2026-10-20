/* eslint-disable @next/next/no-img-element -- static GitHub Pages assets must keep their exact paths. */
import Link from "next/link";
import { columnHref, columns } from "../lib/content";
import { ContentEmptyState } from "../components/ContentEmptyState";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { pageAlternates } from "../lib/page-alternates";
import { columnStatusLabel, ui } from "../lib/i18n";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.columns.subtitle || siteConfig.description,
  alternates: pageAlternates("/columns"),
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

export default function ColumnsPage() {
  const t = ui();
  const grouped = Array.from(
    columns.reduce((result, entry) => {
      const existing = result.get(entry.column ?? "");
      if (existing) existing.push(entry);
      else result.set(entry.column ?? "", [entry]);
      return result;
    }, new Map<string, typeof columns>()),
  ).map(([slug, entries]) => ({
    slug,
    first: entries[0],
    entries: [...entries].sort((left, right) => Date.parse(right.date) - Date.parse(left.date)),
  }));

  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1>{siteConfig.pages.columns.title || t.homeColumns}</h1>
        {siteConfig.pages.columns.subtitle ? <p className="sh-deck">{siteConfig.pages.columns.subtitle}</p> : null}
      </div>
      {grouped.length ? grouped.map(({ slug, first, entries }) => (
        <section className="sh-series" aria-labelledby={slug} key={slug}>
          <div className="cover" style={{ background: "var(--well)" }}>
            {first.columnCover ? <img className="column-feature-cover" src={first.columnCover} alt={first.columnCoverAlt ?? t.columnCoverAlt(first.columnTitle)} /> : null}
          </div>
          <div className="body">
            <h2 id={slug}>{first.columnTitle}</h2>
            <p className="count">{t.columnReadingList(entries.length, columnStatusLabel(first.columnStatus))}</p>
            <p className="desc">{first.columnDescription ?? first.description ?? t.columnFallbackDesc}</p>
            <ol aria-label={t.columnNewestFirst(first.columnTitle)}>
              {entries.map((entry) => (
                <li key={entry.path}>
                  <Link href={columnHref(entry)}>{entry.title}</Link>
                  <time dateTime={day(entry.date)}>{day(entry.date)}</time>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )) : <ContentEmptyState kind="columns" />}
    </main>
  );
}
