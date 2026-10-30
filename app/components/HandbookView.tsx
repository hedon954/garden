import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import { ArticleMeasure } from "./ArticleMeasure";
import { ArticleReferences } from "./ArticleReferences";
import { ArticleTitle } from "./ArticleTitle";
import { GardenDocsNav } from "./GardenDocsNav";
import { HandbookLangRedirect } from "./HandbookLangRedirect";
import { MarkdownArticle } from "./MarkdownArticle";
import { TableOfContents } from "./TableOfContents";
import { extractHeadings, handbookDocs, handbookIndexDoc, hasHandbookPage, type GardenDocEntry } from "../lib/content";
import { pageAlternates } from "../lib/page-alternates";
import { absoluteUrl, getSiteUrl } from "../lib/site";
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
import { UI_STRINGS, siteLang } from "../lib/i18n";
import { siteConfig } from "../site.config";

const other = (lang: HandbookLang): HandbookLang => (lang === "en" ? "zh" : "en");
const hreflang = (lang: HandbookLang) => (lang === "en" ? "en" : "zh-CN");

/** canonical + hreflang links; the counterpart is listed only when it exists. */
export function handbookLanguages(lang: HandbookLang, docPath: string) {
  if (siteLang === "en") return undefined;
  if (!hasHandbookPage(other(lang), docPath)) return undefined;
  const zh = siteHref(handbookPath("zh", docPath));
  const en = siteHref(handbookPath("en", docPath));
  return { "zh-CN": zh, en, "x-default": zh };
}

export const handbookAlternates = (lang: HandbookLang, docPath: string) =>
  pageAlternates(handbookPath(lang, docPath), handbookLanguages(lang, docPath));

export async function handbookOverviewMetadata(lang: HandbookLang, indexDoc: GardenDocEntry | null | undefined) {
  const t = HANDBOOK_UI[lang];
  const baseUrl = await getSiteUrl();
  const pathname = siteHref(handbookPath(lang, "index"));
  const description = indexDoc?.description ?? "";
  const fullTitle = `${t.name} · ${siteConfig.name}`;
  const imageAlt =
    lang === "en"
      ? `${siteConfig.name} · ${indexDoc?.title || t.name}`
      : `${siteConfig.name} · ${siteConfig.pages.home.title.replace("\n", "")}`;
  return {
    title: t.name,
    description,
    alternates: pageAlternates(handbookPath(lang), handbookLanguages(lang, "index")),
    openGraph: {
      type: "website",
      url: absoluteUrl(pathname, baseUrl),
      title: fullTitle,
      description,
      locale: lang === "en" ? "en_US" : "zh_CN",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/og.png"],
    },
  } satisfies Metadata;
}

export async function handbookDocMetadata(lang: HandbookLang, doc: GardenDocEntry | undefined) {
  if (!doc) {
    const copy = UI_STRINGS[lang];
    const fullTitle = `${copy.notFoundTitle} · ${siteConfig.name}`;
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
            url: "/og.png",
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
        images: ["/og.png"],
      },
    } satisfies Metadata;
  }
  const t = HANDBOOK_UI[lang];
  const baseUrl = await getSiteUrl();
  const pathname = siteHref(handbookPath(lang, doc.path));
  const docTitle = `${doc.title} · ${t.name}`;
  return {
    title: docTitle,
    description: doc.description,
    alternates: handbookAlternates(lang, doc.path),
    openGraph: {
      type: "article",
      url: absoluteUrl(pathname, baseUrl),
      title: docTitle,
      description: doc.description,
      locale: lang === "en" ? "en_US" : "zh_CN",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} · ${docTitle}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: docTitle,
      description: doc.description,
      images: ["/og.png"],
    },
  } satisfies Metadata;
}

export function HandbookOverview({ lang }: { lang: HandbookLang }) {
  const t = HANDBOOK_UI[lang];
  const docs = handbookDocs(lang);
  const indexDoc = handbookIndexDoc(lang);
  const navItems = toHandbookNavItems(docs);
  const firstDoc = orderedHandbookDocs(docs)[0] ?? null;
  const content = indexDoc?.content ?? "";
  const headings = extractHeadings(content);
  // The site config title/subtitle is written in the site's own language.
  const configured = lang === siteLang ? siteConfig.pages.garden : { title: "", subtitle: "" };
  const title = configured.title?.trim() || indexDoc?.title || t.name;
  const subtitle = configured.subtitle?.trim() || indexDoc?.description || "";

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
          <MarkdownArticle content={content} lang={lang} fieldTables handbook />
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

export function HandbookDoc({ lang, doc }: { lang: HandbookLang; doc: GardenDocEntry }) {
  const t = HANDBOOK_UI[lang];
  const docs = handbookDocs(lang);
  const ordered = orderedHandbookDocs(docs);
  const navItems = toHandbookNavItems(docs);
  const index = ordered.findIndex((item) => item.path === doc.path);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const headings = extractHeadings(doc.content);
  const sectionMeta = HANDBOOK_SECTIONS.find((sec) => sec.id === doc.section);
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
            <span>{sectionTitle(sectionMeta, lang) ?? doc.sectionTitle ?? t.guide}</span>
            {componentBadge ? <code className="gdoc-eyebrow-fence">{`garden ${componentBadge}`}</code> : null}
          </div>
          <ArticleTitle title={doc.title} />
          {doc.description ? <p className="gdoc-article-deck p-summary">{doc.description}</p> : null}
        </header>

        <ArticleMeasure />

        <div className="e-content">
          <MarkdownArticle content={doc.content} lang={lang} fieldTables handbook refDemos={isReferencePath(doc.path)} />
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
