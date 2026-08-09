"use client";

import { useEffect, useId, useRef, useState } from "react";

type Heading = { depth: number; text: string; id: string };

type TocSection = {
  heading: Heading;
  children: Heading[];
};

const groupHeadings = (headings: Heading[]) =>
  headings.reduce<TocSection[]>((sections, heading) => {
    const parent = sections.at(-1);
    if (heading.depth === 3 && parent?.heading.depth === 2) {
      parent.children.push(heading);
      return sections;
    }

    sections.push({ heading, children: [] });
    return sections;
  }, []);

const getReadingOffset = () => {
  const value = window.getComputedStyle(document.documentElement).scrollPaddingTop;
  const offset = Number.parseFloat(value);
  return Number.isFinite(offset) ? offset + 1 : 1;
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
  const listId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const sections = groupHeadings(headings);

  useEffect(() => {
    let frame = 0;
    const updateActiveHeading = () => {
      frame = 0;
      const readingOffset = getReadingOffset();
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
    if (!activeId) return;
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
  }, [activeId, collapsedSections]);

  const toggleSection = (id: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!headings.length) return null;

  return (
    <aside className="toc" aria-label={label}>
      <div className="toc-header">
        <p>{label}</p>
      </div>
      <ol id={listId} ref={listRef} className="toc-list">
        {sections.map(({ heading, children }, index) => {
          const collapsed = collapsedSections.has(heading.id);
          const childListId = `${listId}-${index}`;

          return (
            <li
              key={heading.id}
              className={`toc-section toc-depth-${heading.depth}${activeId === heading.id ? " active" : ""}`}
            >
              <div className="toc-item-row">
                <a
                  href={`#${heading.id}`}
                  onClick={() => setActiveId(heading.id)}
                  aria-current={activeId === heading.id ? "location" : undefined}
                >
                  {heading.text}
                </a>
                {children.length > 0 ? (
                  <button
                    className="toc-section-toggle"
                    type="button"
                    aria-controls={childListId}
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? "展开" : "收起"}「${heading.text}」的子目录`}
                    onClick={() => toggleSection(heading.id)}
                  >
                    <span aria-hidden="true">{collapsed ? "+" : "−"}</span>
                  </button>
                ) : null}
              </div>
              {children.length > 0 ? (
                <ol id={childListId} className="toc-sublist" hidden={collapsed}>
                  {children.map((child) => (
                    <li
                      key={child.id}
                      className={`toc-depth-${child.depth}${activeId === child.id ? " active" : ""}`}
                    >
                      <a
                        href={`#${child.id}`}
                        onClick={() => setActiveId(child.id)}
                        aria-current={activeId === child.id ? "location" : undefined}
                      >
                        {child.text}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
