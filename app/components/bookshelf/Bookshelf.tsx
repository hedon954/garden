"use client";

import { useLayoutEffect, useRef } from "react";
import { siteHref } from "../../lib/site-href";
import { mountBookshelf } from "./engine";
import type { BookshelfProps, BookshelfShelf } from "./types";
import "./bookshelf.css";

const SHELF_SCROLL_KEY = "garden-bookshelf-scroll";

function withNoteLinks(catalog: BookshelfShelf[] | undefined) {
  if (!catalog) return catalog;
  return catalog.map((row) => ({
    ...row,
    books: row.books.map((book) => {
      const posts = book.posts?.map((entry) => ({
        ...entry,
        href: siteHref(`/blog/${entry.path}`),
      }));
      const hub = book.hub ? siteHref(book.hub) : undefined;
      if (!book.post && !posts?.length && !hub) return book;
      return {
        ...book,
        ...(book.post ? { href: siteHref(`/blog/${book.post}`) } : {}),
        ...(posts?.length ? { posts } : {}),
        ...(hub ? { hub } : {}),
      };
    }),
  }));
}

function readSavedScroll() {
  try {
    const raw = sessionStorage.getItem(SHELF_SCROLL_KEY);
    if (raw == null) return null;
    sessionStorage.removeItem(SHELF_SCROLL_KEY);
    const y = Number(raw);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

const DEMO_BRAND = "花园 · 读书笔记";
const DEMO_TITLE = "读书笔记";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shelfShell(brand: string, title: string) {
  return `
    <div class="shelf-view" id="shelfView">
      <div class="page">
        <header class="top">
          <div class="brand">${escapeHtml(brand)}</div>
          <h1>${escapeHtml(title)}</h1>
          <p class="lede is-debug" id="lede" hidden>调试说明：页级疏密；悬停/点按展一本；再点进笔记。</p>
          <div class="qa-bar is-debug" id="qaBar" role="group" aria-label="演示控制" hidden>
            <span class="qa-label">页级态</span>
            <button type="button" class="qa-btn" data-mode="auto" id="modeAuto">自动</button>
            <button type="button" class="qa-btn" data-mode="covers" id="modeCovers">A 全封面</button>
            <button type="button" class="qa-btn" data-mode="spines" id="modeSpines">B 全立脊</button>
            <span class="qa-hint" id="modeHint"></span>
          </div>
        </header>
        <main id="bays"></main>
        <footer class="foot is-debug" id="footBar" hidden>
          <span>交互 demo · 抽→翻→笔记 · 对称返回</span>
          <span id="footMode">—</span>
        </footer>
      </div>
    </div>

    <div class="note-view" id="noteView" hidden>
      <article class="note">
        <button type="button" class="back-btn" id="backBtn">← 返回书架</button>
        <div class="note-hero">
          <div class="note-cover" id="noteCover"></div>
          <div class="note-meta">
            <p class="note-cat" id="noteCat"></p>
            <h1 id="noteTitle"></h1>
            <p class="note-author" id="noteAuthor"></p>
            <a class="note-read" id="noteRead" hidden>阅读全文</a>
          </div>
        </div>
        <div class="note-body" id="noteBody"></div>
      </article>
    </div>

    <div class="open-backdrop" id="openBackdrop" aria-hidden="true"></div>
    <div class="open-veil" id="openVeil" aria-hidden="true">
      <div class="open-veil-blob" id="openVeilBlob"></div>
    </div>
    <div class="stage" id="stage" aria-hidden="true"></div>
`;
}

/** Approved bookshelf. Pass `catalog` and `notes` for a site shelf; omit them for the package demo. */
export function Bookshelf({ catalog, notes, title, eyebrow, embedded = false }: BookshelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const saved = embedded ? readSavedScroll() : null;
    const applyScroll = () => {
      if (saved != null) window.scrollTo(0, saved);
    };
    applyScroll();
    const unmount = mountBookshelf(root, { catalog: withNoteLinks(catalog), notes });
    const frame = window.requestAnimationFrame(applyScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      unmount?.();
    };
  }, [catalog, notes, title, eyebrow, embedded]);
  return (
    <div
      className={embedded ? "bookshelf-demo is-site" : "bookshelf-demo"}
      ref={ref}
      dangerouslySetInnerHTML={{ __html: shelfShell(eyebrow || DEMO_BRAND, title || DEMO_TITLE) }}
    />
  );
}
