import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { columns } from "../lib/content";
import { PageIntro } from "../components/PageIntro";
import { siteConfig } from "../site.config";

export const metadata = {
  title: siteConfig.pages.columns.title,
  description: siteConfig.pages.columns.subtitle,
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

      <div className="column-feature-list">
        {grouped.map(({ slug, entries, first }, index) => (
          <Link
            href={`/columns/${slug}/${first.slug}`}
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
              <span>主题专栏</span>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <small>{slug.replaceAll("-", " ").toUpperCase()}</small>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
