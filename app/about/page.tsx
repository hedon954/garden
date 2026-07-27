import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { GithubProfile } from "../components/GithubProfile";
import { siteConfig } from "../site.config";

export const metadata = {
  title: siteConfig.pages.about.title,
  description: siteConfig.pages.about.subtitle,
};

export default function AboutPage() {
  return (
    <main className="page-shell about-page">
      <header className="page-intro">
        <p className="eyebrow">ABOUT / 关于</p>
        <h1>{siteConfig.pages.about.title}</h1>
        <p>{siteConfig.pages.about.subtitle}</p>
      </header>

      <div className="about-grid">
        <section className="about-copy">
          <h2>这个网站为什么存在</h2>
          <p>
            我需要一个不被信息流推着走的地方。长文可以慢慢展开，随想可以轻轻放下；
            同一个主题也可以沿着清晰的顺序持续生长。
          </p>
          <p>
            所有文章都从本地 Markdown 文件开始。这意味着我可以继续在 Typora
            里写作，也意味着内容不会被某个编辑器或平台锁住。
          </p>
          <blockquote>
            写作不是把已经想明白的东西记下来，而是在句子之间发现自己还没有想明白什么。
          </blockquote>
        </section>
        <aside className="about-facts">
          <span>现在关注</span>
          <ul>
            <li>将自己的关注方向写在这里</li>
            <li>用文章积累可迁移的知识</li>
            <li>为长期写作留出稳定的空间</li>
          </ul>
          <Link href="/blog">
            从博文开始
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>

      <GithubProfile />
    </main>
  );
}
