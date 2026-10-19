import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleMeasure } from "../../components/ArticleMeasure";
import { ArticleTitle } from "../../components/ArticleTitle";
import { MarkdownArticle } from "../../components/MarkdownArticle";
import { TableOfContents } from "../../components/TableOfContents";
import { a2WordCounts } from "@garden/generated-content";
import { demoDateLabel, demoDateTime } from "../../lib/a2-meta";
import { extractHeadings } from "../../lib/content";
import { a2Slugs, readA2Article } from "../../lib/a2-preview";
import { STATIC_PLACEHOLDER, staticParams } from "../../../ui/garden/static-params.mjs";

export function generateStaticParams() {
  return staticParams(a2Slugs().map((slug) => ({ slug })), { slug: STATIC_PLACEHOLDER });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = readA2Article(slug);
  if (!article) return { robots: { index: false, follow: false } };
  return { title: article.title, description: article.description, robots: { index: false, follow: false } };
}

export default async function A2ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = readA2Article(slug);
  if (!article) notFound();
  const headings = extractHeadings(article.content);
  const wordCount = a2WordCounts[slug] ?? 0;
  return (
    <main className="reading-page post-reading-page">
      <article className="post-article">
        <header className="article-header article-summary-row hero">
          <ArticleTitle title={article.title.replace(/（互动版）$/u, "")} />
          <ul className="meta article-meta">
            <li>Hedon</li>
            {article.date ? <li><time dateTime={demoDateTime(article.date)}>{demoDateLabel(article.date)}</time></li> : null}
            <li>约 {wordCount.toLocaleString("en-US")} 字</li>
            {article.original ? <li><a className="orig ext" href={article.original} target="_blank" rel="noopener noreferrer">原文 ↗</a></li> : null}
          </ul>
          {article.cover ? (
            <figure className="article-hero article-cover cover-card cover-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.cover} alt="" />
            </figure>
          ) : null}
        </header>
        <div className="article-reading-layout">
          <div className="article-reading-column">
            <ArticleMeasure />
            <div className="e-content">
              {article.description ? <p className="lead quote-plain">{article.description}</p> : null}
              <MarkdownArticle content={article.content} />
            </div>
          </div>
          <TableOfContents headings={headings} />
        </div>
      </article>
    </main>
  );
}
