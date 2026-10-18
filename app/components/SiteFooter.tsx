import { GithubLogo, Rss } from "@phosphor-icons/react/ssr";
import { githubUrl, siteConfig } from "../site.config";

export function SiteFooter() {
  return (
    <footer className="sh-footer">
      <div className="sh-foot">
        <p>
          © {new Date().getFullYear()} {siteConfig.author.name} · {siteConfig.footer}
        </p>
        <div className="sh-foot-links">
          <a href={githubUrl} rel="me">
            <GithubLogo size={16} aria-hidden="true" />
            GitHub
          </a>
          <a href="/rss.xml">
            <Rss size={16} aria-hidden="true" />
            RSS
          </a>
        </div>
      </div>
    </footer>
  );
}
