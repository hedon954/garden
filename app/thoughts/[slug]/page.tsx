import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { Comments } from "../../components/Comments";
import { ThoughtCard } from "../../components/ThoughtCard";
import { Webmentions } from "../../components/Webmentions";
import { thoughts } from "../../lib/content";
import { findPublishedThought } from "../../lib/public-thoughts";
import {
  absoluteUrl,
  getSiteUrl,
  webmentionApiEndpoint,
} from "../../lib/site";

export function generateStaticParams() {
  return thoughts.map((thought) => ({ slug: thought.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const thought = findPublishedThought(slug);
  if (!thought) return {};
  const baseUrl = await getSiteUrl();
  const pathname = `/thoughts/${slug}`;
  const images = Array.isArray(thought.media)
    ? thought.media.filter((item) => item.type === "image").slice(0, 4)
    : [];
  return {
    title: thought.title,
    description: thought.content.replace(/\s+/gu, " ").slice(0, 160),
    alternates: { canonical: pathname },
    openGraph: {
      type: "article",
      url: absoluteUrl(pathname, baseUrl),
      title: thought.title,
      description: thought.content.replace(/\s+/gu, " ").slice(0, 160),
      publishedTime: new Date(thought.date).toISOString(),
      images: images.map((item) => ({ url: item.src, alt: item.alt })),
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title: thought.title,
      description: thought.content.replace(/\s+/gu, " ").slice(0, 160),
      images: images.map((item) => item.src),
    },
  } satisfies Metadata;
}

export default async function ThoughtPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const thought = findPublishedThought(slug);
  if (!thought) notFound();
  const baseUrl = await getSiteUrl();
  const pathname = `/thoughts/${slug}`;

  return (
    <main className="page-shell thought-detail-page">
      <Link href="/thoughts" className="back-link">
        <ArrowLeft size={16} />
        返回随想
      </Link>
      <ThoughtCard thought={thought} showPermalink={false} />
      <Webmentions
        target={absoluteUrl(pathname, baseUrl)}
        endpoint={webmentionApiEndpoint()}
      />
      <Comments slug={`thought:${slug}`} />
    </main>
  );
}
