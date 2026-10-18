import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("article headings land at the page scroll-padding, not a heading margin", () => {
  const styles = read("app/globals.css");
  // No heading margin on top of the html scroll-padding: the two would add up
  // to a double offset on a native #link jump.
  assert.doesNotMatch(styles, /\.markdown-body h4 \{\s*scroll-margin-top: calc/u);
  const shell = read("app/styles/shell.css");
  assert.match(shell, /scroll-padding-top:calc\(var\(--hdr\) \+ 16px\)/u);
  const toc = read("app/components/TableOfContents.tsx");
  assert.doesNotMatch(toc, /scrollMarginTop/u);
  assert.match(toc, /getComputedStyle\(document\.documentElement\)\.scrollPaddingTop/u);
  assert.match(toc, /querySelector\("\.sh-header, \.site-header"\)/u);
});

test("the comments box reserves giscus's empty-state height and can still grow", () => {
  const styles = read("app/globals.css");
  const rule = styles.match(/\.giscus-container \{[^}]*\}/u)?.[0] ?? "";
  assert.match(rule, /min-height: 372px;/u);
  assert.doesNotMatch(rule, /(^|[^-])height:|max-height/u);
});
