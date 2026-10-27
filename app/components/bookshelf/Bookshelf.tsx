"use client";

import { useLayoutEffect, useRef } from "react";
import { mountBookshelf } from "./engine";
import type { BookshelfProps } from "./types";
import "./bookshelf.css";

const SHELL = `
    <div class="shelf-view" id="shelfView">
      <div class="page">
        <header class="top">
          <div class="brand">花园 · 读书笔记</div>
          <h1>读书笔记</h1>
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
          </div>
        </div>
        <div class="note-body" id="noteBody"></div>
      </article>
    </div>

    <div class="open-veil" id="openVeil" aria-hidden="true">
      <div class="open-veil-blob" id="openVeilBlob"></div>
    </div>
    <div class="stage" id="stage" aria-hidden="true"></div>
`;

/** Approved bookshelf. Pass `catalog` and `notes` to mount another shelf on the same motion. */
export function Bookshelf({ catalog, notes }: BookshelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    return mountBookshelf(root, { catalog, notes });
  }, [catalog, notes]);
  return <div className="bookshelf-demo" ref={ref} dangerouslySetInnerHTML={{ __html: SHELL }} />;
}
