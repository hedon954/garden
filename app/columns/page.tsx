/* eslint-disable @next/next/no-img-element -- static GitHub Pages assets must keep their exact paths. */
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { columnHref, columns } from "../lib/content";
import { PageIntro } from "../components/PageIntro";
import { ContentEmptyState } from "../components/ContentEmptyState";
import { siteConfig, siteDocumentTitle } from "../site.config";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.pages.columns.subtitle || siteConfig.description,
};

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
    entries,
    first: entries[0],
  }));

  return (
    <main className="page-shell index-page">
      <PageIntro
        eyebrow="COLUMNS / 专栏"
        title={siteConfig.pages.columns.title}
        subtitle={siteConfig.pages.columns.subtitle}
      />

      {grouped.length > 0 ? <div className="column-feature-list">
        {grouped.map(({ slug, entries, first }, index) => {
          const cover = first.columnCover
            ? { src: first.columnCover, alt: first.columnCoverAlt ?? `${first.columnTitle} 专栏封面` }
            : undefined;
          return (
            <Link
              href={columnHref(first)}
              className="column-feature"
              key={slug}
            >
              <div className="column-feature-copy">
                <span>
                  {first.columnStatus ?? "持续更新"} · {entries.length} 篇 ·{" "}
                  {first.topic ?? "主题写作"}
                </span>
                <h2>{first.columnTitle}</h2>
                <p>
                  {first.columnDescription ??
                    first.description ??
                    "沿着一条清晰的阅读路径，把一个主题持续写深。"}
                </p>
                <strong>
                  从第一篇开始
                  <ArrowRight size={17} />
                </strong>
              </div>
              <div className="column-feature-index">
                {cover && (
                  <img className="column-feature-cover" src={cover.src} alt={cover.alt} />
                )}
                <div className="column-feature-index-label">
                  <span>主题专栏</span>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <small>{slug.replaceAll("-", " ").toUpperCase()}</small>
                </div>
              </div>
            </Link>
          );
        })}
      </div> : <ContentEmptyState kind="columns" />}
    </main>
  );
}
