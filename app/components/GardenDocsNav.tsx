"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { BookOpenText, CaretRight, List, X } from "@phosphor-icons/react";
import {
  COMPONENT_BADGE,
  groupHandbookDocs,
  HANDBOOK_SECTIONS,
  HANDBOOK_UI,
  handbookNavLabel,
  handbookPath,
  sectionTitle,
  type GardenDocNavItem,
  type HandbookLang,
} from "../lib/garden-docs-meta";
import { siteHref } from "../lib/site-href";

function NavAppIcon({ kind }: { kind?: string }) {
  if (kind === "typora") {
    return (
      <span className="gdoc-app-icon gdoc-app-icon--typora" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="16" height="16">
          <rect x="1.5" y="1.5" width="17" height="17" rx="4.2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.25" />
          <path d="M6.2 6.2h7.6M10 6.2v8.1M7.9 14.3h4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (kind === "vscode") {
    return (
      <span className="gdoc-app-icon gdoc-app-icon--vscode" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            d="M17.4 2.6 8.3 11l-4.2-3.2L2.2 8.8v6.4l1.9 1 4.2-3.2 9.1 8.4 4.4-2.1V4.7L17.4 2.6Zm-.2 5.4v8l-5.6-4 5.6-4Z"
            fill="#2489ca"
          />
        </svg>
      </span>
    );
  }
  return null;
}

function isNavItemActive(itemPath: string, currentPath: string): boolean {
  return itemPath === currentPath;
}

function NavBranch({
  item,
  nested,
  currentPath,
  lang,
  onNavigate,
}: {
  item: GardenDocNavItem;
  nested: GardenDocNavItem[];
  currentPath: string;
  lang: HandbookLang;
  onNavigate: (targetPath: string) => void;
}) {
  const t = HANDBOOK_UI[lang];
  const active = item.path === currentPath;
  const childActive = nested.some((sub) => sub.path === currentPath);
  const [open, setOpen] = useState(childActive);

  const badge = COMPONENT_BADGE[item.path];
  const label = handbookNavLabel(item, lang);
  const iconKind = item.navIcon;

  return (
    <li className={active ? "is-active" : undefined}>
      <div className="gdoc-nav-branch">
        <Link
          href={siteHref(handbookPath(lang, item.path))}
          aria-current={active ? "page" : undefined}
          onClick={() => onNavigate(item.path)}
        >
          {iconKind ? <NavAppIcon kind={iconKind} /> : null}
          {badge ? (
            <>
              <code className="gdoc-comp-pill">{badge}</code>
              <span className="gdoc-comp-label">{label}</span>
            </>
          ) : (
            <span className="gdoc-comp-label">{label}</span>
          )}
        </Link>
        <button
          type="button"
          className="gdoc-nav-disclosure"
          aria-expanded={open}
          aria-label={open ? t.collapseSubnav : t.expandSubnav}
          onClick={() => setOpen((value) => !value)}
        >
          <CaretRight size={14} aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <ol className="gdoc-nav-sub">
          {nested.map((sub) => {
            const subActive = sub.path === currentPath;
            return (
              <li key={sub.path} className={subActive ? "is-active" : undefined}>
                <Link
                  href={siteHref(handbookPath(lang, sub.path))}
                  aria-current={subActive ? "page" : undefined}
                  onClick={() => onNavigate(sub.path)}
                >
                  <span className="gdoc-comp-label">{handbookNavLabel(sub, lang)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : null}
    </li>
  );
}

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
  // Fixed, deterministic section order — never reordered across routes.
  const groups = groupHandbookDocs(docs);
  const currentDoc = docs.find((doc) => doc.path === currentPath);
  const currentSection = groups.find(
    (group) =>
      group.overviewPath === currentPath ||
      group.allDocs.some((item) => item.path === currentPath),
  );
  const [openPath, setOpenPath] = useState<string | null>(null);
  const mobileOpen = openPath === currentPath;
  const drawerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const closeMobile = useCallback((restoreFocus = false) => {
    restoreFocusRef.current = restoreFocus;
    setOpenPath(null);
  }, []);

  const handleNavLinkClick = useCallback(
    (targetPath: string) => {
      if (targetPath === currentPath) closeMobile(false);
    },
    [closeMobile, currentPath],
  );

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
      if (!query.matches) setOpenPath(null);
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
          onClick={() => setOpenPath(currentPath)}
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
          <strong>{currentDoc ? handbookNavLabel(currentDoc, lang) : t.overviewHint}</strong>
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
            onClick={() => handleNavLinkClick("")}
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
          {groups.map((group) => {
            const headingLabel =
              sectionTitle(HANDBOOK_SECTIONS.find((sec) => sec.id === group.id), lang) ?? group.title;
            const headingActive = currentPath === group.overviewPath;
            return (
              <div key={group.id} className="gdoc-nav-group">
                <h2 className={`gdoc-nav-group-head${headingActive ? " is-active" : ""}`}>
                  {group.overviewDoc ? (
                    <Link
                      href={siteHref(handbookPath(lang, group.overviewPath))}
                      className="gdoc-nav-group-link"
                      aria-current={headingActive ? "page" : undefined}
                      onClick={() => handleNavLinkClick(group.overviewPath)}
                    >
                      <span>{headingLabel}</span>
                    </Link>
                  ) : (
                    <span>{headingLabel}</span>
                  )}
                </h2>
                <ol className="gdoc-nav-list">
                  {group.items.map((item) => {
                    const nested = item.path === "components/intelligent-ui" ? group.diagramSubpages : [];
                    if (nested.length) {
                      return (
                        <NavBranch
                          key={`${item.path}:${currentPath}`}
                          item={item}
                          nested={nested}
                          currentPath={currentPath}
                          lang={lang}
                          onNavigate={() => handleNavLinkClick(item.path)}
                        />
                      );
                    }
                    const active = isNavItemActive(item.path, currentPath);
                    const badge = COMPONENT_BADGE[item.path];
                    const label = handbookNavLabel(item, lang);
                    const iconKind = item.navIcon ?? (item.path === "extensions/typora" ? "typora" : item.path === "extensions/vscode" ? "vscode" : undefined);
                    return (
                      <li key={item.path} className={active ? "is-active" : undefined}>
                        <Link
                          href={siteHref(handbookPath(lang, item.path))}
                          aria-current={active ? "page" : undefined}
                          onClick={() => handleNavLinkClick(item.path)}
                        >
                          {iconKind ? <NavAppIcon kind={iconKind} /> : null}
                          {badge ? (
                            <>
                              <code className="gdoc-comp-pill">{badge}</code>
                              <span className="gdoc-comp-label">{label}</span>
                            </>
                          ) : (
                            <span className="gdoc-comp-label">{label}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
