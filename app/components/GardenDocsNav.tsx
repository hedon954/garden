"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { BookOpenText, CaretRight, List, X } from "@phosphor-icons/react";
import {
  COMPONENT_BADGE,
  groupHandbookDocs,
  NAV_SHORT_TITLE,
  type GardenDocNavItem,
} from "../lib/garden-docs-meta";
import { siteHref } from "../lib/site-href";

export function GardenDocsNav({
  docs,
  currentPath = "",
}: {
  docs: GardenDocNavItem[];
  currentPath?: string;
}) {
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
      <div className="gdoc-mobile-bar" aria-label="说明书目录栏">
        <button
          ref={triggerRef}
          type="button"
          className="gdoc-mobile-trigger"
          aria-controls={drawerId}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <List size={16} weight="bold" aria-hidden="true" />
          <span>说明目录</span>
        </button>
        <a
          className="gdoc-nojs-trigger"
          id={`${drawerId}-open`}
          href={`#${drawerId}`}
          aria-label="打开说明目录"
        >
          <List size={16} weight="bold" aria-hidden="true" />
          <span>说明目录</span>
        </a>
        <div className="gdoc-mobile-crumb" aria-hidden="true">
          <span>{currentSection?.title ?? "Garden 使用说明"}</span>
          <CaretRight size={12} />
          <strong>{currentDoc ? (NAV_SHORT_TITLE[currentDoc.path] ?? currentDoc.title) : "总览与快速入口"}</strong>
        </div>
      </div>

      <button
        type="button"
        className="gdoc-backdrop"
        aria-label="关闭说明目录"
        tabIndex={mobileOpen ? 0 : -1}
        data-open={mobileOpen}
        onClick={() => closeMobile(true)}
      />

      <aside
        id={drawerId}
        className="gdoc-sidebar"
        aria-label="Garden 使用说明目录"
        data-open={mobileOpen}
      >
        <div className="gdoc-sidebar-head">
          <Link
            href={siteHref("/garden")}
            className="gdoc-overview-link"
            aria-current={isOverview ? "page" : undefined}
            onClick={() => closeMobile(false)}
          >
            <span className="gdoc-overview-mark">
              <BookOpenText size={16} weight="duotone" aria-hidden="true" />
              <span>Garden 使用说明</span>
            </span>
            <small>总览与快速入口</small>
          </Link>
          <button
            ref={closeRef}
            type="button"
            className="gdoc-mobile-close"
            aria-label="关闭说明目录"
            onClick={() => closeMobile(true)}
          >
            <X size={17} aria-hidden="true" />
          </button>
          <a
            className="gdoc-nojs-close"
            href={`#${drawerId}-open`}
            aria-label="关闭说明目录"
          >
            <X size={17} aria-hidden="true" />
          </a>
        </div>

        <nav className="gdoc-nav" aria-label="章节导航">
          {groups.map((group) => (
            <div key={group.id} className="gdoc-nav-group">
              <div className="gdoc-nav-group-head">
                <h2>{group.title}</h2>
                {group.note ? <span>{group.note}</span> : null}
              </div>
              <ol className="gdoc-nav-list">
                {group.items.map((item) => {
                  const active = item.path === currentPath;
                  const badge = COMPONENT_BADGE[item.path];
                  const label = NAV_SHORT_TITLE[item.path] ?? item.title;
                  return (
                    <li key={item.path} className={active ? "is-active" : undefined}>
                      <Link
                        href={siteHref(`/garden/${item.path}`)}
                        aria-current={active ? "page" : undefined}
                        onClick={() => closeMobile(false)}
                      >
                        {badge ? (
                          <>
                            <code className="gdoc-comp-pill">{badge}</code>
                            <span className="gdoc-comp-label">{label}</span>
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
