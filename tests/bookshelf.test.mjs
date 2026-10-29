import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadBookshelf } from "../app/bookshelf/load.mjs";
import { resolveBookshelfCover } from "../app/components/bookshelf/catalog.mjs";
import { publishBookshelfJackets } from "../scripts/bookshelf-covers.mjs";
import { DEMO_CATALOG } from "../app/components/bookshelf/demo-data.ts";
import { BookshelfConfigError, parseBookshelfConfig } from "../app/components/bookshelf/schema.ts";
import { flipTransform, pageDensity } from "../app/components/bookshelf/density.ts";
import { shelfLeaveHref } from "../app/components/bookshelf/open-target.ts";

const root = new URL("../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");

function row(count) {
  return { books: Array.from({ length: count }, () => ({ cover: true })) };
}

test("page density is one resting state: any row that cannot fit covers makes every row spines", () => {
  assert.equal(pageDensity([row(4), row(3), row(3)], 1280), "covers");
  assert.equal(pageDensity([row(6)], 1280), "spines");
  assert.equal(pageDensity([row(1), row(6)], 1280), "spines");
  assert.equal(pageDensity([row(4)], 390), "spines");
  assert.equal(pageDensity([row(3)], 390), "covers");
  assert.equal(pageDensity([row(3), row(4)], 390), "spines");
  assert.equal(pageDensity([row(0)], 800), "covers");
  assert.equal(pageDensity([{ books: [{ cover: false }, { cover: true }, { cover: true }, { cover: true }] }], 390), "covers");
});

test("flip places the cloth book on the slot it came from", () => {
  const from = { left: 10, top: 20, width: 100, height: 150 };
  const to = { left: 400, top: 300, width: 132, height: 198 };
  assert.equal(
    flipTransform(from, to, "rotateZ(-2deg)"),
    "translate(-390px, -280px) scale(0.7575757575757576, 0.7575757575757576) rotateZ(-2deg)",
  );
});

test("ux16 tip clocks and the full-height slot spine are in the engine", () => {
  const engine = read("app/components/bookshelf/engine.ts");
  assert.match(engine, /const OPEN_MS = 2600/);
  assert.match(engine, /const CLOSE_MS = 1900/);
  assert.match(engine, /const EASE = "cubic-bezier\(0\.32, 0\.72, 0, 1\)"/);
  assert.match(engine, /const PUT_MS = 380/);
  assert.match(engine, /const XFADE_MS = 200/);
  assert.match(engine, /easing: "linear"/);
  assert.match(engine, /function makeSpineSlotFlyer/);
  assert.match(engine, /function buildSlotWaypoints/);
  assert.match(engine, /heldFlyer/);
  assert.match(engine, /homeRect/);
  assert.match(engine, /const DECODE_MS = 400/);
  assert.match(engine, /Math\.round\(OPEN_MS \* 0\.90\)/);
  assert.doesNotMatch(engine, /pointer-events: none/);
});

