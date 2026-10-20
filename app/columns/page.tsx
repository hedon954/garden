/* eslint-disable @next/next/no-img-element -- static GitHub Pages assets must keep their exact paths. */
import Link from "next/link";
import { columnHref, columns } from "../lib/content";
import { ContentEmptyState } from "../components/ContentEmptyState";
import { siteConfig, siteDocumentTitle } from "../site.config";
import { pageAlternates } from "../lib/page-alternates";
import { siteLang } from "../lib/i18n";

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

  const en = siteLang === "en";

  return (
    <main className="sh-main" id="content">
      <div className="sh-head">
        <h1>{siteConfig.pages.columns.title || (en ? "Columns" : "专栏")}</h1>
        {siteConfig.pages.columns.subtitle ? <p className="sh-deck">{siteConfig.pages.columns.subtitle}</p> : null}
      </div>
      {grouped.length ? grouped.map(({ slug, first, entries }) => (
        <section className="sh-series" aria-labelledby={slug} key={slug}>
          <div className="cover" style={{ background: "var(--well)" }}>
            {first.columnCover ? <img className="column-feature-cover" src={first.columnCover} alt={first.columnCoverAlt ?? `${first.columnTitle} ${en ? "cover" : "封面"}`} /> : null}
          </div>
          <div className="body">
            <h2 id={slug}>{first.columnTitle}</h2>
            <p className="count">{en ? `Reading list · ${entries.length} posts · ${first.columnStatus ?? "ongoing"}` : `阅读清单，${entries.length} 篇，${first.columnStatus ?? "持续更新"}`}</p>
            <p className="desc">{first.columnDescription ?? first.description ?? (en ? "A series of posts arranged in reading order." : "按顺序组织的专题文章系列。")}</p>
            <ol aria-label={en ? `${first.columnTitle}, newest first` : `${first.columnTitle}，从新到旧`}>
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
