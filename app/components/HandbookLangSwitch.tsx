"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { HANDBOOK_LANG_KEY, handbookBase, type HandbookLang } from "../lib/garden-docs-meta";
import { siteHref } from "../lib/site-href";
import { swapHandbookLang } from "../lib/handbook-path";
import { siteLang } from "../lib/i18n";
import { handbookPageLang, handbookSwitchLabel, handbookSwitchTarget, handbookSwitchTitle } from "../lib/handbook-switch.mjs";

const noSubscribe = () => () => {};

/** The counterpart page from the hreflang link in <head>, on this origin. */
function counterpartHref(target: HandbookLang) {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${target === "en" ? "en" : "zh-CN"}"]`);
  if (link?.href) return swapHandbookLang(location.pathname, target);
  // English sites leave hreflang out of <head>; the handbook ships every page in both languages there.
  if (siteLang === "en") return swapHandbookLang(location.pathname, target);
  return target === "zh" ? siteHref(`${handbookBase("zh")}/`) : null;
}

/** 「中 / EN」 in the top bar on handbook pages. Goes to the counterpart page. */
export function HandbookLangSwitch() {
  const pathname = usePathname() ?? "";
  const lang: HandbookLang = handbookPageLang(pathname);
  const target: HandbookLang = handbookSwitchTarget(lang);
  const href = useSyncExternalStore(
    noSubscribe,
    () => counterpartHref(target),
    () => null,
  );

  const remember = () => {
    try {
      localStorage.setItem(HANDBOOK_LANG_KEY, target);
    } catch {}
  };
  const label = (
    <>
      <span aria-current={lang === "zh" ? "true" : undefined}>中</span>
      <span aria-hidden="true"> / </span>
      <span aria-current={lang === "en" ? "true" : undefined}>EN</span>
    </>
  );
  if (!href) {
    return <span className="sh-lang is-disabled" title={handbookSwitchTitle(lang, siteLang)}>{label}</span>;
  }
  return (
    <a className="sh-lang" href={href} hrefLang={target === "en" ? "en" : "zh-CN"} lang={target === "en" ? "en" : undefined} onClick={remember} aria-label={handbookSwitchLabel(lang)}>
      {label}
    </a>
  );
}
