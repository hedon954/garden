"use client";

import { usePathname } from "next/navigation";
import { inAppPath, isHandbookPath, routeLang, ui } from "../lib/i18n";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function SiteChrome({
  children,
  bookshelfSite = false,
}: {
  children: React.ReactNode;
  /** True when the site has content/bookshelf.yaml. The package demo stays chrome-less. */
  bookshelfSite?: boolean;
}) {
  const pathname = usePathname();
  const lang = routeLang(pathname);
  // The skip link follows the route language too (/garden/en/ is English).
  const skip = (
    <a className="skip-link" href="#main-content">
      {ui(lang).skipToContent}
    </a>
  );
  // The package demo (no content/bookshelf.yaml) is the approved chrome-less viewport.
  // A site shelf is a normal page, so it keeps the header and footer.
  // Static export serves /bookshelf/ ; an exact "/bookshelf" check would miss it.
  const path = inAppPath(pathname);
  const shelfDemo = !bookshelfSite && (path === "/bookshelf" || path.startsWith("/bookshelf/"));
  if (path.startsWith("/admin") || shelfDemo) {
    return <>{skip}{children}</>;
  }

  return (
    <>
      {skip}
      <SiteHeader />
      <div id="main-content">{children}</div>
      <SiteFooter docs={isHandbookPath(pathname)} lang={lang} />
    </>
  );
}
