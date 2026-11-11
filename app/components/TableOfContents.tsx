"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { nestHeadings, expandedTocSections, toggleTocSection, type TocHeading, type TocNode, type TocExpansion } from "../lib/toc-expansion";
import { createPortal } from "react-dom";
import { TOC_PANEL_ID, TOC_CONTROL_ID, TOC_CLOSED_ID } from "../lib/reading-navigation";
import { ArrowsInLineVertical, ArrowsOutLineVertical, X } from "@phosphor-icons/react";
import { ui, type UiLang } from "../lib/i18n";

type TocProps = { headings: TocHeading[]; label?: string; lang?: UiLang };

// A route/content change starts a fresh reading session, including when React
// reuses the component during normal client navigation.
export function TableOfContents(props: TocProps) {
  const pathname = usePathname();
  return <ContentsSession key={`${pathname}:${JSON.stringify(props.headings)}`} {...props} />;
}

const getCssScrollPaddingTop = () => {
  const value = window.getComputedStyle(document.documentElement).scrollPaddingTop;
  const offset = Number.parseFloat(value);
  return Number.isFinite(offset) ? offset : 0;
};

// Where a heading should stop: the page's scroll-padding-top, the same
// offset the browser uses for a #link, so a script jump never differs from
// the native one. If that padding would leave the heading under the sticky
// header, stop 16px below the header instead.
const getScrollPaddingTop = () => {
  const padding = getCssScrollPaddingTop();
  const header = document.querySelector(".sh-header, .site-header");
  const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
  if (headerBottom > 8 && padding < headerBottom) return headerBottom + 16;
  return padding > 0 ? padding : 24;
};

const getReadingProbe = () => {
  const anchorStop = getScrollPaddingTop() + 1;
  return Math.max(
    anchorStop,
    Math.min(window.innerHeight * 0.45, anchorStop + 240),
  );
};

const getHashHeadingId = () => {
  const hash = window.location.hash.slice(1);
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
};

const isLaidOutImage = (image: HTMLImageElement) =>
  image.complete && image.naturalHeight > 0;

const layoutRootFor = (target: Element) =>
  target.closest("article.post-article, article.series-article, main") ?? document.body;

