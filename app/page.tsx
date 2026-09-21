import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  GithubLogo,
  PushPin,
} from "@phosphor-icons/react/ssr";
import { columnHref, columns, formatDate, postHref, posts } from "./lib/content";
import { ThoughtCard } from "./components/ThoughtCard";
import { PageIntro } from "./components/PageIntro";
import { getPublishedThoughts } from "./lib/public-thoughts";
import { githubUrl, siteConfig, siteDocumentTitle } from "./site.config";

export const metadata = {
  title: siteDocumentTitle,
  description: siteConfig.description,
};

export default function Home() {
  const pinned = posts.filter((post) => post.pinned);
  const thoughts = getPublishedThoughts();

  return (
    <main className="page-shell home-page">
      <PageIntro
        eyebrow="HELLO, WORLD · 你好，世界"
        title={siteConfig.pages.home.title}
        subtitle={siteConfig.pages.home.subtitle}
      >
        <a
          className="inline-cta"
          href={githubUrl}
          target="_blank"
          rel="me noopener noreferrer"
        >
          <GithubLogo size={21} weight="fill" />
          在 GitHub 找到我
          <ArrowUpRight size={16} />
        </a>
      </PageIntro>

      {pinned.length > 0 && <section className="home-section">
        <div className="section-heading accent-heading">
          <div>
            <h2>置顶博文</h2>
          </div>
          <PushPin size={20} weight="light" aria-hidden="true" />
        </div>
        <div className="post-list">
          {pinned.map((post) => (
            <Link href={postHref(post)} key={post.path} className="post-row">
              <time>{formatDate(post.date)}</time>
              <span>
                <strong>{post.title}</strong>
                <small>{post.topic}</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>}

      {posts.length > 0 && <section className="home-section">
        <div className="section-heading accent-heading">
          <div>
            <h2>最近博文</h2>
          </div>
          <Link href="/blog">全部文章 →</Link>
        </div>
        <div className="post-list">
          {posts.slice(0, 5).map((post) => (
            <Link href={postHref(post)} key={post.path} className="post-row">
              <time>{formatDate(post.date)}</time>
              <span>
                <strong>{post.title}</strong>
                <small>{post.topic}</small>
              </span>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>}

      {thoughts.length > 0 && <section className="home-section">
        <div className="section-heading accent-heading">
          <div>
            <h2>最近随想</h2>
          </div>
          <Link href="/thoughts">进入随想 →</Link>
        </div>
        <div className="home-thought-list">
          {thoughts.slice(0, 5).map((thought) => (
            <ThoughtCard key={thought.slug} thought={thought} />
          ))}
        </div>
      </section>}

      {columns[0] && <section className="home-section column-preview">
        <div className="section-heading accent-heading">
          <div>
            <h2>主题专栏</h2>
          </div>
          <Link href="/columns">全部专栏 →</Link>
        </div>
        <Link
          href={columnHref(columns[0])}
          className="column-card"
        >
          <div>
            <span>连载中 · {columns.length} 篇</span>
            <h3>{columns[0].columnTitle}</h3>
            <p>记录一个人从想法、最小闭环到稳定发布的完整构建过程。</p>
          </div>
          <span className="column-number">#01</span>
        </Link>
      </section>}
    </main>
  );
}
