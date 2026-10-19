import { GithubLogo, Rss } from "@phosphor-icons/react/ssr";
import { githubUrl, siteConfig } from "../site.config";

/** On the Garden docs pages the footer carries no site-owner line. */
export function SiteFooter({ docs = false }: { docs?: boolean }) {
  return (
    <footer className="sh-footer">
      <div className="sh-foot">
        <p>
          {docs ? null : `© ${new Date().getFullYear()} ${siteConfig.author.name} · ${siteConfig.footer}`}
          <span className="footer-framework">{docs ? "" : " · "}基于 <a href="https://github.com/hedon954/garden" target="_blank" rel="noreferrer">Garden</a> 构建</span>
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
