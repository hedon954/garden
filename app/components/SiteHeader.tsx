"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import {
  Cactus,
  MagnifyingGlass,
  Moon,
  Sun,
  X,
} from "@phosphor-icons/react";
import { searchRecords } from "../lib/content";

const nav = [
  { href: "/", label: "首页" },
  { href: "/blog", label: "博文" },
  { href: "/thoughts", label: "随想" },
  { href: "/columns", label: "专栏" },
  { href: "/about", label: "关于" },
];

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const useDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(useDark);
    document.documentElement.dataset.theme = useDark ? "dark" : "light";
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      }),
    [],
  );

  const results = query.trim()
    ? fuse.search(query).slice(0, 6).map((result) => result.item)
    : searchRecords.slice(0, 5);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Hedon Log 首页">
            <span className="brand-mark">
              <Cactus size={34} weight="thin" aria-hidden="true" />
            </span>
            <span>
              <strong>Hedon Log</strong>
              <small>写作 · 构建 · 保持好奇</small>
            </span>
          </Link>

          <nav className="main-nav" aria-label="主导航">
            {nav.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <button
              className="icon-button search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="搜索文章"
            >
              <MagnifyingGlass size={22} weight="regular" />
              <span className="key-hint">⌘K</span>
            </button>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
            >
              {dark ? <Sun size={23} /> : <Moon size={23} />}
            </button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          className="search-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSearchOpen(false);
          }}
        >
          <section className="search-panel" role="dialog" aria-modal="true">
            <div className="search-input-wrap">
              <MagnifyingGlass size={20} aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、主题或正文…"
                aria-label="模糊搜索"
              />
              <button onClick={() => setSearchOpen(false)} aria-label="关闭搜索">
                <X size={19} />
              </button>
            </div>
            <div className="search-results">
              <p className="search-label">
                {query ? `${results.length} 个相关结果` : "最近内容"}
              </p>
              {results.map((item) => (
                <Link
                  key={`${item.path}-${item.title}`}
                  href={item.path}
                  onClick={() => setSearchOpen(false)}
                  className="search-result"
                >
                  <span>{item.topic}</span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </Link>
              ))}
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
