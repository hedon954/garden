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
          <a href={githubUrl} aria-label="GitHub" rel="me">
            <GithubLogo size={19} />
            GitHub
          </a>
          <a href="/rss.xml" aria-label="RSS 订阅">
            <Rss size={18} />
            RSS
          </a>
        </div>
      </div>
    </footer>
  );
}
