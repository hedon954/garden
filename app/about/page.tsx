import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { GithubProfile } from "../components/GithubProfile";
import { PageIntro } from "../components/PageIntro";
import { siteConfig } from "../site.config";
import { siteHref } from "../lib/site-href";
import { pageAlternates } from "../lib/page-alternates";
import { ui } from "../lib/i18n";

const t = ui();
const about = siteConfig.pages.about;
const heading = about.heading ?? t.aboutFallbackHeading;
const paragraphs = about.paragraphs ?? t.aboutFallbackParagraphs;
const quote = about.quote ?? "";
const focus = about.focus ?? t.aboutFallbackFocus;
const cta = about.cta ?? { href: "/blog", label: t.aboutFallbackCta };

export const metadata = {
  title: { absolute: siteConfig.name },
  description: about.subtitle || siteConfig.description,
  alternates: pageAlternates("/about"),
};

export default function AboutPage() {
  return (
    <main className="sh-main about-page" id="content">
      <PageIntro
        eyebrow={t.aboutEyebrow}
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
          <span>{t.aboutFocusHeading}</span>
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
