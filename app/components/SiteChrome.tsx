"use client";

import { usePathname } from "next/navigation";
import { inAppPath, isHandbookPath, routeLang, ui } from "../lib/i18n";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lang = routeLang(pathname);
  // The skip link follows the route language too (/garden/en/ is English).
  const skip = (
    <a className="skip-link" href="#main-content">
      {ui(lang).skipToContent}
    </a>
  );
  if (inAppPath(pathname).startsWith("/admin")) return <>{skip}{children}</>;

  return (
    <>
      {skip}
      <SiteHeader />
      <div id="main-content">{children}</div>
      <SiteFooter docs={isHandbookPath(pathname)} lang={lang} />
    </>
  );
}
