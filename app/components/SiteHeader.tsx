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
import type Fuse from "fuse.js";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { brand, searchFull, searchIndexUrl } from "@garden/site-config";
import { createSearch } from "../../ui/garden/search-match.mjs";
import { cropMatchedText, highlightParts } from "../../ui/garden/search-preview.mjs";
import { resolveDark, themeSwitchProps } from "../../ui/garden/theme.mjs";
import { SITE_NAV, isCurrentNav } from "../../ui/garden/site-nav.mjs";
import { isHandbookPath, routeLang, ui } from "../lib/i18n";
import { HandbookLangSwitch } from "./HandbookLangSwitch";
import { createIdbStore, loadFullIndex, saveDataOn, whenIdleAfterLoad } from "../../ui/garden/search-full.mjs";
import { siteConfig } from "../site.config";
import { siteHref } from "../lib/site-href";

/** One entry of /search-index.json: titles, tags, dates and a short excerpt, never the full body. */
type SearchRecord = {
  title: string;
  description: string;
  section: string;
  path: string;
  content: string;
  tags?: string[];
  date?: string;
};

type SearchEngine = { records: SearchRecord[]; fuse: Fuse<SearchRecord> };
let engineLoad: Promise<SearchEngine> | null = null;

type MatchRange = readonly [number, number];
type SearchMatch = { key?: string; indices: readonly MatchRange[] };
type SearchHit = { item: SearchRecord; matches?: readonly SearchMatch[] };

let fullLoad: Promise<Map<string, string>> | null = null;

/**
 * Every body as plain text. Started in the background after the page has
 * loaded, or when search opens first; read from IndexedDB when this version
 * was fetched before.
 */
function loadFullText() {
  const scope = searchFull.url.slice(0, searchFull.url.lastIndexOf("/"));
  fullLoad ??= loadFullIndex({ url: searchFull.url, hash: searchFull.hash, store: createIdbStore(scope) })
    .then((docs) => new Map(docs))
    .catch((error: unknown) => {
      fullLoad = null;
      throw error;
    });
  return fullLoad;
}

/** Index and Fuse are fetched together, the first time search is about to open. */
function loadSearchEngine() {
  engineLoad ??= Promise.all([
    fetch(searchIndexUrl).then((response) => {
      if (!response.ok) throw new Error(`search index ${response.status}`);
      return response.json() as Promise<SearchRecord[]>;
    }),
    import("fuse.js"),
  ])
    .then(([records, { default: FuseClass }]) => ({
      records,
      fuse: new FuseClass(records, {
        keys: [
          { name: "title", weight: 0.5 },
          { name: "description", weight: 0.3 },
          { name: "tags", weight: 0.2 },
          { name: "content", weight: 0.15 },
        ],
        threshold: 0.36,
        ignoreLocation: true,
        includeMatches: true,
      }),
    }))
    .catch((error) => {
      engineLoad = null;
      throw error;
    });
  return engineLoad;
}

const nav = SITE_NAV.map((item) => ({ ...item, key: item.href, href: siteHref(item.href) }));

