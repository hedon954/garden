"use client";

import { useEffect, useState } from "react";

export function TableOfContents({
  headings,
  label = "本篇目录",
}: {
  headings: Array<{ depth: number; text: string; id: string }>;
  label?: string;
}) {
  const [activeId, setActiveId] = useState(headings[0]?.id);

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

  if (!headings.length) return null;

  return (
    <aside className="toc" aria-label={label}>
      <p>{label}</p>
      <ol>
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
