import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import {
  extractHeadings,
  findPost,
  formatDate,
  posts,
} from "../../lib/content";
import { MarkdownArticle } from "../../components/MarkdownArticle";
import { TableOfContents } from "../../components/TableOfContents";
import { Comments } from "../../components/Comments";
import { Webmentions } from "../../components/Webmentions";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();
  const headings = extractHeadings(post.content);

  return (
    <main className="reading-page">
      <article className="article-column">
        <Link href="/blog" className="back-link">
          <ArrowLeft size={16} />
          返回博文
        </Link>
        <header className="article-header">
          <p className="eyebrow">{post.topic}</p>
          <h1>{post.title}</h1>
          <p className="article-deck">{post.description}</p>
          <div className="article-meta">
            <time>发布于 {formatDate(post.date)}</time>
            {post.updated && <span>更新于 {formatDate(post.updated)}</span>}
            <span>{post.readingTime}</span>
          </div>
        </header>
        <MarkdownArticle content={post.content} />
        <div className="article-tags">
          {post.tags?.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
        <Webmentions />
        <Comments slug={post.slug} />
      </article>
      <TableOfContents headings={headings} />
    </main>
  );
}
