"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export type SeriesEdgeItem = {
  path: string;
  href: string;
  title: string;
  current?: boolean;
};

/**
 * Left-edge Raschka ticks for column articles.
 * Flyout is the article list only (no column chrome).
 * Opens on hover or click; stays open until click-outside or Escape.
 */
export function SeriesEdgeNav({
  columnTitle,
  items,
}: {
  columnTitle: string;
  items: SeriesEdgeItem[];
  /** @deprecated kept optional so callers can pass it; not shown in the flyout */
  statusLabel?: string;
  lang?: string;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const currentIndex = Math.max(0, items.findIndex((item) => item.current));

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  const onTicksKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((value) => !value);
    } else if (event.key === "Escape") {
      close();
    }
  };

  return (
    <nav
      ref={rootRef}
      className="series-edge"
      aria-label={columnTitle}
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        className="series-edge-ticks"
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={columnTitle}
        onPointerEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onTicksKeyDown}
      >
        {items.map((item, index) => (
          <i
            key={item.path}
            className={index === currentIndex ? "hot" : undefined}
            aria-hidden="true"
          />
        ))}
      </button>
      {/* Hit bridge so the pointer can cross ticks → panel without a dead zone. */}
      <div
        className="series-edge-bridge"
        aria-hidden="true"
        onPointerEnter={() => setOpen(true)}
      />
      <div
        className="series-edge-fly"
        id={panelId}
        onPointerEnter={() => setOpen(true)}
      >
        <ol className="series-edge-list">
          {items.map((item) => (
            <li key={item.path} className={item.current ? "cur" : undefined}>
              <Link href={item.href} aria-current={item.current ? "page" : undefined}>
                {item.title}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
