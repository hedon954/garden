import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("article headings h2–h4 stop below the sticky header", () => {
  const styles = read("app/globals.css");
  assert.match(styles, /\.markdown-body h2,\s*\.markdown-body h3,\s*\.markdown-body h4 \{\s*scroll-margin-top: calc\(var\(--hdr\) \+ 16px\);\s*\}/u);
  const toc = read("app/components/TableOfContents.tsx");
  // The TOC reads the heading's own scroll-margin, and looks for the current header class.
  assert.match(toc, /getComputedStyle\(target\)\.scrollMarginTop/u);
  assert.match(toc, /getScrollPaddingTop\(target\)/u);
  assert.match(toc, /querySelector\("\.sh-header, \.site-header"\)/u);
});

test("the comments box reserves giscus's empty-state height and can still grow", () => {
  const styles = read("app/globals.css");
  const rule = styles.match(/\.giscus-container \{[^}]*\}/u)?.[0] ?? "";
  assert.match(rule, /min-height: 372px;/u);
  assert.doesNotMatch(rule, /(^|[^-])height:|max-height/u);
});
