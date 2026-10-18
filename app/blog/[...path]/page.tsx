import Link from "next/link";
import { CoverImage } from "../../components/CoverImage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  extractHeadings,
  estimateWordCount,
  findPost,
  formatDate,
  postHref,
  posts,
} from "../../lib/content";
import { ArticleMeasure } from "../../components/ArticleMeasure";
import { ArticleReferences } from "../../components/ArticleReferences";
import { ArticleTitle, originalUrl } from "../../components/ArticleTitle";
import { MarkdownArticle } from "../../components/MarkdownArticle";
import { TableOfContents } from "../../components/TableOfContents";
import { Comments } from "../../components/Comments";
import { Webmentions } from "../../components/Webmentions";
import { ArticleTags } from "../../components/ArticleTags";
import {
  absoluteUrl,
  getSiteUrl,
  webmentionApiEndpoint,
} from "../../lib/site";
import { githubUrl, siteConfig } from "../../site.config";

export function generateStaticParams() {
  return posts.map((post) => ({ path: post.path.split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const post = findPost(path.join("/"));
  if (!post) return {};
  const baseUrl = await getSiteUrl();
  const pathname = postHref(post);
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: pathname },
    openGraph: {
      type: "article",
      url: absoluteUrl(pathname, baseUrl),
      title: post.title,
      description: post.description,
      publishedTime: new Date(post.date).toISOString(),
      modifiedTime: post.updated
        ? new Date(post.updated).toISOString()
        : undefined,
      tags: post.tags,
      images: post.cover ? [{ url: post.cover, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.cover ? [post.cover] : ["/og.png"],
    },
  } satisfies Metadata;
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const post = findPost(path.join("/"));
  if (!post) notFound();
  const headings = extractHeadings(post.content);
  const baseUrl = await getSiteUrl();
  const pathname = postHref(post);
  const canonicalUrl = absoluteUrl(pathname, baseUrl);
  const wordCount = estimateWordCount(post.content);

  return (
    <main className="reading-page post-reading-page">
      <article className="post-article h-entry">
        <Link className="u-url sr-only" href={pathname}>
          {post.title} 永久链接
        </Link>
        <a
          className="p-author h-card sr-only"
          href={githubUrl}
          rel="author"
        >
          {siteConfig.author.name}
        </a>
        <header className="article-header article-summary-row hero">
          <ArticleTitle title={post.title} />
          <ul className="meta article-meta">
            <li>{siteConfig.author.name}</li>
            <li>
              <time className="dt-published" dateTime={post.date}>
                {formatDate(post.date)}
              </time>
            </li>
            {post.updated ? <li>更新于 {formatDate(post.updated)}</li> : null}
            <li>约 {wordCount.toLocaleString("en-US")} 字</li>
            {originalUrl(post) ? (
              <li>
                <a className="orig ext" href={originalUrl(post)} target="_blank" rel="noopener noreferrer">原文 ↗</a>
              </li>
            ) : null}
          </ul>
          <ArticleTags tags={post.tags} />
          {post.cover && (
            <figure className="article-hero article-cover cover-card cover-img">
              <CoverImage className="u-photo" src={post.cover} image={post.coverImage} alt={`${post.title} 封面`} sizes="(max-width: 852px) calc(100vw - 40px), 812px" priority />
            </figure>
          )}
        </header>
        <div className="article-reading-layout">
          <div className="article-reading-column">
            <ArticleMeasure />
            <div className="e-content">
              {post.description ? <p className="lead quote-plain p-summary">{post.description}</p> : null}
              <MarkdownArticle content={post.content} />
            </div>
            <ArticleReferences references={post.references} />
            <Webmentions
              target={canonicalUrl}
              endpoint={webmentionApiEndpoint()}
            />
            <Comments slug={post.path} />
          </div>
          <TableOfContents headings={headings} />
        </div>
      </article>
    </main>
  );
}
