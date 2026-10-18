import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { cropMatchedText, highlightParts } from "../ui/garden/search-preview.mjs";

const at = (text, word, from = 0) => {
  const start = text.indexOf(word, from);
  return [start, start + word.length - 1];
};
const marked = ({ text, ranges }) => highlightParts(text, ranges).filter((part) => part.matched).map((part) => part.text);

test("the ellipsis is never inside a highlight", () => {
  const text = "Go".padEnd(60, "甲") + "内存" + "乙".repeat(200) + "内存";
  const preview = cropMatchedText(text, [at(text, "内存"), at(text, "内存", 100)]);
  assert.equal(preview.suffix, "…");
  assert.equal(preview.prefix, "…");
  assert.ok(!preview.text.includes("…"));
  for (const [start, end] of preview.ranges) assert.ok(start >= 0 && end < preview.text.length);
  assert.deepEqual(marked(preview), ["内存"]);
});

test("a match cut by the window is kept whole or left out whole", () => {
  // The window ends inside the second match: it is kept whole.
  const base = "开头内存" + "丙".repeat(106); // 110 characters; the window ends at 112
  const kept = base + "内存模型" + "丁".repeat(80);
  const keep = cropMatchedText(kept, [at(kept, "内存"), at(kept, "内存模型")]);
  assert.deepEqual(marked(keep), ["内存", "内存模型"]);
  assert.ok(keep.text.endsWith("内存模型"));
  assert.equal(keep.suffix, "…");

  // A match too long to take in is left out whole, the cut moves before it.
  const long = "x".repeat(40);
  const dropped = base + long + "丁".repeat(80);
  const drop = cropMatchedText(dropped, [at(dropped, "内存"), at(dropped, long)]);
  assert.deepEqual(marked(drop), ["内存"]);
  assert.ok(!drop.text.includes("x"));
  assert.equal(drop.suffix, "…");

  // No visible part of any match is left unhighlighted at either edge.
  for (const preview of [keep, drop]) {
    const parts = highlightParts(preview.text, preview.ranges);
    assert.ok(parts.at(-1).matched || !/内存|x/.test(parts.at(-1).text.slice(-2)));
  }
});

test("the dialog renders the ellipsis outside the mark", () => {
  const header = fs.readFileSync(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8");
  assert.match(header, /\{preview\.prefix\}\s*<HighlightedText text=\{preview\.text\} ranges=\{preview\.ranges\} \/>\s*\{preview\.suffix\}/);
  assert.doesNotMatch(header, /`\$\{prefix\}\$\{text\.slice/);
});

test("the one-line excerpt never cuts a highlight in half", () => {
  // text-overflow draws its 「…」 inside whatever inline box it cuts; an atomic
  // highlight is shown whole or replaced whole by the excerpt's own 「…」.
  const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.search-result small \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
  assert.match(css, /\.search-result small \.search-match \{\s*display: inline-block;\s*\}/);
});
