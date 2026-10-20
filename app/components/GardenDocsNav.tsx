"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { BookOpenText, CaretRight, List, X } from "@phosphor-icons/react";
import {
  COMPONENT_BADGE,
  groupHandbookDocs,
  HANDBOOK_SECTIONS,
  HANDBOOK_UI,
  NAV_SHORT_TITLE,
  REFERENCE_SECTION,
  isReferencePath,
  handbookPath,
  sectionTitle,
  type GardenDocNavItem,
  type HandbookLang,
} from "../lib/garden-docs-meta";
import { siteHref } from "../lib/site-href";

export function GardenDocsNav({
  docs,
  currentPath = "",
  lang = "zh",
}: {
  docs: GardenDocNavItem[];
  currentPath?: string;
  lang?: HandbookLang;
}) {
  const t = HANDBOOK_UI[lang];
  const groups = groupHandbookDocs(docs);
  const currentDoc = docs.find((doc) => doc.path === currentPath);
  const currentSection = groups.find((group) =>
    group.items.some((item) => item.path === currentPath),
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const closeMobile = useCallback((restoreFocus = false) => {
    restoreFocusRef.current = restoreFocus;
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (mobileOpen || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    triggerRef.current?.focus({ preventScroll: true });
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const query = window.matchMedia("(max-width: 1080px)");
    if (!query.matches) return;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      closeRef.current?.focus({ preventScroll: true });
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile(true);
    };
    const onChange = () => {
      if (!query.matches) setMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    query.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      query.removeEventListener("change", onChange);
    };
  }, [closeMobile, mobileOpen]);

  const isOverview = currentPath === "";

  return (
    <>
      <div className="gdoc-mobile-bar" aria-label={t.mobileBar}>
        <button
          ref={triggerRef}
          type="button"
          className="gdoc-mobile-trigger"
          aria-controls={drawerId}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <List size={16} weight="bold" aria-hidden="true" />
          <span>{t.sidebarShort}</span>
        </button>
        <a
          className="gdoc-nojs-trigger"
          id={`${drawerId}-open`}
          href={`#${drawerId}`}
          aria-label={t.openSidebar}
        >
          <List size={16} weight="bold" aria-hidden="true" />
          <span>{t.sidebarShort}</span>
        </a>
        <div className="gdoc-mobile-crumb" aria-hidden="true">
          <span>{sectionTitle(currentSection, lang) ?? t.name}</span>
          <CaretRight size={12} />
          <strong>{currentDoc ? (lang === "en" ? currentDoc.navTitle ?? currentDoc.title : NAV_SHORT_TITLE[currentDoc.path] ?? currentDoc.title) : t.overviewHint}</strong>
        </div>
      </div>

      <button
        type="button"
        className="gdoc-backdrop"
        aria-label={t.closeSidebar}
        tabIndex={mobileOpen ? 0 : -1}
        data-open={mobileOpen}
        onClick={() => closeMobile(true)}
      />

      <aside
        id={drawerId}
        className="gdoc-sidebar"
        aria-label={t.sidebar}
        data-open={mobileOpen}
      >
        <div className="gdoc-sidebar-head">
          <Link
            href={siteHref(handbookPath(lang))}
            className="gdoc-overview-link"
            aria-current={isOverview ? "page" : undefined}
            onClick={() => closeMobile(false)}
          >
            <span className="gdoc-overview-mark">
              <BookOpenText size={16} weight="duotone" aria-hidden="true" />
              <span>{t.name}</span>
            </span>
            <small>{t.overviewHint}</small>
          </Link>
          <button
            ref={closeRef}
            type="button"
            className="gdoc-mobile-close"
            aria-label={t.closeSidebar}
            onClick={() => closeMobile(true)}
          >
            <X size={17} aria-hidden="true" />
          </button>
          <a
            className="gdoc-nojs-close"
            href={`#${drawerId}-open`}
            aria-label={t.closeSidebar}
          >
            <X size={17} aria-hidden="true" />
          </a>
        </div>

        <nav className="gdoc-nav" aria-label={t.chapters}>
          {(isReferencePath(currentPath) ? [...groups].sort((a, b) => Number(b.id === REFERENCE_SECTION) - Number(a.id === REFERENCE_SECTION)) : groups).map((group) => (
            <div key={group.id} className="gdoc-nav-group">
              <h2 className="gdoc-nav-group-head">{sectionTitle(HANDBOOK_SECTIONS.find((sec) => sec.id === group.id), lang) ?? group.title}</h2>
              <ol className="gdoc-nav-list">
                {group.items.map((item) => {
                  const active = item.path === currentPath;
                  const badge = COMPONENT_BADGE[item.path];
                  const label = lang === "en" ? item.navTitle ?? item.title : NAV_SHORT_TITLE[item.path] ?? item.title;
                  return (
                    <li key={item.path} className={active ? "is-active" : undefined}>
                      <Link
                        href={siteHref(handbookPath(lang, item.path))}
                        aria-current={active ? "page" : undefined}
                        onClick={() => closeMobile(false)}
                      >
                        {badge ? (
                          <>
                            <code className="gdoc-comp-pill">{badge}</code>
                            {group.id === REFERENCE_SECTION ? null : <span className="gdoc-comp-label">{label}</span>}
                          </>
                        ) : (
                          <span>{label}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
