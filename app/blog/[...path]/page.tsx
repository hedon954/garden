import Link from "next/link";
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
import { MarkdownArticle } from "../../components/MarkdownArticle";
import { TableOfContents } from "../../components/TableOfContents";
import { Comments } from "../../components/Comments";
import { Webmentions } from "../../components/Webmentions";
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
      images: post.cover ? [{ url: post.cover, alt: post.coverAlt }] : undefined,
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
        {post.cover && (
          <figure className="article-hero article-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="u-photo"
              src={post.cover}
              alt={post.coverAlt ?? `${post.title} 封面`}
            />
          </figure>
        )}
        <header className="article-header article-summary-row">
          <p className="eyebrow">{post.topic}</p>
          <h1 className="p-name">{post.title}</h1>
          <p className="article-deck p-summary">{post.description}</p>
          <div className="article-meta">
            <time className="dt-published" dateTime={post.date}>
              发布于 {formatDate(post.date)}
            </time>
            {post.updated && <span>更新于 {formatDate(post.updated)}</span>}
            <span>{post.readingTime}</span>
            <span>约 {wordCount.toLocaleString("zh-CN")} 字</span>
          </div>
        </header>
        <div className="article-reading-layout">
          <div className="article-reading-column">
            <div className="e-content">
              <MarkdownArticle content={post.content} />
            </div>
            <div className="article-tags">
              {post.tags?.map((tag) => (
                <span className="p-category" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
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
