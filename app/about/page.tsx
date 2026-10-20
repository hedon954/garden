import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { GithubProfile } from "../components/GithubProfile";
import { PageIntro } from "../components/PageIntro";
import { siteConfig } from "../site.config";
import { siteHref } from "../lib/site-href";
import { pageAlternates } from "../lib/page-alternates";
import { siteLang } from "../lib/i18n";

const en = siteLang === "en";
const about = siteConfig.pages.about;
const heading = about.heading ?? (en ? "About" : "关于");
const paragraphs = about.paragraphs ?? (
  en
    ? [
        "Software engineer writing notes on tools, typography, and systems.",
        "Longer essays, short thoughts, and thematic columns live here.",
      ]
    : [
        "一名工程师。平时写代码，也把想清楚的问题记下来。",
        "这里放文章、随想和专栏。",
      ]
);
const quote = about.quote ?? "";
const focus = about.focus ?? (en ? ["Software", "Notes", "Craft"] : ["软件", "笔记", "日常"]);
const cta = about.cta ?? { href: "/blog", label: en ? "Read posts" : "浏览博文" };

export const metadata = {
  title: { absolute: siteConfig.name },
  description: about.subtitle || siteConfig.description,
  alternates: pageAlternates("/about"),
};

export default function AboutPage() {
  return (
    <main className="page-shell about-page">
      <PageIntro
        eyebrow={en ? "ABOUT" : "关于"}
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
          <span>{en ? "Focus" : "现在关注"}</span>
          <ul>
            {focus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link href={siteHref(cta.href)}>
            {cta.label}
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>

      <GithubProfile />
    </main>
  );
}
