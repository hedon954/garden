import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import postcss from "postcss";
import darkFallback, { fallbackSelector } from "../build/dark-fallback-postcss.mjs";

const run = (css) => postcss([darkFallback()]).process(css, { from: undefined }).css;

test("dark rules get a twin for pages without a theme on a dark system", () => {
  assert.equal(fallbackSelector('html[data-theme="dark"] .card'), "html:not([data-theme]) .card");
  assert.equal(fallbackSelector(':root[data-theme="dark"]'), ":root:not([data-theme])");
  assert.equal(fallbackSelector(".garden-ui-preview[data-theme=\"dark\"]"), null);
  assert.equal(fallbackSelector('html:not([data-theme="dark"]) .i-sun'), null);

  const out = run(`:root { --paper: #faf9f5; }
:root[data-theme="dark"], html[data-theme="dark"] { --paper: #1f1e1d; color-scheme: dark; }
html[data-theme="dark"] .search-panel { background: var(--card); }
@media (max-width: 640px) { :root[data-theme="dark"] .toc { color: red; } }
.preview[data-theme="dark"] { color: blue; }`);
  // The dark values are written once in the source and follow their rule, in order.
  assert.match(out, /html\[data-theme="dark"\] \{ --paper: #1f1e1d; color-scheme: dark; \}\n@media \(prefers-color-scheme: dark\) \{\n?\s*:root:not\(\[data-theme\]\), html:not\(\[data-theme\]\) \{ --paper: #1f1e1d; color-scheme: dark; \}/);
  assert.match(out, /@media \(prefers-color-scheme: dark\) \{\n?\s*html:not\(\[data-theme\]\) \.search-panel \{ background: var\(--card\); \}/);
  assert.match(out, /@media \(max-width: 640px\) \{ :root\[data-theme="dark"\] \.toc \{ color: red; \}\s*@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\) \.toc/);
  assert.doesNotMatch(out, /\.preview:not/);
  // Running twice adds nothing.
  assert.equal(run(out), out);
});

test("the PostCSS config runs the dark fallback", () => {
  const config = fs.readFileSync(new URL("../postcss.config.mjs", import.meta.url), "utf8");
  assert.match(config, /darkFallback\(\)/);
});

test("the theme button is hidden when scripting is off", () => {
  const css = fs.readFileSync(new URL("../app/styles/shell.css", import.meta.url), "utf8");
  assert.match(css, /@media \(scripting:none\)\{\.sh-theme\{display:none\}\}/);
});
