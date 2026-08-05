"use client";

import { useEffect, useId, useRef, useState } from "react";

export function TableOfContents({
  headings,
  label = "本篇目录",
}: {
  headings: Array<{ depth: number; text: string; id: string }>;
  label?: string;
}) {
  const [activeId, setActiveId] = useState(headings[0]?.id);
  const [collapsed, setCollapsed] = useState(false);
  const listId = useId();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let frame = 0;
    const updateActiveHeading = () => {
      frame = 0;
      const readingOffset = 140;
      const visibleHeadings = headings
        .map((heading) => ({
          id: heading.id,
          top: document.getElementById(heading.id)?.getBoundingClientRect().top,
        }))
        .filter((heading): heading is { id: string; top: number } => heading.top !== undefined);
      const current = visibleHeadings
        .filter((heading) => heading.top <= readingOffset)
        .at(-1)?.id ?? visibleHeadings[0]?.id;

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
    if (collapsed || !activeId) return;
    const list = listRef.current;
    const activeItem = list?.querySelector<HTMLElement>("li.active");
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
  }, [activeId, collapsed]);

  if (!headings.length) return null;

  return (
    <aside className={`toc${collapsed ? " is-collapsed" : ""}`} aria-label={label}>
      <div className="toc-header">
        <p>{label}</p>
        <button
          className="toc-toggle"
          type="button"
          aria-controls={listId}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "展开" : "收起"}${label}`}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
        </button>
      </div>
      <ol id={listId} ref={listRef} hidden={collapsed}>
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={`toc-depth-${heading.depth}${activeId === heading.id ? " active" : ""}`}
          >
            <a
              href={`#${heading.id}`}
              onClick={() => setActiveId(heading.id)}
              aria-current={activeId === heading.id ? "location" : undefined}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
