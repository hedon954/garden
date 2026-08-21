"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { List, X } from "@phosphor-icons/react";

type Heading = { depth: number; text: string; id: string };

type TocNode = Heading & { children: TocNode[] };

const nestHeadings = (headings: Heading[]) => {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const heading of headings) {
    const node: TocNode = { ...heading, children: [] };
    while (stack.at(-1) && stack.at(-1)!.depth >= heading.depth) {
      stack.pop();
    }

    const parent = stack.at(-1);
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  }

  return roots;
};

const getScrollPaddingTop = () => {
  const value = window.getComputedStyle(document.documentElement).scrollPaddingTop;
  const offset = Number.parseFloat(value);
  return Number.isFinite(offset) ? offset : 0;
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

export function TableOfContents({
  headings,
  label = "本篇目录",
}: {
  headings: Heading[];
  label?: string;
}) {
  const [activeId, setActiveId] = useState(headings[0]?.id);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(),
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelId = useId();
  const listId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const restoreMobileTriggerFocusRef = useRef(false);
  const anchorCleanupRef = useRef<(() => void) | undefined>(undefined);
  const tree = nestHeadings(headings);

  const closeMobileToc = useCallback((restoreFocus = false) => {
    restoreMobileTriggerFocusRef.current = restoreFocus;
    setMobileOpen(false);
  }, []);

  const alignHeadingToAnchor = useCallback(
    (id: string, behavior: ScrollBehavior) => {
      const target = document.getElementById(id);
      if (!target) return;

      const delta = target.getBoundingClientRect().top - getScrollPaddingTop();
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior });
    },
    [],
  );

  const trackAnchorLayout = useCallback(
    (id: string, behavior: ScrollBehavior) => {
      anchorCleanupRef.current?.();
      const target = document.getElementById(id);
      if (!target) return;

      let frame = 0;
      let timeout = 0;
      const article = target.closest("article");
      const pendingImages = article
        ? Array.from(article.querySelectorAll("img")).filter(
            (image) =>
              !image.complete &&
              Boolean(
                image.compareDocumentPosition(target) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
              ),
          )
        : [];

      const cleanup = () => {
        if (frame) window.cancelAnimationFrame(frame);
        if (timeout) window.clearTimeout(timeout);
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
      const scheduleAlignment = (nextBehavior: ScrollBehavior) => {
        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          if (getHashHeadingId() === id) {
            alignHeadingToAnchor(id, nextBehavior);
          }
        });
      };
      function realign() {
        scheduleAlignment("auto");
      }

      for (const image of pendingImages) {
        image.addEventListener("load", realign, { once: true });
        image.addEventListener("error", realign, { once: true });
      }
      window.addEventListener("wheel", cleanup, { passive: true });
      window.addEventListener("touchstart", cleanup, { passive: true });
      window.addEventListener("pointerdown", cleanup, { passive: true });
      window.addEventListener("keydown", cleanup);
      timeout = window.setTimeout(cleanup, 15_000);
      anchorCleanupRef.current = cleanup;
      scheduleAlignment(behavior);
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
            ?.id ?? visibleHeadings[0]?.id;

      if (current) setActiveId((previous) => (previous === current ? previous : current));
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
    const syncHashAnchor = () => {
      const id = getHashHeadingId();
      if (!headings.some((heading) => heading.id === id)) return;
      setActiveId(id);
      trackAnchorLayout(id, "auto");
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
      if (event.key === "Escape") closeMobileToc(true);
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
    if (!list || !activeItem) return;

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
  }, [activeId, collapsedSections, mobileOpen]);

  const toggleSection = (id: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    trackAnchorLayout(id, reduceMotion ? "auto" : "smooth");
  };

  const renderNode = (node: TocNode, path: number[]): ReactNode => {
    const collapsed = collapsedSections.has(node.id);
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
              aria-label={`${collapsed ? "展开" : "收起"}「${node.text}」的子目录`}
              onClick={() => toggleSection(node.id)}
            >
              <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
            </button>
          ) : null}
        </div>
        {node.children.length > 0 ? (
          <ol id={childListId} className="toc-sublist" hidden={collapsed}>
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
      <button
        ref={mobileTriggerRef}
        className="toc-mobile-trigger"
        type="button"
        aria-controls={panelId}
        aria-expanded={mobileOpen}
        aria-label={`打开${label}${activeHeading ? `，当前章节：${activeHeading.text}` : ""}`}
        tabIndex={mobileOpen ? -1 : 0}
        data-mobile-open={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <List size={17} weight="bold" aria-hidden="true" />
        <span>目录</span>
      </button>
      <button
        className="toc-mobile-backdrop"
        type="button"
        aria-label={`关闭${label}`}
        tabIndex={mobileOpen ? 0 : -1}
        data-mobile-open={mobileOpen}
        onClick={() => closeMobileToc(true)}
      />
      <aside
        className="toc"
        id={panelId}
        aria-label={label}
        data-mobile-open={mobileOpen}
      >
        <div className="toc-header">
          <p>{label}</p>
          <button
            ref={mobileCloseRef}
            className="toc-mobile-close"
            type="button"
            aria-label={`关闭${label}`}
            onClick={() => closeMobileToc(true)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <ol id={listId} ref={listRef} className="toc-list">
          {tree.map((node, index) => renderNode(node, [index]))}
        </ol>
      </aside>
    </>
  );
}
