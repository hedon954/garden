import Link from "next/link";
import { GithubLogo, Rss } from "@phosphor-icons/react/ssr";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>© 2026 Hedon · 保持独立，持续写作。</p>
        <div>
          <Link
            href="https://github.com/hedon954"
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
