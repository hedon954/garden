"use client";

import { TOC_PANEL_ID, TOC_CONTROL_ID, TOC_CLOSED_ID } from "../lib/reading-navigation";
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
import { GithubLogo, MagnifyingGlass, X } from "@phosphor-icons/react";
import { brand, docsSearchEn, searchFull, searchIndexUrl } from "@garden/site-config";
import { createSearch } from "../../ui/garden/search-match.mjs";
import { cropMatchedText, highlightParts } from "../../ui/garden/search-preview.mjs";
import { resolveDark, themeSwitchProps } from "../../ui/garden/theme.mjs";
import { inAppPath, routeLang, ui } from "../lib/i18n";
import { HandbookLangSwitch } from "./HandbookLangSwitch";
import { createIdbStore, loadFullIndex, saveDataOn, whenIdleAfterLoad } from "../../ui/garden/search-full.mjs";
import { HANDBOOK_SECTIONS, handbookBase, handbookPath, sectionTitle } from "../lib/garden-docs-meta";
import { siteHref } from "../lib/site-href";

type SearchRecord = {
  title: string;
  description: string;
  section: string;
  path: string;
  content: string;
  tags?: string[];
};

type SearchEngine = { records: SearchRecord[]; fuse: Fuse<SearchRecord> };
const engineCache = new Map<string, Promise<SearchEngine>>();
const fullCache = new Map<string, Promise<Map<string, string>>>();

type MatchRange = readonly [number, number];
type SearchMatch = { key?: string; indices: readonly MatchRange[] };
type SearchHit = { item: SearchRecord; matches?: readonly SearchMatch[] };

function loadDocsFullText(target: { url: string; hash: string }) {
  const key = `${target.url}:${target.hash}`;
  let pending = fullCache.get(key);
  if (!pending) {
    const scope = target.url.slice(0, target.url.lastIndexOf("/"));
    pending = loadFullIndex({ url: target.url, hash: target.hash, store: createIdbStore(`${scope}-docs`) })
      .then((docs) => new Map(docs))
      .catch((error: unknown) => {
        fullCache.delete(key);
        throw error;
      });
    fullCache.set(key, pending);
  }
  return pending;
}

function loadDocsSearchEngine(indexUrl: string) {
  let pending = engineCache.get(indexUrl);
  if (!pending) {
    pending = Promise.all([
      fetch(indexUrl).then((response) => {
        if (!response.ok) throw new Error(`docs search index ${response.status}`);
        return response.json() as Promise<SearchRecord[]>;
      }),
      import("fuse.js"),
    ])
      .then(([records, { default: FuseClass }]) => ({
        records,
        fuse: new FuseClass(records, {
          keys: [
            { name: "title", weight: 0.55 },
            { name: "description", weight: 0.3 },
            { name: "tags", weight: 0.2 },
            { name: "content", weight: 0.15 },
          ],
          threshold: 0.34,
          ignoreLocation: true,
          includeMatches: true,
        }),
      }))
      .catch((error) => {
        engineCache.delete(indexUrl);
        throw error;
      });
    engineCache.set(indexUrl, pending);
  }
  return pending;
}

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

const DOCS_CHROME = {
  zh: {
    brandBadge: "文档",
    searchLabel: "搜索文档",
    searchTitle: "搜索 Garden 用户手册",
    searchPlaceholder: "搜索指南、组件、配置项或命令…",
    recent: "常用章节",
    resultCount: (n: number) => `${n} 篇相关文档`,
    noResults: (q: string) => (q ? `手册中没有找到和「${q}」相关的章节` : "输入关键词搜索用户手册"),
    githubLabel: "Garden GitHub 仓库",
  },
  en: {
    brandBadge: "Docs",
    searchLabel: "Search docs",
    searchTitle: "Search Garden Handbook",
    searchPlaceholder: "Search guides, components, config keys or CLI…",
    recent: "Quick links",
    resultCount: (n: number) => `${n} matching ${n === 1 ? "page" : "pages"}`,
    noResults: (q: string) => (q ? `No handbook pages match “${q}”` : "Type to search the handbook"),
    githubLabel: "Garden on GitHub",
  },
} as const;

