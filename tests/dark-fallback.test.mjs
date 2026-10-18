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
  assert.match(css, /@media \(scripting:none\)\{\.sh-theme,\.sh-menu-theme\{display:none\}\}/);
});

const fails = (css) => assert.throws(() => run(css), (error) => error.name === "CssSyntaxError" && /garden dark fallback/.test(error.message));

test("a data-theme form the fallback cannot cover stops the build", () => {
  fails('html:not([data-theme="dark"]) .sun { display: none; }');
  fails('[data-theme="dark"] .x { color: red; }');
  fails('body[data-theme="dark"] { color: red; }');
  fails('div[data-theme="dark"] .x { color: red; }');
  fails('.page html[data-theme="dark"] { color: red; }');
  fails(':root[data-theme~="dark"] { color: red; }');
  fails(':root[data-theme] { color: red; }');
  fails(':root[data-theme="sepia"] { color: red; }');
  // The error names the selector and the file position.
  assert.throws(() => run('a {}\n[data-theme="dark"] .x { color: red; }'), /<css input>:2:1: garden dark fallback: bare "\[data-theme="dark"\]" in "\[data-theme="dark"\] \.x"/);
  // Forms that are fine: the light root, a component with its own data-theme,
  // and a bare form listed next to its root form.
  assert.doesNotThrow(() => run(':root, :root[data-theme="light"] { --a: 1; }'));
  assert.doesNotThrow(() => run('.preview[data-theme="dark"] { --a: 1; }'));
  assert.match(run(':root[data-theme="dark"] .ui, [data-theme="dark"] .ui { --a: 1; }'), /:root:not\(\[data-theme\]\) \.ui \{/);
});

// Root dark selectors in the site's own CSS, as layout.tsx imports it.
function sourceDarkSelectors() {
  const app = new URL("../app/", import.meta.url);
  const layout = fs.readFileSync(new URL("layout.tsx", app), "utf8");
  const queue = [...layout.matchAll(/^import "\.\/(.+\.css)";$/gmu)].map((match) => new URL(match[1], app));
  const selectors = [];
  while (queue.length) {
    const file = queue.shift();
    const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file.pathname });
    root.walkAtRules("import", (rule) => {
      const target = rule.params.match(/^["'](\.{1,2}\/.+\.css)["']/u)?.[1];
      if (target) queue.push(new URL(target, file));
    });
    root.walkRules((rule) => selectors.push(...rule.selectors.map((part) => part.trim()).filter((part) => /^(:root|html)\[data-theme="dark"\]/u.test(part))));
  }
  return selectors;
}

test("every dark rule in the source has its fallback in the built CSS", () => {
  const assets = new URL("../dist/client/assets/", import.meta.url);
  const built = fs.readdirSync(assets).filter((name) => name.endsWith(".css")).map((name) => fs.readFileSync(new URL(name, assets), "utf8")).join("\n");
  const norm = (selector) => selector.replace(/["']/gu, "").replace(/\s*([>+~])\s*/gu, "$1").replace(/\s+/gu, " ").replace(/::(before|after)/gu, ":$1").trim();
  const builtSelectors = [];
  postcss.parse(built).walkRules((rule) => builtSelectors.push(...rule.selectors.map(norm)));
  const source = sourceDarkSelectors();
  assert.ok(source.length > 40, `found ${source.length} dark selectors in the source`);
  const dark = builtSelectors.filter((part) => /^(:root|html)\[data-theme=dark\]/u.test(part));
  const twins = builtSelectors.filter((part) => /^(:root|html):not\(\[data-theme\]\)/u.test(part));
  assert.equal(dark.length, source.length, "dark selectors in the built CSS");
  assert.equal(twins.length, source.length, "fallback selectors in the built CSS");
  const have = new Set(twins);
  const missing = source.map((part) => norm(fallbackSelector(part))).filter((twin) => !have.has(twin));
  assert.deepEqual(missing, []);
});
