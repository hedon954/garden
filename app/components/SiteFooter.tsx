import { GithubLogo, Rss } from "@phosphor-icons/react/ssr";
import { githubUrl, siteConfig } from "../site.config";
import { ui, type UiLang } from "../lib/i18n";

/** On the Garden docs pages the footer carries no site-owner line or blog RSS feed. */
export function SiteFooter({ docs = false, lang }: { docs?: boolean; lang?: UiLang }) {
  const t = ui(lang);
  return (
    <footer className="sh-footer">
      <div className="sh-foot">
        <p>
          {docs ? (
            <span className="footer-framework">
              {lang === "en" ? "Garden · Markdown Blog Engine" : "Garden · 用 Markdown 写作的开源个人博客引擎"}
            </span>
          ) : (
            <>
              © {new Date().getFullYear()} {siteConfig.author.name} · {siteConfig.footer}
              <span className="footer-framework"> · {t.builtWith[0]}<a href="https://hedon.top/garden/" target="_blank" rel="noreferrer">Garden</a>{t.builtWith[1]}</span>
            </>
          )}
        </p>
        <div className="sh-foot-links">
          <a href={docs ? "https://github.com/hedon954/garden" : githubUrl} rel={docs ? "noopener noreferrer" : "me"} target={docs ? "_blank" : undefined}>
            <GithubLogo size={16} aria-hidden="true" />
            GitHub
          </a>
          {docs ? null : (
            <a href={`${(process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/u, "")}/rss.xml`}>
              <Rss size={16} aria-hidden="true" />
              RSS
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
