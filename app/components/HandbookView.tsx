import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import { siteLinks } from "@garden/site-config";
import { ArticleMeasure } from "./ArticleMeasure";
import { ArticleReferences } from "./ArticleReferences";
import { ArticleTitle } from "./ArticleTitle";
import { GardenDocsNav } from "./GardenDocsNav";
import { HandbookLangRedirect } from "./HandbookLangRedirect";
import { MarkdownArticle } from "./MarkdownArticle";
import { TableOfContents } from "./TableOfContents";
import { extractHeadings, handbookDocs, handbookIndexDoc, hasHandbookPage, type GardenDocEntry } from "../lib/content";
import { docWithBody } from "../lib/content-body";
import { getSiteUrl } from "../lib/site";
import { siteHref } from "../lib/site-href";
import {
  COMPONENT_BADGE,
  HANDBOOK_SECTIONS,
  HANDBOOK_UI,
  handbookPath,
  isReferencePath,
  orderedHandbookDocs,
  sectionTitle,
  toHandbookNavItems,
  type HandbookLang,
} from "../lib/garden-docs-meta";
import { UI_STRINGS, type UiLang } from "../lib/i18n";

const other = (lang: HandbookLang): HandbookLang => (lang === "en" ? "zh" : "en");
const hreflang = (lang: HandbookLang) => (lang === "en" ? "en" : "zh-CN");

function publicDocsUrl(origin: string, inAppPath: string): string {
  const base = (siteLinks?.basePath ?? "/garden").replace(/\/+$/u, "");
  const formatted = siteHref(inAppPath);
  const fullPath = formatted === "/" ? `${base}/` : `${base}${formatted}`;
  return `${origin.replace(/\/+$/u, "")}${fullPath}`;
}

/** canonical + hreflang links; the counterpart is listed only when it exists. */
export function handbookLanguages(lang: HandbookLang, docPath: string, origin = "") {
  if (!hasHandbookPage(other(lang), docPath)) return undefined;
  const zh = origin
    ? publicDocsUrl(origin, handbookPath("zh", docPath))
    : siteHref(handbookPath("zh", docPath));
  const en = origin
    ? publicDocsUrl(origin, handbookPath("en", docPath))
    : siteHref(handbookPath("en", docPath));
  return { "zh-CN": zh, en, "x-default": zh };
}

