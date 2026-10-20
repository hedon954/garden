"use client";

import { useEffect } from "react";
import { HANDBOOK_LANG_KEY, type HandbookLang } from "../lib/garden-docs-meta";
import { swapHandbookLang } from "../lib/handbook-path";

/**
 * First visit: follow the browser language. Afterwards: follow the reader's
 * saved choice (set by the 中 / EN switch). Only moves to a page that exists,
 * which the hreflang link in <head> tells us.
 */
export function HandbookLangRedirect({ lang }: { lang: HandbookLang }) {
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(HANDBOOK_LANG_KEY);
    } catch {}
    const wanted: HandbookLang = saved === "en" || saved === "zh"
      ? saved
      : /^en\b/i.test(navigator.language || "") ? "en" : "zh";
    if (wanted === lang) return;
    const link = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${wanted === "en" ? "en" : "zh-CN"}"]`);
    if (!link?.href) return;
    // The hreflang link says the page exists; the address comes from this one,
    // so the origin and any basePath stay as they are.
    const pathname = swapHandbookLang(location.pathname, wanted);
    if (pathname && pathname !== location.pathname) location.replace(pathname + location.search + location.hash);
  }, [lang]);
  return null;
}
