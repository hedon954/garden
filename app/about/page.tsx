import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { GithubProfile } from "../components/GithubProfile";
import { PageIntro } from "../components/PageIntro";
import { siteConfig } from "../site.config";

const about = siteConfig.pages.about;
const heading = about.heading ?? "这个网站为什么存在";
const paragraphs = about.paragraphs ?? [
  "我需要一个不被信息流推着走的地方。长文可以慢慢展开，随想可以轻轻放下；同一个主题也可以沿着清晰的顺序持续生长。",
  "所有文章都从本地 Markdown 文件开始。这意味着我可以继续在 Typora 里写作，也意味着内容不会被某个编辑器或平台锁住。",
];
const quote = about.quote ?? "写作不是把已经想明白的东西记下来，而是在句子之间发现自己还没有想明白什么。";
const focus = about.focus ?? [
  "将自己的关注方向写在这里",
  "用文章积累可迁移的知识",
  "为长期写作留出稳定的空间",
];
const cta = about.cta ?? { href: "/blog", label: "从博文开始" };

export const metadata = {
  title: about.title,
  description: about.subtitle,
};

export default function AboutPage() {
  return (
    <main className="page-shell about-page">
      <PageIntro
        eyebrow="ABOUT / 关于"
        title={about.title}
        subtitle={about.subtitle}
      />

      <div className="about-grid">
        <section className="about-copy">
          <h2>{heading}</h2>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <blockquote>{quote}</blockquote>
        </section>
        <aside className="about-facts">
          <span>现在关注</span>
          <ul>
            {focus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link href={cta.href}>
            {cta.label}
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>

      <GithubProfile />
    </main>
  );
}
