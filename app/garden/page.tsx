import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { ArticleMeasure } from "../components/ArticleMeasure";
import { ArticleReferences } from "../components/ArticleReferences";
import { ArticleTitle } from "../components/ArticleTitle";
import { GardenDocsNav } from "../components/GardenDocsNav";
import { GardenMediaGuide } from "../components/GardenMediaGuide";
import { MarkdownArticle } from "../components/MarkdownArticle";
import { TableOfContents } from "../components/TableOfContents";
import {
  extractHeadings,
  gardenDocHref,
  gardenDocs,
  gardenIndexDoc,
} from "../lib/content";
import {
  orderedHandbookDocs,
  toHandbookNavItems,
} from "../lib/garden-docs-meta";
import { pageAlternates } from "../lib/page-alternates";
import { siteConfig } from "../site.config";

export const metadata = {
  title: "Garden 使用说明",
  description:
    "用 Markdown 写文章、随想与专栏。自动处理标题断行、宽图宽表展开、代码对比与 9 个内置组件。",
  alternates: pageAlternates("/garden"),
};

export default function GardenPage() {
  const navItems = toHandbookNavItems(gardenDocs);
  const ordered = orderedHandbookDocs(gardenDocs);
  const firstDoc = ordered[0] ?? null;
  const content = gardenIndexDoc?.content ?? "";
  const headings = extractHeadings(content);
  const configuredTitle = siteConfig.pages.garden.title?.trim() || gardenIndexDoc?.title || "Garden 使用说明";
  const configuredSubtitle = siteConfig.pages.garden.subtitle?.trim() || gardenIndexDoc?.description || "";
  void GardenMediaGuide;

  return (
    <main className="column-reading-page garden-doc-page">
      <GardenDocsNav docs={navItems} currentPath="" />

      <article className="article-column garden-doc-article h-entry">
        <header className="gdoc-article-head">
          <div className="gdoc-eyebrow">
            <span>Garden 使用说明</span>
            <span aria-hidden="true">/</span>
            <span>总览</span>
          </div>
          <ArticleTitle title={configuredTitle} />
          {configuredSubtitle ? (
            <p className="gdoc-article-deck p-summary">{configuredSubtitle}</p>
          ) : null}
        </header>

        <ArticleMeasure />

        <div className="e-content">
          <MarkdownArticle content={content} />
        </div>

        <ArticleReferences references={gardenIndexDoc?.references} />

        {firstDoc ? (
          <nav className="gdoc-pager" aria-label="说明书上下篇导航">
            <Link href={gardenDocHref(firstDoc)} className="gdoc-pager-card is-next">
              <span className="gdoc-pager-dir">
                下一篇
                <ArrowRight size={14} aria-hidden="true" />
              </span>
              <strong>{firstDoc.title}</strong>
            </Link>
          </nav>
        ) : null}
      </article>

      <TableOfContents headings={headings} label="本页目录" />
    </main>
  );
}