test("the veil is a scaled circle, scoped under the shelf, with the approved jackets", () => {
  const css = read("app/components/bookshelf/bookshelf.css");
  assert.equal(css.includes("clip-path"), false);
  assert.match(css, /\.bookshelf-demo \.open-veil-blob \{[^}]*border-radius:\s*50%/s);
  assert.match(css, /scale\(0\)/);
  assert.match(css, /url\("\/covers\/clean-code\.jpg"\)/);
  assert.match(css, /#fffcf6/);
  assert.match(css, /#faf9f5/);
  assert.doesNotMatch(css, /#e8e0d0|#f5f0e6/);
  assert.doesNotMatch(css, /cursor:\s*wait/);
  assert.doesNotMatch(css, /body\.is-busy/);
  assert.doesNotMatch(css, /(^|\n):root \{/);
  assert.doesNotMatch(css, /(^|\n)\.cover \{/);
  assert.doesNotMatch(css, /(^|\n)h1 \{/);
});

test("bookshelf.yaml rejects a broken shelf and keeps a valid one", () => {
  const parsed = parseBookshelfConfig({
    title: "读书笔记",
    shelves: [{
      id: "tools",
      name: "工具",
      books: [{ id: "ddia", title: "数据密集型应用", cover: "https://img.example/a.jpg", color: "#8b3a2f" }],
    }],
  });
  assert.equal(parsed.title, "读书笔记");
  assert.equal(parsed.shelves[0]?.books[0]?.cover, "https://img.example/a.jpg");

  const several = parseBookshelfConfig({
    title: "读书笔记",
    shelves: [{
      id: "desk",
      name: "书桌",
      books: [{
        id: "unit-testing",
        title: "Unit Testing",
        post: "note/note-unit-testing",
        posts: [
          { path: "content/posts/note/note-unit-testing.md", kind: "overview" },
          "note/note-unit-testing-excerpt",
        ],
        sources: [
          { label: "豆瓣", href: "https://book.douban.com/subject/1/" },
          { label: "PDF", href: "/media/books/unit-testing.pdf" },
          { label: "原书站点", href: "https://example.com/book" },
        ],
      }],
    }],
  });
  const volume = several.shelves[0]?.books[0];
  assert.equal(volume?.post, "content/posts/note/note-unit-testing.md");
  assert.deepEqual(volume?.posts, [
    { path: "content/posts/note/note-unit-testing.md", kind: "overview" },
    { path: "note/note-unit-testing-excerpt" },
  ]);
  assert.equal(volume?.sources?.length, 3);

  const shorthand = parseBookshelfConfig({
    title: "读书笔记",
    shelves: [{ id: "desk", name: "书桌", books: [{ id: "one", title: "一本", post: "note/window" }] }],
  });
  assert.deepEqual(shorthand.shelves[0]?.books[0]?.posts, [{ path: "note/window" }]);

  for (const [input, code] of [
    [null, "invalid-root"],
    [{ shelves: [] }, "missing-title"],
    [{ title: "架" }, "shelves"],
    [{ title: "架", shelves: [{ name: "行" }] }, "shelf"],
    [{ title: "架", shelves: [{ id: "a", name: "行", books: [{ title: "无 id" }] }] }, "book"],
    [{ title: "架", shelves: [{ id: "a", name: "行", books: [{ id: "x", title: "甲", size: "huge" }] }] }, "size"],
    [{
      title: "架",
      shelves: [{
        id: "a",
        name: "行",
        books: [{ id: "x", title: "甲" }, { id: "x", title: "乙" }],
      }],
    }, "duplicate-id"],
    [{ title: "架", shelves: [{ id: "a", name: "行", books: [{ id: "x", title: "甲", posts: [] }] }] }, "posts"],
    [{ title: "架", shelves: [{ id: "a", name: "行", books: [{ id: "x", title: "甲", posts: "note/a" }] }] }, "posts"],
    [{ title: "架", shelves: [{ id: "a", name: "行", books: [{ id: "x", title: "甲", posts: ["note/a", "note/a"] }] }] }, "posts"],
    [{ title: "架", shelves: [{ id: "a", name: "行", books: [{ id: "x", title: "甲", post: "note/a", posts: ["note/b"] }] }] }, "posts"],
    [{ title: "架", shelves: [{ id: "a", name: "行", books: [{ id: "x", title: "甲", posts: [{ path: "note/a", kind: "chapter" }] }] }] }, "posts"],
    [{ title: "架", shelves: [{ id: "a", name: "行", books: [{ id: "x", title: "甲", sources: [{ label: "豆瓣", href: "javascript:alert(1)" }] }] }] }, "sources"],
  ]) {
    assert.throws(() => parseBookshelfConfig(input), (error) => error instanceof BookshelfConfigError && error.code === code);
  }
});

test("a book jacket in content/covers is copied to /media/covers even when no post names it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-jacket-"));
  try {
    const covers = path.join(dir, "content", "covers");
    const media = path.join(dir, "public", "media", "covers");
    fs.mkdirSync(covers, { recursive: true });
    fs.writeFileSync(path.join(covers, "douban-unit.jpg"), "jacket-bytes");
    fs.writeFileSync(path.join(covers, "My Jacket.JPG"), "spaced");
    const config = parseBookshelfConfig({
      title: "架",
      shelves: [{
        id: "a",
        name: "行",
        books: [
          { id: "unit", title: "Unit", cover: "douban-unit.jpg" },
          { id: "spaced", title: "Spaced", cover: "My Jacket.JPG" },
          { id: "remote", title: "Remote", cover: "https://img.example/a.jpg" },
          { id: "abs", title: "Abs", cover: "/media/covers/douban-unit.jpg" },
        ],
      }],
    });
    const copied = publishBookshelfJackets(config, { coversDir: covers, mediaDir: media });
    assert.deepEqual([...new Set(copied)].sort(), ["My-Jacket.jpg", "douban-unit.jpg"]);
    assert.equal(fs.readFileSync(path.join(media, "douban-unit.jpg"), "utf8"), "jacket-bytes");
    assert.equal(fs.readFileSync(path.join(media, "My-Jacket.jpg"), "utf8"), "spaced");
    assert.equal(fs.existsSync(path.join(media, "a.jpg")), false);
    fs.rmSync(path.join(covers, "douban-unit.jpg"));
    assert.throws(
      () => publishBookshelfJackets(config, { coversDir: covers, mediaDir: media }),
      (error) => error instanceof BookshelfConfigError && error.code === "cover",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a cover file name is published at /media/covers, and a full URL is kept", () => {
  assert.equal(resolveBookshelfCover("ddia.jpg"), "/media/covers/ddia.jpg");
  assert.equal(resolveBookshelfCover("covers/ddia.jpg"), "/media/covers/ddia.jpg");
  assert.equal(resolveBookshelfCover("My File.JPG"), "/media/covers/My-File.jpg");
  assert.equal(resolveBookshelfCover("https://img.example/a.jpg"), "https://img.example/a.jpg");
  assert.equal(resolveBookshelfCover("/media/covers/ddia.jpg"), "/media/covers/ddia.jpg");
  assert.equal(resolveBookshelfCover("//cdn.example/a.png"), "//cdn.example/a.png");
  assert.throws(
    () => resolveBookshelfCover("../secret.jpg"),
    (error) => error instanceof BookshelfConfigError && error.code === "cover",
  );
});

test("bookshelf.yaml becomes that site's catalog and notes, never the demo set", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-shelf-"));
  try {
    fs.mkdirSync(path.join(dir, "content", "posts", "note"), { recursive: true });
    fs.writeFileSync(path.join(dir, "content", "posts", "note", "window.md"), `---
title: 窗边的位置
description: 把阅读位置记成连续体验的锚点，而不是页码。
cover: window-book.jpg
---

打开书先看这一页。

## 带走的

位置比页码重要。

\`\`\`garden chart
type: bar
title: 不要出现在笔记里
x: ["a"]
series:
  - name: n
    data: [1]
\`\`\`
`);
    fs.writeFileSync(path.join(dir, "content", "posts", "note", "fallback.md"), `---
title: 文内封面
description: 这份摘要来自博文，不来自 demo。
cover: from-post.jpg
---

正文只有这一段，足够做成笔记。
`);
    fs.writeFileSync(path.join(dir, "content", "bookshelf.yaml"), `title: 架上的真笔记
description: 站点自己的书架。
eyebrow: 书房
shelves:
  - id: desk
    name: 书桌
    books:
      - id: window-book
        title: 窗边
        author: 一位读者
        cover: window-book.jpg
        color: "#8b3a2f"
        post: note/window
      - id: fallback-book
        title: 沿用文内封面
        post: note/fallback
      - id: remote-book
        title: 远端封面
        cover: https://img.example/remote.jpg
        note: |
          ## 短记
          这是 yaml 里的笔记，不是 demo。
      - id: spacer
        title: 札记
        filler: sand
`);

    const shelf = loadBookshelf(dir);
    assert.ok(shelf);
    assert.equal(shelf.title, "架上的真笔记");
    assert.equal(shelf.eyebrow, "书房");
    const books = shelf.catalog[0]?.books ?? [];
    assert.deepEqual(books.map((book) => book.id), ["window-book", "fallback-book", "remote-book", "spacer"]);
    assert.equal(books[0]?.title, "窗边");
    assert.equal(books[0]?.cover, "/media/covers/window-book.jpg");
    assert.equal(books[0]?.color, "#8b3a2f");
    assert.equal(books[0]?.size, "s-mid");
    assert.equal(books[0]?.note, "window-book");
    const note = shelf.notes["window-book"];
    assert.ok(note);
    assert.equal(note.summary, "把阅读位置记成连续体验的锚点，而不是页码。");
    assert.equal(books[0]?.post, "note/window");
    assert.equal(books[0]?.hub, undefined);
    assert.equal(books[0]?.posts?.[0]?.path, "note/window");
    assert.equal(books[0]?.posts?.[0]?.title, "窗边的位置");
    assert.ok((books[0]?.posts?.[0]?.words ?? 0) > 0);
    assert.match(note.body, /把阅读位置记成连续体验的锚点，而不是页码。/);
    assert.match(note.body, /<h2>带走的<\/h2>/);
    assert.match(note.body, /位置比页码重要。/);
    assert.equal(note.body.includes("不要出现在笔记里"), false);
    assert.equal(note.body.includes("代码整洁之道"), false);
    assert.equal(books[1]?.cover, "/media/covers/from-post.jpg");
    assert.match(shelf.notes["fallback-book"]?.body ?? "", /这份摘要来自博文，不来自 demo。/);
    assert.equal(books[2]?.cover, "https://img.example/remote.jpg");
    assert.match(shelf.notes["remote-book"]?.body ?? "", /这是 yaml 里的笔记，不是 demo。/);
    assert.equal(books[3]?.size, "thin");
    assert.equal(books[3]?.cover, false);
    assert.equal(books[3]?.note, null);
    const demoIds = new Set(DEMO_CATALOG.flatMap((row) => row.books.map((book) => book.id)));
    assert.equal(books.some((book) => demoIds.has(book.id)), false);
    assert.equal(JSON.stringify(shelf.notes).includes("DRY 不是少敲几行字"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("one book with two notes keeps one jacket and does not open the first note", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-shelf-multi-"));
  try {
    fs.mkdirSync(path.join(dir, "content", "posts", "note"), { recursive: true });
    fs.writeFileSync(path.join(dir, "content", "posts", "note", "note-unit-testing.md"), `---
title: Unit Testing
description: 正文摘要。
date: 2026-06-05
cover: wide-banner.jpg
---

正文在文章页，不在书衣上。
`);
    fs.writeFileSync(path.join(dir, "content", "posts", "note", "note-unit-testing-excerpt.md"), `---
title: Unit Testing 摘抄
description: 摘抄摘要。
date: 2026-06-06
cover: excerpt-banner.jpg
---

摘抄正文。
`);
    fs.writeFileSync(path.join(dir, "content", "bookshelf.yaml"), `title: 读书笔记
shelves:
  - id: book-note
    name: 读书笔记
    books:
      - id: unit-testing
        title: Unit Testing
        author: 一位读者
        cover: unit-testing.jpg
        color: "#1a2744"
        sources:
          - label: 豆瓣
            href: https://book.douban.com/subject/1/
          - label: PDF
            href: https://example.com/unit-testing.pdf
          - label: 原书站点
            href: https://example.com/original
        posts:
          - path: note/note-unit-testing
            kind: overview
          - path: note/note-unit-testing-excerpt
            kind: excerpt
      - id: solo
        title: 单篇
        post: note/note-unit-testing
`);
    const shelf = loadBookshelf(dir);
    assert.ok(shelf);
    const books = shelf.catalog[0]?.books ?? [];
    assert.deepEqual(books.map((book) => book.id), ["unit-testing", "solo"]);
    const book = books[0];
    assert.equal(book?.cover, "/media/covers/unit-testing.jpg");
    assert.equal(book?.note, null);
    assert.equal(book?.post, undefined);
    assert.equal(book?.hub, "/bookshelf/unit-testing");
    assert.equal(shelf.notes["unit-testing"], undefined);
    assert.deepEqual(book?.posts?.map((post) => post.kind), ["overview", "excerpt"]);
    assert.equal(book?.posts?.[0]?.title, "Unit Testing");
    assert.equal(book?.posts?.[0]?.summary, "正文摘要。");
    assert.equal(book?.posts?.[1]?.summary, "摘抄摘要。");
    assert.equal(book?.posts?.[1]?.path, "note/note-unit-testing-excerpt");
    assert.ok(book?.posts?.[0]?.date);
    assert.ok((book?.posts?.[0]?.words ?? 0) > 0);
    assert.equal(book?.sources?.some((source) => source.label === "原书站点"), true);
    assert.equal(books[1]?.note, "solo");
    assert.equal(books[1]?.hub, undefined);
    assert.equal(books[1]?.post, "note/note-unit-testing");
    assert.match(shelf.notes.solo?.body ?? "", /正文在文章页/);
    const engine = read("app/components/bookshelf/engine.ts");
    const coverClick = engine.slice(engine.indexOf("async function onCoverClick"), engine.indexOf("async function onSpineClick"));
    assert.ok(coverClick.indexOf("leaveForArticle") >= 0 && coverClick.indexOf("leaveForArticle") < coverClick.indexOf("openBookFlow"));
    assert.match(coverClick, /isHubBook\(found\.book\)/);
    assert.doesNotMatch(coverClick, /location\.assign/);
    const spineClick = engine.slice(engine.indexOf("async function onSpineClick"), engine.indexOf("function fillHub"));
    assert.ok(spineClick.indexOf("leaveForArticle") >= 0 && spineClick.indexOf("leaveForArticle") < spineClick.indexOf("openBookFlow"));
    assert.match(spineClick, /isHubBook\(found\.book\)/);
    assert.doesNotMatch(spineClick, /location\.assign/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a single note leaves for its article; several notes stay for the hub flight", () => {
  assert.deepEqual(
    shelfLeaveHref({
      href: "/blog/note/note-rust-atomics-and-locks/",
      posts: [{ path: "note/note-rust-atomics-and-locks", href: "/blog/note/note-rust-atomics-and-locks/" }],
    }),
    { kind: "article", href: "/blog/note/note-rust-atomics-and-locks/" },
  );
  assert.deepEqual(
    shelfLeaveHref({ posts: [{ href: "/blog/note/solo/" }] }),
    { kind: "article", href: "/blog/note/solo/" },
  );
  assert.equal(
    shelfLeaveHref({
      hub: "/bookshelf/unit-testing/",
      href: "/blog/note/note-unit-testing/",
      posts: [
        { href: "/blog/note/note-unit-testing/" },
        { href: "/blog/note/note-unit-testing-excerpt/" },
      ],
    }),
    null,
  );
  assert.equal(shelfLeaveHref({ id: "clean-code", note: "clean-code" }), null);
  assert.equal(shelfLeaveHref({ filler: "sand", href: "/blog/x/" }), null);
  assert.equal(shelfLeaveHref({ href: "  " }), null);
  assert.equal(
    shelfLeaveHref({
      href: "/blog/first/",
      posts: [{ href: "/blog/first/" }, { href: "/blog/second/" }],
    }),
    null,
  );

  const shelfUi = [
    "app/components/bookshelf/engine.ts",
    "app/components/bookshelf/Bookshelf.tsx",
    "app/components/bookshelf/BookHub.tsx",
    "app/components/bookshelf/bookshelf.css",
  ].map((file) => read(file)).join("\n");
  assert.equal(shelfUi.includes("阅读全文"), false);
  assert.equal(shelfUi.includes("查看正文"), false);
  assert.equal(shelfUi.includes("flyer-page-more"), false);
  assert.equal(shelfUi.includes("noteRead"), false);
  assert.equal(shelfUi.includes("note-read"), false);
});

test("the checked-in shelf is one Unit Testing volume with both notes", () => {
  const shelf = loadBookshelf(fileURLToPath(root));
  assert.ok(shelf);
  const books = shelf.catalog.flatMap((row) => row.books);
  const matches = books.filter((book) => book.id === "unit-testing" || book.id === "note-unit-testing" || book.id === "note-unit-testing-excerpt");
  assert.deepEqual(matches.map((book) => book.id), ["unit-testing"]);
  assert.deepEqual(matches[0]?.posts?.map((post) => [post.path, post.kind]), [
    ["note/note-unit-testing", "overview"],
    ["note/note-unit-testing-excerpt", "excerpt"],
  ]);
  assert.equal(matches[0]?.hub, "/bookshelf/unit-testing");
  assert.equal(matches[0]?.cover, "/media/covers/note-unit-testing.jpg");
  assert.equal(matches[0]?.note, null);
});

test("a missing post or a cover that leaves the site fails the shelf", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-shelf-bad-"));
  try {
    fs.mkdirSync(path.join(dir, "content"), { recursive: true });
    fs.writeFileSync(path.join(dir, "content", "bookshelf.yaml"), `title: 坏架
shelves:
  - id: a
    name: 行
    books:
      - id: missing
        title: 没有稿
        post: note/missing
`);
    assert.throws(() => loadBookshelf(dir), (error) => error instanceof BookshelfConfigError && error.code === "post");

    fs.writeFileSync(path.join(dir, "content", "bookshelf.yaml"), `title: 坏架
shelves:
  - id: a
    name: 行
    books:
      - id: leak
        title: 坏封面
        cover: ../secret.jpg
`);
    assert.throws(() => loadBookshelf(dir), (error) => error instanceof BookshelfConfigError && error.code === "cover");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("without bookshelf.yaml the loader stays empty so the package demo can mount", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-shelf-empty-"));
  try {
    fs.mkdirSync(path.join(dir, "content"));
    assert.equal(loadBookshelf(dir), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const page = read("app/bookshelf/page.tsx");
  const engine = read("app/components/bookshelf/engine.ts");
  const chrome = read("app/components/SiteChrome.tsx");
  const layout = read("app/layout.tsx");
  assert.match(page, /from "@garden\/bookshelf"/);
  assert.match(page, /catalog=\{shelf\.catalog\}/);
  assert.match(page, /notes=\{shelf\.notes\}/);
  assert.match(page, /return <Bookshelf \/>/);
  assert.match(engine, /options\.catalog \?\? DEMO_CATALOG/);
  assert.match(engine, /options\.catalog \? \{\} : DEMO_NOTES/);
  assert.match(engine, /book\.color/);
  assert.match(chrome, /bookshelfSite/);
  assert.match(layout, /bookshelfSite=\{bookshelf != null\}/);
  assert.match(read("scripts/build-content.mjs"), /loadBookshelf\(root, posts\)/);
  assert.match(read("scripts/build-content.mjs"), /publishBookshelfJackets/);
  assert.equal(DEMO_CATALOG[0]?.books[0]?.id, "clean-code");
});