export function DocsHeader() {
  const pathname = usePathname() || "/";
  const lang = routeLang(pathname);
  const t = ui(lang);
  const copy = DOCS_CHROME[lang];
  const hasEnglishDocs = Boolean(docsSearchEn);
  const activeSearchConfig = lang === "en" && docsSearchEn
    ? { indexUrl: docsSearchEn.indexUrl, full: docsSearchEn.full }
    : { indexUrl: searchIndexUrl, full: searchFull };

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
    loadDocsSearchEngine(activeSearchConfig.indexUrl).then(setEngine, () => setEngineFailed(true));
  }, [activeSearchConfig.indexUrl]);

  useEffect(() => {
    if (saveDataOn()) return;
    return whenIdleAfterLoad(() => {
      loadDocsFullText(activeSearchConfig.full).then(setFullText, () => {});
    });
  }, [activeSearchConfig.full]);

  const openSearch = useCallback(() => {
    setEngineFailed(false);
    loadDocsSearchEngine(activeSearchConfig.indexUrl).then(setEngine, () => setEngineFailed(true));
    loadDocsFullText(activeSearchConfig.full).then(setFullText, () => {});
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : searchTriggerRef.current;
    setSearchOpen(true);
  }, [activeSearchConfig.full, activeSearchConfig.indexUrl]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setActiveResult(-1);
    window.requestAnimationFrame(() => {
      (previousFocusRef.current ?? searchTriggerRef.current)?.focus();
    });
  }, [setActiveResult, setSearchOpen]);

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem("theme");
      } catch {}
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
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape" && searchOpen) closeSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSearch, openSearch, searchOpen]);

  const matcher = useMemo(() => (engine ? createSearch(engine.records, fullText) : null), [engine, fullText]);
  const { hits: results, total: resultTotal } = useMemo((): { hits: SearchHit[]; total: number } => {
    if (!engine || !matcher) return { hits: [], total: 0 };
    if (!query.trim()) {
      const recent = engine.records.slice(0, 6).map((item) => ({ item, matches: [] }));
      return { hits: recent, total: recent.length };
    }
    const exact = matcher.find(query, 8) as unknown as { hits: SearchHit[]; total: number };
    if (exact.total) return exact;
    const fuzzy = engine.fuse.search(query);
    return { hits: fuzzy.slice(0, 8), total: fuzzy.length };
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

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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
    try {
      window.localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  const cleanInApp = inAppPath(pathname).replace(/^\/en(?=\/|$)/u, "") || "/";
  const topNav = HANDBOOK_SECTIONS.map((sec) => ({
    id: sec.id,
    label: sectionTitle(sec, lang) ?? sec.title,
    href: siteHref(handbookPath(lang, sec.overviewPath)),
    active:
      cleanInApp === `/${sec.overviewPath}` ||
      cleanInApp.startsWith(`/${sec.overviewPath}/`),
  }));

  return (
    <>
      <span className="sh-menu-target" id={TOC_CLOSED_ID} aria-hidden="true" />
      <span className="sh-menu-target" id="sh-menu-on" aria-hidden="true" />
      <span className="sh-menu-target" id="sh-menu-off" aria-hidden="true" />
      <header className="sh-header gdoc-top-header" id="site-header">
        <div className="sh-bar">
          <Link href={siteHref(handbookBase(lang))} className="sh-word">
            {brand.logo ? <span className="sh-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: brand.logo }} /> : null}
            <span>Garden</span>
            <span className="gdoc-brand-pill">{copy.brandBadge}</span>
          </Link>
          <nav className="sh-nav" aria-label={t.siteNav}>
            {topNav.map((item) => (
              <Link key={item.id} href={item.href} aria-current={item.active ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sh-tools">
            <span id={TOC_CONTROL_ID} className="sh-reading-control">
              <a className="toc-header-nojs" href={`#${TOC_PANEL_ID}`} aria-label={t.toc}>
                {t.tocShort}
              </a>
            </span>
            <button
              ref={searchTriggerRef}
              className="sh-search"
              type="button"
              onClick={openSearch}
              onPointerEnter={prefetchSearch}
              onFocus={prefetchSearch}
              aria-label={copy.searchLabel}
              aria-expanded={searchOpen}
              aria-controls="site-search-dialog"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" />
                <path d="M13.3 13.3 17 17" />
              </svg>
              <span className="lbl">{copy.searchLabel}</span>
              <kbd><span className="kbd-mod kbd-mac">⌘</span><span className="kbd-mod kbd-other">Ctrl</span>{" "}K</kbd>
            </button>
            <button className="sh-icon sh-search-m" type="button" onClick={openSearch} onPointerDown={prefetchSearch} aria-label={copy.searchLabel}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="9" cy="9" r="5.8" />
                <path d="M13.3 13.3 17 17" />
              </svg>
            </button>
            {hasEnglishDocs ? <HandbookLangSwitch /> : null}
            <a
              className="sh-icon"
              href="https://github.com/hedon954/garden"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.githubLabel}
              title="GitHub"
            >
              <GithubLogo size={18} aria-hidden="true" />
            </a>
            <button className="sh-icon sh-theme" type="button" onClick={toggleTheme} aria-label={dark ? t.toLight : t.toDark}>
              <svg className="i-moon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16.5 12.2A6.8 6.8 0 0 1 7.8 3.5a6.8 6.8 0 1 0 8.7 8.7Z" />
              </svg>
              <svg className="i-sun" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="3.6" />
                <path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
              </svg>
            </button>
            <button
              className="sh-icon sh-menu-btn"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="sh-menu"
              aria-label={menuOpen ? t.closeMenu : t.openMenu}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={18} /> : <span aria-hidden="true">☰</span>}
            </button>
            <a className="sh-icon sh-menu-nojs" id="sh-menu-open" href="#sh-menu-on" aria-label={t.openMenu}>
              <span aria-hidden="true">☰</span>
            </a>
            <a className="sh-icon sh-menu-nojs-close" href="#sh-menu-off" aria-label={t.closeMenu}>
              <X size={18} />
            </a>
          </div>
        </div>
        <nav className={`sh-menu${menuOpen ? " is-open" : ""}`} id="sh-menu" aria-label={t.siteNavMobile}>
          {topNav.map((item) => (
            <Link key={item.id} href={item.href} aria-current={item.active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          <a href="https://github.com/hedon954/garden" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
            GitHub
          </a>
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
              {copy.searchTitle}
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
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchLabel}
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
                  {query ? copy.resultCount(resultTotal) : copy.recent}
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
                      {preview.prefix}
                      <HighlightedText text={preview.text} ranges={preview.ranges} />
                      {preview.suffix}
                    </small>
                  </Link>
                );
              })}
              {results.length === 0 && (
                <p className="empty-state">
                  {engine ? copy.noResults(query.trim()) : engineFailed ? t.searchFailed : t.loading}
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
