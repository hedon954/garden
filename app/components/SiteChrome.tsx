"use client";

import { usePathname } from "next/navigation";
import { gardenMode } from "@garden/site-config";
import { inAppPath, isHandbookPath, routeLang, ui } from "../lib/i18n";
import { DocsHeader } from "./DocsHeader";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function SiteChrome({ children, docsMode = false }: { children: React.ReactNode; docsMode?: boolean }) {
  const pathname = usePathname();
  const isDocs = docsMode || gardenMode === "docs";
  const lang = routeLang(pathname);
  const skip = (
    <a className="skip-link" href="#main-content">
      {ui(lang).skipToContent}
    </a>
  );
  if (!isDocs && inAppPath(pathname).startsWith("/admin")) return <>{skip}{children}</>;

  return (
    <>
      {skip}
      {isDocs ? <DocsHeader /> : <SiteHeader />}
      <div id="main-content">{children}</div>
      <SiteFooter docs={isDocs || isHandbookPath(pathname)} lang={lang} />
    </>
  );
}