function rangesFor(
  matches: readonly SearchMatch[] | undefined,
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
  return (
    <>
      {highlightParts(text, ranges).map((part, index) =>
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

type SearchPreview = { prefix: string; text: string; suffix: string; ranges: readonly MatchRange[] };

function searchPreview(
  item: SearchRecord,
  matches: readonly SearchMatch[] | undefined,
): SearchPreview {
  const descriptionRanges = rangesFor(matches, "description");
  if (descriptionRanges.length) {
    return cropMatchedText(item.description, descriptionRanges) as SearchPreview;
  }

  const contentRanges = rangesFor(matches, "content");
  if (contentRanges.length) {
    return cropMatchedText(item.content, contentRanges) as SearchPreview;
  }

  return { prefix: "", text: item.description, suffix: "", ranges: [] };
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const t = ui(routeLang(pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchPanelRef = useRef<HTMLElement>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const [engineFailed, setEngineFailed] = useState(false);
  const [fullText, setFullText] = useState<Map<string, string> | null>(null);
  const prefetchSearch = useCallback(() => {
    loadSearchEngine().then(setEngine, () => setEngineFailed(true));
  }, []);

  // Full text arrives quietly once the page is done; search upgrades when it lands.
  useEffect(() => {
    if (saveDataOn()) return;
    return whenIdleAfterLoad(() => {
      loadFullText().then(setFullText, () => {});
    });
  }, []);

  const openSearch = useCallback(() => {
    setEngineFailed(false);
    loadSearchEngine().then(setEngine, () => setEngineFailed(true));
    loadFullText().then(setFullText, () => {});
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

  // One theme for the desktop button and the mobile menu switch. Until the
  // reader picks one, it follows the system, also when the system changes.
  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const stored = window.localStorage.getItem("theme");
      const useDark = resolveDark(stored, system.matches);
      document.documentElement.dataset.theme = useDark ? "dark" : "light";
      setDark(useDark);
    };
    const frame = window.requestAnimationFrame(apply);
    system.addEventListener("change", apply);
    return () => {
      window.cancelAnimationFrame(frame);
      system.removeEventListener("change", apply);
    };
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

  // Excerpts first, full text once it is here. Typos fall back to Fuse's fuzzy match.
  const matcher = useMemo(() => (engine ? createSearch(engine.records, fullText) : null), [engine, fullText]);
  // The list shows the best few; the label counts every match.
  const { hits: results, total: resultTotal } = useMemo((): { hits: SearchHit[]; total: number } => {
    if (!engine || !matcher) return { hits: [], total: 0 };
    if (!query.trim()) {
      const recent = engine.records.slice(0, 5).map((item) => ({ item, matches: [] }));
      return { hits: recent, total: recent.length };
    }
    const exact = matcher.find(query, 6) as unknown as { hits: SearchHit[]; total: number };
    if (exact.total) return exact;
    const fuzzy = engine.fuse.search(query);
    return { hits: fuzzy.slice(0, 6), total: fuzzy.length };
  }, [engine, matcher, query]);

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

  const current = (href: string) => isCurrentNav(pathname, href);

  return (
    <>
      {/* Targets for the no-JavaScript menu links below. Fixed and outside the sticky header, so
          following #sh-menu-on or #sh-menu-off never scrolls the page (the TOC drawer works the same way). */}
      <span className="sh-menu-target" id="sh-menu-on" aria-hidden="true" />
      <span className="sh-menu-target" id="sh-menu-off" aria-hidden="true" />
      <header className="sh-header" id="site-header">
        <div className="sh-bar">
          <Link href="/" className="sh-word">
            {/* Build-time SVG from brand.logo, cleaned of scripts and handlers. */}
            {brand.logo ? <span className="sh-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: brand.logo }} /> : null}
            {siteConfig.name}
          </Link>
          <nav className="sh-nav" aria-label={t.siteNav}>
            {nav.map((item) => (
              <Link key={item.href} href={item.href} aria-current={current(item.href) ? "page" : undefined}>
                {t.navLabels[item.key] ?? item.label}
              </Link>
            ))}
          </nav>
          <div className="sh-tools">
            <button ref={searchTriggerRef} className="sh-search" type="button" onClick={openSearch} onPointerEnter={prefetchSearch} onFocus={prefetchSearch} aria-label={t.searchArticles} aria-expanded={searchOpen} aria-controls="site-search-dialog">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" />
                <path d="M13.3 13.3 17 17" />
              </svg>
              <span className="lbl">{t.search}</span>
              <kbd><span className="kbd-mod kbd-mac">⌘</span><span className="kbd-mod kbd-other">Ctrl</span>{" "}K</kbd>
            </button>
            <button className="sh-icon sh-search-m" type="button" onClick={openSearch} onPointerDown={prefetchSearch} aria-label={t.searchArticles}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" />
                <path d="M13.3 13.3 17 17" />
              </svg>
            </button>
            {isHandbookPath(pathname) ? <HandbookLangSwitch /> : null}
            <button className="sh-icon sh-theme" type="button" onClick={toggleTheme} aria-label={dark ? t.toLight : t.toDark}>
              <svg className="i-moon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16.5 12.2A6.8 6.8 0 0 1 7.8 3.5a6.8 6.8 0 1 0 8.7 8.7Z" />
              </svg>
              <svg className="i-sun" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="3.6" />
                <path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
              </svg>
            </button>
            <button className="sh-icon sh-menu-btn" type="button" aria-expanded={menuOpen} aria-controls="sh-menu" aria-label={menuOpen ? t.closeMenu : t.openMenu} onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={18} /> : <span aria-hidden="true">☰</span>}
            </button>
            {/* Without JavaScript the button above cannot open anything: these two links take its place
                and open or close the menu through :target on the fixed anchors above (shell.css). */}
            <a className="sh-icon sh-menu-nojs" id="sh-menu-open" href="#sh-menu-on" aria-label={t.openMenu}>
              <span aria-hidden="true">☰</span>
            </a>
            <a className="sh-icon sh-menu-nojs-close" href="#sh-menu-off" aria-label={t.closeMenu}>
              <X size={18} />
            </a>
          </div>
        </div>
        <nav className={`sh-menu${menuOpen ? " is-open" : ""}`} id="sh-menu" aria-label={t.siteNavMobile}>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current(item.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              {t.navLabels[item.key] ?? item.label}
            </Link>
          ))}
          <button className="sh-menu-theme" {...themeSwitchProps(dark, toggleTheme)}>
            <span>{t.darkMode}</span>
            <span className="sh-switch" aria-hidden="true" />
          </button>
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
              {t.searchTitle}
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
                placeholder={t.searchPlaceholder}
                aria-label={t.searchInput}
                role="combobox"
                aria-expanded="true"
                aria-autocomplete="list"
                aria-controls="site-search-results"
                aria-activedescendant={
                  activeResult >= 0 ? `site-search-result-${activeResult}` : undefined
                }
              />
              <button onClick={closeSearch} aria-label={t.closeSearch}>
                <X size={19} />
              </button>
            </div>
            <div
              className="search-results"
              id="site-search-results"
              role="listbox"
              aria-label={t.searchResults}
            >
              {query && engine && resultTotal === 0 ? null : (
                <p className="search-label">
                  {query ? t.resultCount(resultTotal) : t.recent}
                </p>
              )}
              {results.map((result, index) => {
                const preview = searchPreview(result.item, result.matches);
                return (
                  <Link
                    key={`${result.item.path}-${result.item.title}`}
                    id={`site-search-result-${index}`}
                    ref={(node) => {
                      resultRefs.current[index] = node;
                    }}
                    href={siteHref(result.item.path)}
                    onClick={closeSearch}
                    onFocus={() => setActiveResult(index)}
                    role="option"
                    aria-selected={activeResult === index}
                    className={`search-result${activeResult === index ? " active" : ""}`}
                  >
                    {result.item.section ? (
                      <span className="search-chip">
                        {result.item.section}
                      </span>
                    ) : null}
                    <strong>
                      <HighlightedText
                        text={result.item.title}
                        ranges={rangesFor(result.matches, "title")}
                      />
                    </strong>
                    <small>
                      {/* The 「…」 sit outside the highlight. */}
                      {preview.prefix}
                      <HighlightedText text={preview.text} ranges={preview.ranges} />
                      {preview.suffix}
                    </small>
                  </Link>
                );
              })}
              {results.length === 0 && (
                <p className="empty-state">
                  {/* The query is a React text child, so it is escaped. */}
                  {engine ? t.noResults(query.trim()) : engineFailed ? t.searchFailed : t.loading}
                </p>
              )}
            </div>
            <footer className="search-footer">
              <span>{t.fuzzy}</span>
              <span><kbd>ESC</kbd> {t.escToClose}</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
