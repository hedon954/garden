import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  PushPin,
} from "@phosphor-icons/react/ssr";
import { formatDate, posts, topics } from "../lib/content";
import { siteConfig } from "../site.config";

export const metadata = {
  title: siteConfig.pages.blog.title,
  description: siteConfig.pages.blog.subtitle,
};

const pageSize = 8;

const archiveHref = (topic?: string, page?: number) => {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
};

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; page?: string }>;
}) {
  const requested = await searchParams;
  const selectedTopic = topics.includes(requested.topic ?? "")
    ? requested.topic
    : undefined;
  const filteredPosts = selectedTopic
    ? posts.filter((post) => post.topic === selectedTopic)
    : posts;
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const parsedPage = Number.parseInt(requested.page ?? "1", 10);
  const currentPage = Math.min(
    pageCount,
    Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1),
  );
  const visiblePosts = filteredPosts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <main className="page-shell index-page">
      <header className="page-intro">
        <p className="eyebrow">POSTS / 博文</p>
        <h1>{siteConfig.pages.blog.title}</h1>
        <p>{siteConfig.pages.blog.subtitle}</p>
      </header>

      <div className="topic-strip" aria-label="文章主题">
        <Link
          href="/blog"
          className={!selectedTopic ? "active" : ""}
          aria-current={!selectedTopic ? "page" : undefined}
        >
          全部 · {posts.length}
        </Link>
        {topics.map((topic) => (
          <Link
            href={archiveHref(topic)}
            className={selectedTopic === topic ? "active" : ""}
            aria-current={selectedTopic === topic ? "page" : undefined}
            key={topic}
          >
            {topic} · {posts.filter((post) => post.topic === topic).length}
          </Link>
        ))}
      </div>

      <section className="archive-list" aria-label="全部博文">
        {visiblePosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className={`archive-row${post.cover ? " with-cover" : ""}`}
          >
            {post.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="archive-cover"
                src={post.cover}
                alt={post.coverAlt ?? `${post.title} 封面`}
                loading="lazy"
              />
            )}
            <div className="archive-copy">
              <div className="archive-meta">
                <time>{formatDate(post.date)}</time>
                <span className="archive-topic">
                  {post.topic}
                  {post.pinned && (
                    <span className="pinned-badge">
                      <PushPin size={12} weight="fill" />
                      置顶
                    </span>
                  )}
                </span>
              </div>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
            </div>
            <ArrowRight size={19} />
          </Link>
        ))}
      </section>

      {pageCount > 1 && (
        <nav className="archive-pagination" aria-label="博文分页">
          {currentPage > 1 ? (
            <Link href={archiveHref(selectedTopic, currentPage - 1)}>
              <ArrowLeft size={16} />
              上一页
            </Link>
          ) : (
            <span />
          )}
          <span>
            {currentPage} / {pageCount}
          </span>
          {currentPage < pageCount ? (
            <Link href={archiveHref(selectedTopic, currentPage + 1)}>
              下一页
              <ArrowRight size={16} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
