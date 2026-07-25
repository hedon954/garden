import Link from "next/link";
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

export function generateStaticParams() {
  return columns.map((entry) => ({
    column: entry.column,
    slug: entry.slug,
  }));
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

      <article className="article-column series-article">
        <header className="article-header">
          <p className="eyebrow">
            {entry.columnTitle} · 第 {currentIndex + 1} 篇
          </p>
          <h1>{entry.title.replace(/^\d+\s*·\s*/, "")}</h1>
          <p className="article-deck">{entry.description}</p>
          <div className="article-meta">
            <time>{formatDate(entry.date)}</time>
            <span>{entry.readingTime}</span>
          </div>
        </header>
        <MarkdownArticle content={entry.content} />
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
        <Comments slug={`${column}:${slug}`} />
      </article>

      <TableOfContents headings={headings} />
    </main>
  );
}
