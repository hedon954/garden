import type { Metadata } from "next";
import { FEED_ALTERNATES } from "../../lib/page-alternates";
import { notFound } from "next/navigation";
import {
  findPost,
  postHref,
  posts,
} from "../../lib/content";
import { PostReadingView } from "../../components/PostReadingView";
import { adjacentByDate } from "../../../ui/garden/adjacent.mjs";
import {
  absoluteUrl,
  getSiteUrl,
} from "../../lib/site";
import { isStaticPlaceholder, STATIC_PLACEHOLDER, staticParams } from "../../../ui/garden/static-params.mjs";

export function generateStaticParams() {
  return staticParams(posts.map((post) => ({ path: post.path.split("/") })), { path: [STATIC_PLACEHOLDER] });
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
    alternates: { canonical: pathname, types: FEED_ALTERNATES },
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
      card: post.cover ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description,
      images: post.cover ? [post.cover] : undefined,
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
  if (!post) {
    if (isStaticPlaceholder(path)) return null;
    notFound();
  }
  const baseUrl = await getSiteUrl();
  const pathname = postHref(post);
  const canonicalUrl = absoluteUrl(pathname, baseUrl);
  const { prev, next } = adjacentByDate(posts, (item: { path: string }) => item.path === post.path);

  return (
    <PostReadingView
      post={post}
      pathname={pathname}
      canonicalUrl={canonicalUrl}
      commentsSlug={post.path}
      prev={prev ? { href: postHref(prev), title: prev.title } : null}
      next={next ? { href: postHref(next), title: next.title } : null}
    />
  );
}
