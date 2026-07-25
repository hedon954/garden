import Link from "next/link";
import { GithubLogo, Rss } from "@phosphor-icons/react/ssr";
import { githubUrl, siteConfig } from "../site.config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>© {new Date().getFullYear()} {siteConfig.author.name} · {siteConfig.footer}</p>
        <div>
          <Link
            href={githubUrl}
            aria-label="GitHub"
            rel="me"
          >
            <GithubLogo size={19} />
            GitHub
          </Link>
          <Link href="/rss.xml" aria-label="RSS 订阅">
            <Rss size={18} />
            RSS
          </Link>
        </div>
      </div>
    </footer>
  );
}
