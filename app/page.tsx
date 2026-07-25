import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  GithubLogo,
  PushPin,
} from "@phosphor-icons/react/ssr";
import { columns, formatDate, posts } from "./lib/content";
import { ThoughtCard } from "./components/ThoughtCard";
import { getPublishedThoughts } from "./lib/public-thoughts";

export const metadata = {
  title: "Hedon Log · 写作、构建与保持好奇",
  description:
    "Hedon 的个人博客：关于产品、工程、AI 学习与独立写作的长期笔记。",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const pinned = posts.filter((post) => post.pinned);
  const thoughts = await getPublishedThoughts();

  return (
    <main className="page-shell home-page">
      <section className="intro">
        <p className="eyebrow">HELLO, WORLD · 你好，世界</p>
        <h1>
          把复杂的事，
          <br />
          <span>慢慢想明白。</span>
        </h1>
        <p className="intro-copy">
          我是 Hedon，写代码，也写下构建过程中的判断与犹豫。
          这里收集产品、工程、AI 学习和日常生活里那些值得多想一会儿的东西。
        </p>
        <a
          className="inline-cta"
          href="https://github.com/hedon954"
          target="_blank"
          rel="me noopener noreferrer"
        >
          <GithubLogo size={21} weight="fill" />
          在 GitHub 找到我
          <ArrowUpRight size={16} />
        </a>
      </section>

      <section className="home-section">
        <div className="section-heading accent-heading">
          <div>
            <h2>置顶博文</h2>
          </div>
          <PushPin size={20} weight="light" aria-hidden="true" />
        </div>
        <div className="post-list">
          {pinned.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.slug} className="post-row">
              <time>{formatDate(post.date)}</time>
              <span>
                <strong>{post.title}</strong>
                <small>{post.topic}</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading accent-heading">
          <div>
            <h2>最近博文</h2>
          </div>
          <Link href="/blog">全部文章 →</Link>
        </div>
        <div className="post-list">
          {posts.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.slug} className="post-row">
              <time>{formatDate(post.date)}</time>
              <span>
                <strong>{post.title}</strong>
                <small>{post.topic}</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading accent-heading">
          <div>
            <h2>最近随想</h2>
          </div>
          <Link href="/thoughts">进入随想 →</Link>
        </div>
        {thoughts[0] && <ThoughtCard thought={thoughts[0]} />}
      </section>

      <section className="home-section column-preview">
        <div className="section-heading accent-heading">
          <div>
            <h2>主题专栏</h2>
          </div>
          <Link href="/columns">全部专栏 →</Link>
        </div>
        <Link
          href={`/columns/${columns[0].column}/${columns[0].slug}`}
          className="column-card"
        >
          <div>
            <span>连载中 · {columns.length} 篇</span>
            <h3>{columns[0].columnTitle}</h3>
            <p>记录一个人从想法、最小闭环到稳定发布的完整构建过程。</p>
          </div>
          <span className="column-number">#01</span>
        </Link>
      </section>
    </main>
  );
}
