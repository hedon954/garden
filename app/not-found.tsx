"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { htmlLang, routeLang, ui } from "./lib/i18n";
import { siteConfig } from "./site.config";

export default function NotFound() {
  const pathname = usePathname();
  const lang = routeLang(pathname);
  const t = ui(lang);
  const fullTitle = `${t.notFoundTitle} · ${siteConfig.name}`;
  const ogLocale = lang === "en" ? "en_US" : "zh_CN";

  useLayoutEffect(() => {
    document.documentElement.lang = htmlLang(lang);
    document.title = fullTitle;
    const setMeta = (attr: string, key: string, value: string) => {
      const el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (el) el.content = value;
    };
    setMeta("name", "description", t.notFoundDeck);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", t.notFoundDeck);
    setMeta("property", "og:locale", ogLocale);
    setMeta("property", "og:image:alt", fullTitle);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", t.notFoundDeck);
  }, [fullTitle, lang, ogLocale, t.notFoundDeck]);

  return (
    <main className="sh-main" id="garden-not-found">
      <header className="sh-head">
        <h1>{t.notFoundTitle}</h1>
        <p className="sh-deck">{t.notFoundDeck}</p>
      </header>
      <p>
        <Link href="/">{t.backHome}</Link>
      </p>
    </main>
  );
}
