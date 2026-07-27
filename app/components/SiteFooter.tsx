import { GithubLogo, Rss } from "@phosphor-icons/react/ssr";
import { githubUrl, siteConfig } from "../site.config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>
          © {new Date().getFullYear()} {siteConfig.author.name} · {siteConfig.footer}
          <span className="footer-framework"> · 基于 <a href="https://github.com/hedon954/garden" target="_blank" rel="noreferrer">Garden</a> 构建</span>
        </p>
        <div>
          <a
            href={githubUrl}
            aria-label="GitHub"
            rel="me"
          >
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
