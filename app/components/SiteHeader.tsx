"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Fuse, { type FuseResultMatch } from "fuse.js";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { searchRecords } from "../lib/content";
import { siteConfig } from "../site.config";
import { SiteMark } from "./SiteMark";

const nav = [
  { href: "/blog", label: "文章" },
  { href: "/thoughts", label: "随想" },
  { href: "/columns", label: "专栏" },
  { href: "/tags", label: "标签" },
  { href: "/about", label: "关于" },
];

type MatchRange = readonly [number, number];

function rangesFor(
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
): readonly MatchRange[] {
  return matches?.find((match) => match.key === key)?.indices ?? [];
}

function HighlightedText({
  text,
  ranges,
}: {
  text: string;
  ranges: readonly MatchRange[];
}) {
  if (!ranges.length) return text;

  const merged = [...ranges]
    .sort((left, right) => left[0] - right[0])
    .reduce<MatchRange[]>((result, range) => {
      const previous = result.at(-1);
      if (previous && range[0] <= previous[1] + 1) {
        result[result.length - 1] = [
          previous[0],
          Math.max(previous[1], range[1]),
        ];
      } else {
        result.push(range);
      }
      return result;
    }, []);

  const parts: Array<{ text: string; matched: boolean }> = [];
  let cursor = 0;
  merged.forEach(([start, end]) => {
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), matched: false });
    }
    parts.push({ text: text.slice(start, end + 1), matched: true });
    cursor = end + 1;
  });
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), matched: false });
  }

  return (
    <>
      {parts.map((part, index) =>
        part.matched ? (
          <mark className="search-match" key={`${part.text}-${index}`}>
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

function cropMatchedText(text: string, ranges: readonly MatchRange[]) {
  if (!ranges.length) return { text, ranges };

  const [focusStart, focusEnd] = ranges[0];
  let start = Math.max(0, focusStart - 42);
  let end = Math.min(text.length, Math.max(focusEnd + 52, start + 112));

  if (start > 0) {
    const nextSpace = text.indexOf(" ", start);
    if (nextSpace !== -1 && nextSpace < focusStart) start = nextSpace + 1;
  }
  if (end < text.length) {
    const previousSpace = text.lastIndexOf(" ", end);
    if (previousSpace > focusEnd) end = previousSpace;
  }

  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  const visibleRanges = ranges
    .filter(([rangeStart, rangeEnd]) => rangeEnd >= start && rangeStart < end)
    .map(
      ([rangeStart, rangeEnd]) =>
        [
          Math.max(rangeStart, start) - start + prefix.length,
          Math.min(rangeEnd, end - 1) - start + prefix.length,
        ] as MatchRange,
    );

  return {
    text: `${prefix}${text.slice(start, end)}${suffix}`,
    ranges: visibleRanges,
  };
}

function searchPreview(
  item: (typeof searchRecords)[number],
  matches: readonly FuseResultMatch[] | undefined,
): { text: string; ranges: readonly MatchRange[] } {
  const descriptionRanges = rangesFor(matches, "description");
  if (descriptionRanges.length) {
    return cropMatchedText(item.description, descriptionRanges);
  }

  const contentRanges = rangesFor(matches, "content");
  if (contentRanges.length) {
    return cropMatchedText(item.content, contentRanges);
  }

  return { text: item.description, ranges: [] };
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchPanelRef = useRef<HTMLElement>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const openSearch = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : searchTriggerRef.current;
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setActiveResult(-1);
    window.requestAnimationFrame(() => {
      (previousFocusRef.current ?? searchTriggerRef.current)?.focus();
    });
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const useDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = useDark ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => setDark(useDark));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    document.documentElement.dataset.mod = isMac ? "mac" : "other";
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape" && searchOpen) closeSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSearch, openSearch, searchOpen]);

  const fuse = useMemo(
    () =>
      new Fuse(searchRecords, {
        keys: [
          { name: "title", weight: 0.5 },
          { name: "description", weight: 0.3 },
          { name: "content", weight: 0.15 },
          { name: "topic", weight: 0.05 },
        ],
        threshold: 0.36,
        ignoreLocation: true,
        includeMatches: true,
      }),
    [],
  );

  const results = query.trim()
    ? fuse.search(query).slice(0, 6)
    : searchRecords.slice(0, 5).map((item) => ({ item, matches: [] }));

  useEffect(() => {
    if (!searchOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [searchOpen]);

  const moveResultFocus = (direction: 1 | -1) => {
    if (!results.length) return;
    const next =
      activeResult < 0
        ? direction === 1
          ? 0
          : results.length - 1
        : (activeResult + direction + results.length) % results.length;
    setActiveResult(next);
    resultRefs.current[next]?.focus();
  };

  const handleSearchKeyDown = (
    event: KeyboardEvent<HTMLElement>,
  ) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveResultFocus(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (
      event.key === "Enter" &&
      activeResult >= 0 &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
      resultRefs.current[activeResult]?.click();
      return;
    }
    if (event.key !== "Tab" || !searchPanelRef.current) return;

    const focusable = Array.from(
      searchPanelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("theme", next ? "dark" : "light");
  };

  const current = (href: string) => {
    if (href === "/blog") {
      return pathname === "/blog" || pathname.startsWith("/blog/") || pathname.startsWith("/a2/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="sh-header">
        <div className="sh-bar">
          <Link href="/" className="sh-word">
            <SiteMark src={siteConfig.logo} />
            {siteConfig.name}
          </Link>
          <nav className="sh-nav" aria-label="站点导航">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} aria-current={current(item.href) ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sh-tools">
            <button
              ref={searchTriggerRef}
              className="sh-search"
              type="button"
              onClick={openSearch}
              aria-label="搜索文章"
              aria-expanded={searchOpen}
              aria-controls="site-search-dialog"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" />
                <path d="M13.3 13.3 17 17" />
              </svg>
              <span className="lbl">搜索</span>
              <kbd aria-hidden="true">
                <span className="kbd-mod kbd-mac">⌘</span>
                <span className="kbd-mod kbd-other">Ctrl </span>
                K
              </kbd>
            </button>
            <button className="sh-icon sh-theme" type="button" onClick={toggleTheme} aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}>
              <svg className="i-moon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16.5 12.2A6.8 6.8 0 0 1 7.8 3.5a6.8 6.8 0 1 0 8.7 8.7Z" />
              </svg>
              <svg className="i-sun" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="3.6" />
                <path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
              </svg>
            </button>
            <button className="sh-icon sh-menu-btn" type="button" aria-expanded={menuOpen} aria-controls="sh-menu" aria-label={menuOpen ? "关闭菜单" : "打开菜单"} onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={18} /> : <span aria-hidden="true">☰</span>}
            </button>
          </div>
        </div>
        <nav className={`sh-menu${menuOpen ? " is-open" : ""}`} id="sh-menu" aria-label="站点导航（移动端）">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current(item.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {searchOpen && (
        <div
          className="search-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeSearch();
          }}
        >
          <section
            ref={searchPanelRef}
            id="site-search-dialog"
            className="search-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-search-title"
            onKeyDown={handleSearchKeyDown}
          >
            <h2 className="sr-only" id="site-search-title">
              搜索站内内容
            </h2>
            <div className="search-input-wrap">
              <MagnifyingGlass size={20} aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveResult(-1);
                  resultRefs.current = [];
                }}
                placeholder="搜索标题、主题或正文…"
                aria-label="模糊搜索"
                role="combobox"
                aria-expanded="true"
                aria-autocomplete="list"
                aria-controls="site-search-results"
                aria-activedescendant={
                  activeResult >= 0 ? `site-search-result-${activeResult}` : undefined
                }
              />
              <button onClick={closeSearch} aria-label="关闭搜索">
                <X size={19} />
              </button>
            </div>
            <div
              className="search-results"
              id="site-search-results"
              role="listbox"
              aria-label="搜索结果"
            >
              <p className="search-label">
                {query ? `${results.length} 个相关结果` : "最近内容"}
              </p>
              {results.map((result, index) => {
                const preview = searchPreview(result.item, result.matches);
                return (
                  <Link
                    key={`${result.item.path}-${result.item.title}`}
                    id={`site-search-result-${index}`}
                    ref={(node) => {
                      resultRefs.current[index] = node;
                    }}
                    href={result.item.path}
                    onClick={closeSearch}
                    onFocus={() => setActiveResult(index)}
                    role="option"
                    aria-selected={activeResult === index}
                    className={`search-result${activeResult === index ? " active" : ""}`}
                  >
                    <span>
                      <HighlightedText
                        text={result.item.topic}
                        ranges={rangesFor(result.matches, "topic")}
                      />
                    </span>
                    <strong>
                      <HighlightedText
                        text={result.item.title}
                        ranges={rangesFor(result.matches, "title")}
                      />
                    </strong>
                    <small>
                      <HighlightedText text={preview.text} ranges={preview.ranges} />
                    </small>
                  </Link>
                );
              })}
              {results.length === 0 && (
                <p className="empty-state">没有找到，换个更宽松的关键词试试。</p>
              )}
            </div>
            <footer className="search-footer">
              <span>支持模糊匹配</span>
              <span>ESC 关闭</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
