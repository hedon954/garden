import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { BookshelfConfigError, parseBookshelfConfig } from "../app/components/bookshelf/schema.ts";
import { flipTransform, pageDensity } from "../app/components/bookshelf/density.ts";

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

test("open and close clocks stay on the approved timeline", () => {
  const engine = read("app/components/bookshelf/engine.ts");
  assert.match(engine, /export const OPEN_MS = 2600/);
  assert.match(engine, /export const CLOSE_MS = 2600/);
  assert.match(engine, /export const EASE = "cubic-bezier\(0\.32, 0\.72, 0, 1\)"/);
  assert.match(engine, /const PUT_MS = 425/);
  assert.match(engine, /const XFADE_MS = 150/);
  assert.match(engine, /easing: "linear"/);
  assert.match(engine, /cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  assert.match(engine, /offset: 0\.78/);
  assert.doesNotMatch(engine, /commitStyles\(/);
});

test("the veil is a scaled circle, scoped under the shelf, with the approved jackets", () => {
  const css = read("app/components/bookshelf/bookshelf.css");
  assert.equal(css.includes("clip-path"), false);
  assert.match(css, /\.bookshelf-demo \.open-veil-blob \{[^}]*border-radius:\s*50%/s);
  assert.match(css, /scale\(0\)/);
  assert.match(css, /url\("\/covers\/clean-code\.jpg"\)/);
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
  ]) {
    assert.throws(() => parseBookshelfConfig(input), (error) => error instanceof BookshelfConfigError && error.code === code);
  }
});
