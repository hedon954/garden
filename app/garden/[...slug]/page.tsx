import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import {
  extractHeadings,
  findGardenDoc,
  gardenDocHref,
  gardenDocs,
} from "../../lib/content";
import { FEED_ALTERNATES } from "../../lib/page-alternates";
import { absoluteUrl, getSiteUrl } from "../../lib/site";
import { siteHref } from "../../lib/site-href";
import { ArticleMeasure } from "../../components/ArticleMeasure";
import { ArticleReferences } from "../../components/ArticleReferences";
import { ArticleTitle } from "../../components/ArticleTitle";
import { MarkdownArticle } from "../../components/MarkdownArticle";
import { TableOfContents } from "../../components/TableOfContents";
import { GardenDocsNav } from "../../components/GardenDocsNav";
import {
  COMPONENT_BADGE,
  HANDBOOK_SECTIONS,
  orderedHandbookDocs,
  toHandbookNavItems,
} from "../../lib/garden-docs-meta";
import {
  isStaticPlaceholder,
  STATIC_PLACEHOLDER,
  staticParams,
} from "../../../ui/garden/static-params.mjs";

export function generateStaticParams() {
  return staticParams(
    gardenDocs.map((doc) => ({ slug: doc.path.split("/") })),
    { slug: [STATIC_PLACEHOLDER] },
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = findGardenDoc(slug.join("/"));
  if (!doc) return {};
  const baseUrl = await getSiteUrl();
  const pathname = gardenDocHref(doc);
  return {
    title: `${doc.title} · Garden 使用说明`,
    description: doc.description,
    alternates: { canonical: pathname, types: FEED_ALTERNATES },
    openGraph: {
      type: "article",
      url: absoluteUrl(pathname, baseUrl),
      title: `${doc.title} · Garden 使用说明`,
      description: doc.description,
    },
  } satisfies Metadata;
}

export default async function GardenDocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = findGardenDoc(slug.join("/"));
  if (!doc) {
    if (isStaticPlaceholder(slug)) return null;
    notFound();
  }

  const ordered = orderedHandbookDocs(gardenDocs);
  const navItems = toHandbookNavItems(gardenDocs);
  const index = ordered.findIndex((item) => item.path === doc.path);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const headings = extractHeadings(doc.content);
  const sectionMeta = HANDBOOK_SECTIONS.find((sec) => sec.id === doc.section);
  const componentBadge = COMPONENT_BADGE[doc.path];

  return (
    <main className="column-reading-page garden-doc-page">
      <GardenDocsNav docs={navItems} currentPath={doc.path} />

      <article className="article-column garden-doc-article h-entry">
        <header className="gdoc-article-head">
          <div className="gdoc-eyebrow">
            <Link href={siteHref("/garden")} className="gdoc-eyebrow-root">
              Garden 使用说明
            </Link>
            <span aria-hidden="true">/</span>
            <span>{sectionMeta?.title ?? doc.sectionTitle ?? "指南"}</span>
            {componentBadge ? (
              <>
                <code className="gdoc-eyebrow-fence">{`garden ${componentBadge}`}</code>
              </>
            ) : null}
          </div>
          <ArticleTitle title={doc.title} />
          {doc.description ? (
            <p className="gdoc-article-deck p-summary">{doc.description}</p>
          ) : null}
        </header>

        <ArticleMeasure />

        <div className="e-content">
          <MarkdownArticle content={doc.content} />
        </div>

        <ArticleReferences references={doc.references} />

        <nav className="gdoc-pager" aria-label="说明书上下篇导航">
          {prev ? (
            <Link href={gardenDocHref(prev)} className="gdoc-pager-card is-prev">
              <span className="gdoc-pager-dir">
                <ArrowLeft size={14} aria-hidden="true" />
                上一篇
              </span>
              <strong>{prev.title}</strong>
            </Link>
          ) : (
            <Link href={siteHref("/garden")} className="gdoc-pager-card is-prev">
              <span className="gdoc-pager-dir">
                <ArrowLeft size={14} aria-hidden="true" />
                返回总览
              </span>
              <strong>Garden 使用说明首页</strong>
            </Link>
          )}
          {next ? (
            <Link href={gardenDocHref(next)} className="gdoc-pager-card is-next">
              <span className="gdoc-pager-dir">
                下一篇
                <ArrowRight size={14} aria-hidden="true" />
              </span>
              <strong>{next.title}</strong>
            </Link>
          ) : null}
        </nav>
      </article>

      <TableOfContents headings={headings} label="本页目录" />
    </main>
  );
}
