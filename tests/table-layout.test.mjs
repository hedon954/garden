import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("article tables add no space of their own inside the table frame", async () => {
  const a2 = await read("app/styles/a2.css");
  assert.match(a2, /\.table-wrap table \{[^}]*margin: 0;/);
  const globals = await read("app/globals.css");
  assert.doesNotMatch(globals, /\.markdown-body (table|th|td)\b/);
});

test("wide tables are measured at their unwrapped width", async () => {
  const measure = await read("app/components/ArticleMeasure.tsx");
  assert.match(measure, /style\.width = "max-content"/);
  assert.match(measure, /tableScroll: naturalWidth\(table\)/);
});

test("table cells never break words mid-word, and breakout room is measured from the text column", async () => {
  const a2 = await read("app/styles/a2.css");
  assert.match(a2, /\.table-wrap td \{[^}]*overflow-wrap: normal;[^}]*word-break: normal;/);
  const measure = await read("app/components/ArticleMeasure.tsx");
  assert.match(measure, /querySelector\("\.markdown-body"\)/);
});