export async function handbookOverviewMetadata(lang: HandbookLang, indexDoc: GardenDocEntry | null | undefined) {
  const t = HANDBOOK_UI[lang];
  const origin = await getSiteUrl();
  const base = (siteLinks?.basePath ?? "/garden").replace(/\/+$/u, "");
  const canonicalUrl = publicDocsUrl(origin, handbookPath(lang, "index"));
  const description = indexDoc?.description ?? "";
  const fullTitle = indexDoc?.title ? `${indexDoc.title} · ${t.name}` : t.name;
  const languages = handbookLanguages(lang, "index", origin);
  return {
    title: { absolute: t.name },
    description,
    alternates: {
      canonical: canonicalUrl,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: fullTitle,
      description,
      locale: lang === "en" ? "en_US" : "zh_CN",
      images: [
        {
          url: `${base}/og.png`,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${base}/og.png`],
    },
  } satisfies Metadata;
}

export async function handbookDocMetadata(lang: HandbookLang, doc: GardenDocEntry | undefined) {
  const base = (siteLinks?.basePath ?? "/garden").replace(/\/+$/u, "");
  if (!doc) {
    const copy = UI_STRINGS[lang];
    const fullTitle = `${copy.notFoundTitle} · ${HANDBOOK_UI[lang].name}`;
    return {
      title: copy.notFoundTitle,
      description: copy.notFoundDeck,
      openGraph: {
        type: "website",
        title: fullTitle,
        description: copy.notFoundDeck,
        locale: lang === "en" ? "en_US" : "zh_CN",
        images: [
          {
            url: `${base}/og.png`,
            width: 1200,
            height: 630,
            alt: fullTitle,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: fullTitle,
        description: copy.notFoundDeck,
        images: [`${base}/og.png`],
      },
    } satisfies Metadata;
  }
  const t = HANDBOOK_UI[lang];
  const origin = await getSiteUrl();
  const canonicalUrl = publicDocsUrl(origin, handbookPath(lang, doc.path));
  const docTitle = `${doc.title} · ${t.name}`;
  const languages = handbookLanguages(lang, doc.path, origin);
  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: canonicalUrl,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: docTitle,
      description: doc.description,
      locale: lang === "en" ? "en_US" : "zh_CN",
      images: [
        {
          url: `${base}/og.png`,
          width: 1200,
          height: 630,
          alt: docTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: docTitle,
      description: doc.description,
      images: [`${base}/og.png`],
    },
  } satisfies Metadata;
}

export function HandbookOverview({
  lang,
  renderPlayground,
}: {
  lang: HandbookLang;
  renderPlayground?: (specJson: string, lang?: UiLang) => ReactNode;
}) {
  const t = HANDBOOK_UI[lang];
  const docs = handbookDocs(lang);
  const indexDoc = docWithBody(handbookIndexDoc(lang), lang);
  const navItems = toHandbookNavItems(docs);
  const firstDoc = orderedHandbookDocs(docs)[0] ?? null;
  const content = indexDoc?.content ?? "";
  const headings = extractHeadings(content);
  const title = indexDoc?.title || t.name;
  const subtitle = indexDoc?.description || "";

  return (
    <main className="column-reading-page garden-doc-page" lang={hreflang(lang)}>
      <HandbookLangRedirect lang={lang} />
      <GardenDocsNav docs={navItems} currentPath="" lang={lang} />

      <article className="article-column garden-doc-article h-entry">
        <header className="gdoc-article-head">
          <div className="gdoc-eyebrow">
            <span>{t.name}</span>
            <span aria-hidden="true">/</span>
            <span>{t.overview}</span>
          </div>
          <ArticleTitle title={title} />
          {subtitle ? <p className="gdoc-article-deck p-summary">{subtitle}</p> : null}
        </header>

        <ArticleMeasure />

        <div className="e-content">
          <MarkdownArticle content={content} lang={lang} fieldTables handbook renderPlayground={renderPlayground} />
        </div>

        <ArticleReferences references={indexDoc?.references} lang={lang} />

        {firstDoc ? (
          <nav className="gdoc-pager" aria-label={t.pager}>
            <Link href={siteHref(handbookPath(lang, firstDoc.path))} className="gdoc-pager-card is-next">
              <span className="gdoc-pager-dir">
                {t.next}
                <ArrowRight size={14} aria-hidden="true" />
              </span>
              <strong>{firstDoc.title}</strong>
            </Link>
          </nav>
        ) : null}
      </article>

      <TableOfContents headings={headings} label={t.toc} lang={lang} />
    </main>
  );
}

export function HandbookDoc({
  lang,
  doc,
  renderPlayground,
}: {
  lang: HandbookLang;
  doc: GardenDocEntry;
  renderPlayground?: (specJson: string, lang?: UiLang) => ReactNode;
}) {
  const t = HANDBOOK_UI[lang];
  const resolved = docWithBody(doc, lang);
  const docs = handbookDocs(lang);
  const ordered = orderedHandbookDocs(docs);
  const navItems = toHandbookNavItems(docs);
  const index = ordered.findIndex((item) => item.path === doc.path);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const headings = extractHeadings(resolved.content);
  const sectionId = doc.section === "diagrams" ? "components" : doc.section;
  const sectionMeta = HANDBOOK_SECTIONS.find((sec) => sec.id === sectionId);
  const isSectionOverview = sectionMeta?.overviewPath === doc.path;
  const isDiagramSubpage = doc.section === "diagrams" || doc.path.startsWith("components/diagrams/");
  const componentBadge = COMPONENT_BADGE[doc.path];

  return (
    <main className={`column-reading-page garden-doc-page${isReferencePath(doc.path) ? " is-reference" : ""}`} lang={hreflang(lang)}>
      <HandbookLangRedirect lang={lang} />
      <GardenDocsNav docs={navItems} currentPath={doc.path} lang={lang} />

      <article className="article-column garden-doc-article h-entry">
        <header className="gdoc-article-head">
          <div className="gdoc-eyebrow">
            <Link href={siteHref(handbookPath(lang))} className="gdoc-eyebrow-root">
              {t.name}
            </Link>
            <span aria-hidden="true">/</span>
            {sectionMeta && !isSectionOverview ? (
              <Link href={siteHref(handbookPath(lang, sectionMeta.overviewPath))} className="gdoc-eyebrow-root">
                {sectionTitle(sectionMeta, lang)}
              </Link>
            ) : (
              <span>{sectionTitle(sectionMeta, lang) ?? doc.sectionTitle ?? t.guide}</span>
            )}
            {isDiagramSubpage ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={siteHref(handbookPath(lang, "components/intelligent-ui"))} className="gdoc-eyebrow-root">
                  {lang === "en" ? "Intelligent UI" : "智能 UI"}
                </Link>
              </>
            ) : null}
            {componentBadge ? <code className="gdoc-eyebrow-fence">{`garden ${componentBadge}`}</code> : null}
          </div>
          <ArticleTitle title={doc.title} />
          {doc.description ? <p className="gdoc-article-deck p-summary">{doc.description}</p> : null}
        </header>

        <ArticleMeasure />

        <div className="e-content">
          <MarkdownArticle
            content={resolved.content}
            lang={lang}
            fieldTables
            handbook
            refDemos={isReferencePath(doc.path)}
            renderPlayground={renderPlayground}
          />
        </div>

        <ArticleReferences references={doc.references} lang={lang} />

        <nav className="gdoc-pager" aria-label={t.pager}>
          {prev ? (
            <Link href={siteHref(handbookPath(lang, prev.path))} className="gdoc-pager-card is-prev">
              <span className="gdoc-pager-dir">
                <ArrowLeft size={14} aria-hidden="true" />
                {t.prev}
              </span>
              <strong>{prev.title}</strong>
            </Link>
          ) : (
            <Link href={siteHref(handbookPath(lang))} className="gdoc-pager-card is-prev">
              <span className="gdoc-pager-dir">
                <ArrowLeft size={14} aria-hidden="true" />
                {t.backToOverview}
              </span>
              <strong>{t.overviewDocTitle}</strong>
            </Link>
          )}
          {next ? (
            <Link href={siteHref(handbookPath(lang, next.path))} className="gdoc-pager-card is-next">
              <span className="gdoc-pager-dir">
                {t.next}
                <ArrowRight size={14} aria-hidden="true" />
              </span>
              <strong>{next.title}</strong>
            </Link>
          ) : null}
        </nav>
      </article>

      <TableOfContents headings={headings} label={t.toc} lang={lang} />
    </main>
  );
}
