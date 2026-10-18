import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { GithubProfile } from "../components/GithubProfile";
import { PageIntro } from "../components/PageIntro";
import { siteConfig } from "../site.config";

const about = siteConfig.pages.about;
const heading = about.heading ?? "关于";
const paragraphs = about.paragraphs ?? [
  "一名工程师。平时写代码，也把想清楚的问题记下来。",
  "这里放文章、随想和专栏。",
];
const quote = about.quote ?? "";
const focus = about.focus ?? ["软件", "笔记", "日常"];
const cta = about.cta ?? { href: "/blog", label: "浏览博文" };

export const metadata = {
  title: { absolute: siteConfig.name },
  description: about.subtitle || siteConfig.description,
};

export default function AboutPage() {
  return (
    <main className="page-shell about-page">
      <PageIntro
        eyebrow="关于"
        title={about.title}
        subtitle={about.subtitle}
      />

      <div className="about-grid">
        <section className="about-copy">
          <h2>{heading}</h2>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {quote ? <blockquote>{quote}</blockquote> : null}
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
