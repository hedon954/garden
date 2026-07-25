import Link from "next/link";
import { ArrowRight, PushPin } from "@phosphor-icons/react/ssr";
import { formatDate, posts, topics } from "../lib/content";

export const metadata = {
  title: "博文",
  description: "按时间与主题浏览全部长文。",
};

export default function BlogIndex() {
  return (
    <main className="page-shell index-page">
      <header className="page-intro">
        <p className="eyebrow">POSTS / 博文</p>
        <h1>长期写下去，偶尔回头整理。</h1>
        <p>
          这里是完整文章：有明确主题、有持续论证，也允许自己在更新里修正旧判断。
        </p>
      </header>

      <div className="topic-strip" aria-label="文章主题">
        <span>全部 · {posts.length}</span>
        {topics.map((topic) => (
          <span key={topic}>{topic}</span>
        ))}
      </div>

      <section className="archive-list" aria-label="全部博文">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="archive-row">
            <time>{formatDate(post.date)}</time>
            <div>
              <span className="archive-topic">
                {post.topic}
                {post.pinned && (
                  <span className="pinned-badge">
                    <PushPin size={12} weight="fill" />
                    置顶
                  </span>
                )}
              </span>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
            </div>
            <ArrowRight size={19} />
          </Link>
        ))}
      </section>
    </main>
  );
}
