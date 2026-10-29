import Link from "next/link";
import { CoverImage } from "./CoverImage";
import { ArticleMeasure } from "./ArticleMeasure";
import { ArticleReferences } from "./ArticleReferences";
import { ArticleTitle, originalUrl } from "./ArticleTitle";
import { MarkdownArticle } from "./MarkdownArticle";
import { TableOfContents } from "./TableOfContents";
import { Comments } from "./Comments";
import { Webmentions } from "./Webmentions";
import { ArticleTags } from "./ArticleTags";
import { ArticlePager } from "./ArticlePager";
import { SeriesEdgeNav, type SeriesEdgeItem } from "./SeriesEdgeNav";
import { formatDate, estimateWordCount, extractHeadings } from "../lib/content";
import { githubUrl, siteConfig } from "../site.config";
import { siteLang, ui } from "../lib/i18n";
import { webmentionApiEndpoint } from "../lib/site";
import type { ContentEntry } from "../lib/content";

export type PostReadingPagerLink = { href: string; title: string } | null;

export type PostReadingSeries = {
  columnTitle: string;
  statusLabel?: string;
  items: SeriesEdgeItem[];
};

/**
 * Shared article body for /blog/... and /columns/... .
 * Column routes only differ by mounting SeriesEdgeNav on the left.
 */
export function PostReadingView({
  post,
  pathname,
  canonicalUrl,
  title,
  commentsSlug,
  prev,
  next,
  pagerLabel,
  series,
}: {
  post: ContentEntry;
  pathname: string;
  canonicalUrl: string;
  /** Display title; defaults to post.title */
  title?: string;
  commentsSlug: string;
  prev?: PostReadingPagerLink;
  next?: PostReadingPagerLink;
  pagerLabel?: string;
  series?: PostReadingSeries;
}) {
  const displayTitle = title ?? post.title;
  const numbering = (post as ContentEntry & { numbering?: boolean }).numbering;
  const headings = extractHeadings(post.content, { numbering });
  const wordCount = estimateWordCount(post.content);
  const t = ui();

  return (
    <main className="reading-page post-reading-page">
      {series ? (
        <SeriesEdgeNav
          columnTitle={series.columnTitle}
          statusLabel={series.statusLabel}
          items={series.items}
        />
      ) : null}
      <article className="post-article h-entry">
        <Link className="u-url sr-only" href={pathname}>
          {siteLang === "en" ? t.permalinkLabel(displayTitle) : <>{displayTitle} 永久链接</>}
        </Link>
        <a className="p-author h-card sr-only" href={githubUrl} rel="author">
          {siteConfig.author.name}
        </a>
        <header className="article-header article-summary-row hero">
          <ArticleTitle title={displayTitle} />
          <ul className="meta article-meta">
            <li>{siteConfig.author.name}</li>
            <li>
              <time className="dt-published" dateTime={post.date}>
                {formatDate(post.date)}
              </time>
            </li>
            {post.updated ? (
              <li>
                {siteLang === "en" ? t.updatedOn(formatDate(post.updated)) : <>更新于 {formatDate(post.updated)}</>}
              </li>
            ) : null}
            <li>{t.wordCount(wordCount)}</li>
            {originalUrl(post) ? (
              <li>
                <a className="orig ext" href={originalUrl(post)} target="_blank" rel="noopener noreferrer">
                  {t.originalLink}
                </a>
              </li>
            ) : null}
          </ul>
          <ArticleTags tags={post.tags} />
          {post.cover ? (
            <figure className="article-hero article-cover cover-card cover-img">
              <CoverImage
                className="u-photo"
                src={post.cover}
                image={post.coverImage}
                alt={t.coverLabel(displayTitle)}
                sizes="(max-width: 852px) calc(100vw - 40px), 812px"
                priority
              />
            </figure>
          ) : null}
        </header>
        <div className="article-reading-layout">
          <div className="article-reading-column">
            <ArticleMeasure />
            <div className="e-content">
              {post.description ? <p className="lead quote-plain p-summary">{post.description}</p> : null}
              <MarkdownArticle content={post.content} numbering={numbering} />
            </div>
            <ArticleReferences references={post.references} />
            <Webmentions target={canonicalUrl} endpoint={webmentionApiEndpoint()} />
            <ArticlePager
              label={pagerLabel}
              prev={prev ?? null}
              next={next ?? null}
            />
            <Comments slug={commentsSlug} />
          </div>
          <TableOfContents headings={headings} />
        </div>
      </article>
    </main>
  );
}