const precedingImages = (target: Element) =>
  Array.from(layoutRootFor(target).querySelectorAll("img")).filter((image) =>
    Boolean(
      image.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  );

const wakeLazyImage = (image: HTMLImageElement) => {
  if (isLaidOutImage(image)) return;
  image.loading = "eager";
};

const prefetchHeadingLayout = (id: string) => {
  const target = document.getElementById(id);
  if (!target) return;
  for (const image of precedingImages(target)) wakeLazyImage(image);
};

const scrollToHeading = (id: string) => {
  const target = document.getElementById(id);
  if (!target) return;

  const top = Math.max(
    0,
    window.scrollY + target.getBoundingClientRect().top - getScrollPaddingTop(),
  );
  if (Math.abs(top - window.scrollY) <= 1) return;

  // `scrollBy({ behavior })` can still animate or stack with later
  // corrections and send the heading off-screen. Write scrollTop after
  // forcing `scroll-behavior: auto`.
  const html = document.documentElement;
  const previousBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  html.scrollTop = top;
  html.style.scrollBehavior = previousBehavior;
};

// The server-rendered header owns the slot; this component owns one drawer/control.
// Observe slot replacement during client navigation, never poll or duplicate the TOC.
const readControlHost = () => document.getElementById(TOC_CONTROL_ID);
const serverControlHost = () => null;
function subscribeControlHost(changed: () => void) {
  let host = readControlHost();
  const observer = new MutationObserver(() => {
    const next = readControlHost();
    if (next !== host) { host = next; changed(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function ContentsSession({
  headings,
  label,
  lang,
}: TocProps) {
  const t = ui(lang);
  label ??= t.toc;
  const [activeId, setActiveId] = useState<string>();
  const [expansion, setExpansion] = useState<TocExpansion>({ mode: "follow" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelId = TOC_PANEL_ID;
  const controlHost = useSyncExternalStore(subscribeControlHost, readControlHost, serverControlHost);
  const listId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const restoreMobileTriggerFocusRef = useRef(false);
  const anchorCleanupRef = useRef<(() => void) | undefined>(undefined);
  const tree = useMemo(() => nestHeadings(headings), [headings]);
  const expanded = useMemo(() => expandedTocSections(tree, expansion, activeId), [tree, expansion, activeId]);

  const closeMobileToc = useCallback((restoreFocus = false) => {
    restoreMobileTriggerFocusRef.current = restoreFocus;
    setMobileOpen(false);
  }, []);

  const alignHeadingToAnchor = useCallback((id: string) => {
    scrollToHeading(id);
  }, []);

  const trackAnchorLayout = useCallback(
    (id: string) => {
      anchorCleanupRef.current?.();
      const target = document.getElementById(id);
      if (!target) return;

      let frame = 0;
      let timeout = 0;
      const layoutRoot = layoutRootFor(target);
      const pendingImages = precedingImages(target).filter(
        (image) => !isLaidOutImage(image),
      );
      for (const image of pendingImages) wakeLazyImage(image);

      const scheduleAlignment = () => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (getHashHeadingId() === id) {
            alignHeadingToAnchor(id);
          }
        });
      };
      function realign() {
        scheduleAlignment();
      }
      const resizeObserver = new ResizeObserver(realign);

      const cleanup = () => {
        if (frame) window.cancelAnimationFrame(frame);
        if (timeout) window.clearTimeout(timeout);
        resizeObserver.disconnect();
        for (const image of pendingImages) {
          image.removeEventListener("load", realign);
          image.removeEventListener("error", realign);
        }
        window.removeEventListener("wheel", cleanup);
        window.removeEventListener("touchstart", cleanup);
        window.removeEventListener("pointerdown", cleanup);
        window.removeEventListener("keydown", cleanup);
        if (anchorCleanupRef.current === cleanup) {
          anchorCleanupRef.current = undefined;
        }
      };

      for (const image of pendingImages) {
        image.addEventListener("load", realign);
        image.addEventListener("error", realign);
      }
      window.addEventListener("wheel", cleanup, { passive: true });
      window.addEventListener("touchstart", cleanup, { passive: true });
      window.addEventListener("pointerdown", cleanup, { passive: true });
      window.addEventListener("keydown", cleanup);
      timeout = window.setTimeout(cleanup, 8_000);
      anchorCleanupRef.current = cleanup;
      scheduleAlignment();
      window.requestAnimationFrame(() => {
        if (anchorCleanupRef.current === cleanup) {
          resizeObserver.observe(layoutRoot);
        }
      });
    },
    [alignHeadingToAnchor],
  );

  useEffect(() => {
    let frame = 0;
    const updateActiveHeading = () => {
      frame = 0;
      const readingProbe = getReadingProbe();
      const visibleHeadings = headings
        .map((heading) => ({
          id: heading.id,
          top: document.getElementById(heading.id)?.getBoundingClientRect().top,
        }))
        .filter((heading): heading is { id: string; top: number } => heading.top !== undefined);
      const reachedPageEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      const current = reachedPageEnd
        ? visibleHeadings.at(-1)?.id
        : visibleHeadings.filter((heading) => heading.top <= readingProbe).at(-1)
            ?.id;

      setActiveId((previous) => (previous === current ? previous : current));
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveHeading);
    };

    updateActiveHeading();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings]);

  useEffect(() => {
    history.scrollRestoration = "manual";
    const syncHashAnchor = () => {
      const id = getHashHeadingId();
      if (!headings.some((heading) => heading.id === id)) return;
      setActiveId(id);
      trackAnchorLayout(id);
    };

    syncHashAnchor();
    window.addEventListener("hashchange", syncHashAnchor);
    return () => {
      window.removeEventListener("hashchange", syncHashAnchor);
      anchorCleanupRef.current?.();
    };
  }, [headings, trackAnchorLayout]);

  useEffect(() => {
    if (mobileOpen || !restoreMobileTriggerFocusRef.current) return;
    restoreMobileTriggerFocusRef.current = false;
    mobileTriggerRef.current?.focus({ preventScroll: true });
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const mobileQuery = window.matchMedia("(max-width: 900px)");
    if (!mobileQuery.matches) return;

    const previousOverflow = document.body.style.overflow;
    mobileCloseRef.current?.focus({ preventScroll: true });
    const focusFrame = window.requestAnimationFrame(() => {
      mobileCloseRef.current?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileToc(true);
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [])
        .filter((control) => control.getClientRects().length > 0 && getComputedStyle(control).visibility !== "hidden");
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleViewportChange = () => {
      if (!mobileQuery.matches) setMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    mobileQuery.addEventListener("change", handleViewportChange);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      mobileQuery.removeEventListener("change", handleViewportChange);
    };
  }, [closeMobileToc, mobileOpen]);

  useEffect(() => {
    if (!activeId) return;
    if (!mobileOpen && window.matchMedia("(max-width: 900px)").matches) return;
    const list = listRef.current;
    const activeItem = list?.querySelector<HTMLElement>(
      '[aria-current="location"]',
    );
    if (!list || !activeItem || !activeItem.getClientRects().length) return;

    const edge = 10;
    const listBounds = list.getBoundingClientRect();
    const itemBounds = activeItem.getBoundingClientRect();
    let nextTop: number | undefined;

    if (itemBounds.top < listBounds.top + edge) {
      nextTop = Math.max(0, list.scrollTop + itemBounds.top - listBounds.top - edge);
    } else if (itemBounds.bottom > listBounds.bottom - edge) {
      nextTop = list.scrollTop + itemBounds.bottom - listBounds.bottom + edge;
    }

    if (nextTop !== undefined) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      list.scrollTo({ top: nextTop, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [activeId, expanded, mobileOpen]);

  useEffect(() => {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement) || !listRef.current?.contains(focused) || focused.getClientRects().length) return;
    let section = focused.closest(".toc-section");
    while (section) {
      const link = section.querySelector<HTMLAnchorElement>(":scope > .toc-item-row > a");
      if (link?.getClientRects().length) { link.focus({ preventScroll: true }); break; }
      section = section.parentElement?.closest(".toc-section") ?? null;
    }
  }, [expanded]);

  const toggleSection = (id: string) => setExpansion((current) => toggleTocSection(expandedTocSections(tree, current, activeId), id));

  const navigateToHeading = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const hash = encodeURIComponent(id);
    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${hash}`,
    );
    setActiveId(id);
    closeMobileToc();
    trackAnchorLayout(id);
    const heading = document.getElementById(id);
    if (heading) {
      const temporaryTabIndex = !heading.hasAttribute("tabindex");
      if (temporaryTabIndex) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      if (temporaryTabIndex) heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
    }
  };

  const renderNode = (node: TocNode, path: number[]): ReactNode => {
    const collapsed = !expanded.has(node.id);
    const childListId = `${listId}-${path.join("-")}`;

    return (
      <li
        key={node.id}
        className={`toc-section toc-depth-${node.depth}${activeId === node.id ? " active" : ""}`}
      >
        <div className="toc-item-row">
          <a
            href={`#${node.id}`}
            onClick={(event) => navigateToHeading(event, node.id)}
            onPointerEnter={() => prefetchHeadingLayout(node.id)}
            onFocus={() => prefetchHeadingLayout(node.id)}
            aria-current={activeId === node.id ? "location" : undefined}
          >
            {node.text}
          </a>
          {node.children.length > 0 ? (
            <button
              className="toc-section-toggle"
              type="button"
              aria-controls={childListId}
              aria-expanded={!collapsed}
              aria-label={t.tocToggle(collapsed, node.text)}
              onClick={() => toggleSection(node.id)}
            >
              <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
            </button>
          ) : null}
        </div>
        {node.children.length > 0 ? (
          <ol id={childListId} className="toc-sublist" role="list" data-collapsed={collapsed}>
            {node.children.map((child, index) => renderNode(child, [...path, index]))}
          </ol>
        ) : null}
      </li>
    );
  };

  if (!headings.length) return null;

  const activeHeading = headings.find((heading) => heading.id === activeId);

  return (
    <>
      {controlHost ? createPortal(<button
        ref={mobileTriggerRef}
        className="toc-mobile-trigger"
        type="button"
        aria-controls={panelId}
        aria-expanded={mobileOpen}
        aria-label={`${t.open}${label}${activeHeading ? `${t.currentSection}${activeHeading.text}` : ""}`}
        tabIndex={mobileOpen ? -1 : 0}
        data-mobile-open={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <span>{t.tocShort}</span>
      </button>, controlHost) : null}
      <button
        className="toc-mobile-backdrop"
        type="button"
        aria-label={`${t.close}${label}`}
        tabIndex={mobileOpen ? 0 : -1}
        data-mobile-open={mobileOpen}
        onClick={() => closeMobileToc(true)}
      />
      <aside
        ref={panelRef}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        className="toc toc-rail"
        id={panelId}
        aria-label={label}
        data-mobile-open={mobileOpen}
        data-toc-mode={expansion.mode}
        data-toc-active={activeId || ""}
      >
        <div className="toc-header">
          <p>{label}</p>
          {tree.some((node) => node.children.length > 0) ? <div className="toc-mode-controls">
            <button
              type="button"
              data-toc-mode-toggle=""
              aria-controls={listId}
              aria-label={expansion.mode === "follow" ? t.tocExpandAll : t.tocResumeFollow}
              title={expansion.mode === "follow" ? t.tocExpandAll : t.tocResumeFollow}
              onClick={() => setExpansion({ mode: expansion.mode === "follow" ? "all" : "follow" })}
            >
              {expansion.mode === "follow" ? <ArrowsOutLineVertical size={18} aria-hidden="true" /> : <ArrowsInLineVertical size={18} aria-hidden="true" />}
            </button>
          </div> : null}
          <button
            ref={mobileCloseRef}
            className="toc-mobile-close"
            type="button"
            aria-label={`${t.close}${label}`}
            onClick={() => closeMobileToc(true)}
          >
            <X size={18} aria-hidden="true" />
          </button>
          <a className="toc-nojs-close" href={`#${TOC_CLOSED_ID}`} aria-label={`${t.close}${label}`}>
            <X size={18} aria-hidden="true" />
          </a>
        </div>
        <ol id={listId} ref={listRef} className="toc-list" role="list">
          {tree.map((node, index) => renderNode(node, [index]))}
        </ol>
      </aside>
    </>
  );
}
