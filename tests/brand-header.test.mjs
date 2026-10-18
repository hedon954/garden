import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { imageSize } from "image-size";
import { cleanSvg, resolveBrand } from "../scripts/brand.mjs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("default logo: the leaf h, cropped to 6 2 18 27 and drawn in the text colour", () => {
  const brand = resolveBrand(os.tmpdir(), {});
  assert.match(brand.logo, /^<svg [^>]*viewBox="6 2 18 27"/u);
  assert.match(brand.logo, /stroke="currentColor"/u);
  assert.match(brand.logo, /aria-hidden="true"/u);
  assert.doesNotMatch(brand.logo, /\swidth=|\sheight=/u);
  assert.equal(brand.favicon, "/favicon.svg");
  assert.equal(brand.appleTouchIcon, "/apple-touch-icon.png");
});

test("logo and icons come from brand in site.config.yaml", () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "garden-brand-"));
  try {
    fs.mkdirSync(path.join(site, "brand"));
    fs.writeFileSync(path.join(site, "brand", "logo.svg"), '<?xml version="1.0"?>\n<svg width="64" height="64" viewBox="0 0 64 64" onload="alert(1)"><script>alert(1)</script><circle cx="32" cy="32" r="30" fill="currentColor"/></svg>');
    const custom = resolveBrand(site, { brand: { logo: "brand/logo.svg", favicon: "/icon.png", appleTouchIcon: "touch.png" } }, "/blog");
    assert.equal(custom.logo, '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="30" fill="currentColor"/></svg>');
    assert.equal(custom.favicon, "/blog/icon.png");
    assert.equal(custom.appleTouchIcon, "/blog/touch.png");
    assert.equal(resolveBrand(site, { brand: { logo: false, appleTouchIcon: false } }).logo, "");
    assert.equal(resolveBrand(site, { brand: { appleTouchIcon: false } }).appleTouchIcon, "");
    const warnings = [];
    const missing = resolveBrand(site, { brand: { logo: "../outside.svg" } }, "", (line) => warnings.push(line));
    assert.match(missing.logo, /viewBox="6 2 18 27"/u, "a missing or outside file falls back to the default");
    assert.equal(warnings.length, 1);
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

test("cleanSvg drops scripts, handlers and external references", () => {
  const out = cleanSvg('<svg viewBox="0 0 1 1"><a href="javascript:alert(1)"><path onclick="x()" d="M0 0"/></a><use href="#a"/><foreignObject><div>x</div></foreignObject></svg>');
  assert.doesNotMatch(out, /javascript|onclick|foreignObject/u);
  assert.match(out, /<use href="#a"\/>/u);
  assert.equal(cleanSvg("<p>not svg</p>"), "");
});

test("favicon: stroke 2.75, ink on light tabs and paper on dark ones", () => {
  const svg = read("public/favicon.svg");
  assert.match(svg, /stroke-width="2\.75"/u);
  assert.match(svg, /stroke="#1B1A18"/u);
  assert.match(svg, /@media \(prefers-color-scheme: dark\)\{svg\{stroke:#EEECE7\}\}/u);
  const png = fs.readFileSync(new URL("../public/apple-touch-icon.png", import.meta.url));
  assert.deepEqual([imageSize(png).width, imageSize(png).height, imageSize(png).type], [180, 180, "png"]);
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.files.includes("public/apple-touch-icon.png"));
  assert.match(read("bin/garden.mjs"), /\["favicon\.svg", "apple-touch-icon\.png", "og\.png"\]/u);
});

test("header: 26px logo 10px from the name, no divider or fixed box", () => {
  const shell = read("app/styles/shell.css");
  assert.match(shell, /\.sh-word\{display:inline-flex;align-items:center;gap:10px;/u);
  assert.match(shell, /\.sh-mark svg\{display:block;height:26px;width:auto\}/u);
  const css = read("app/globals.css") + read("app/styles/a2.css");
  assert.doesNotMatch(css, /\.brand-mark/u);
  const header = read("app/components/SiteHeader.tsx");
  assert.match(header, /brand\.logo \? <span className="sh-mark" aria-hidden="true"/u);
});

test("search entry: magnifier and 搜索 like a nav link, ⌘K only with a fine pointer, 44px button on phones", () => {
  const shell = read("app/styles/shell.css");
  const rule = shell.match(/\.sh-search\{[^}]*\}/u)[0];
  // A hairline box on desktop: rule-coloured border, 8px radius, 34px tall, transparent.
  assert.match(rule, /height:34px;padding:0 10px 0 12px;border:1px solid var\(--rule\);background:transparent;color:var\(--soft\)/u);
  assert.match(rule, /border-radius:8px/u);
  assert.match(shell, /\.sh-search:hover\{color:var\(--ink\);border-color:var\(--rule-strong\)\}/u);
  // The phone icon buttons stay unboxed and identical.
  assert.match(shell, /\.sh-icon\{[^}]*border:0;background:transparent/u);
  assert.match(rule, /font:400 15px\/1 var\(--sans\)/u);
  assert.match(shell, /\.sh-nav a\{font-size:15px;color:var\(--soft\)/u, "same size and colour as the nav links");
  assert.match(shell, /\.sh-search kbd\{display:none;/u);
  assert.match(shell, /@media \(hover:hover\) and \(pointer:fine\)\{\.sh-search kbd\{display:inline\}\}/u);
  assert.match(shell, /\.sh-menu-btn,\.sh-search-m\{display:inline-grid;width:44px;height:44px\}/u);
  assert.match(read("app/components/SiteHeader.tsx"), /<span className="lbl">搜索<\/span>/u);
});

test("article cover leaves half a gutter before the TOC rail", () => {
  const css = read("app/styles/a2.css");
  assert.match(css, /\.article-hero\.article-cover \{\s*width: 100%;\s*\/\*[^*]*\*\/\s*max-width: calc\(var\(--col\) \+ 72px\);\s*margin: 48px auto 0;/u);
});

test("article titles wrap instead of running off the page, on /blog/ and /columns/ alike", () => {
  const css = read("app/styles/a2.css");
  const title = css.match(/\.hero h1,\n\.article-header h1 \{[^}]*\}/u)[0];
  assert.match(title, /overflow-wrap: break-word;/u, "break an English word only when it alone cannot fit");
  assert.doesNotMatch(title, /overflow-wrap: anywhere/u);
  // No nowrap left on the title or its split lines.
  for (const rule of css.match(/(?:\.hero h1|\.article-header h1|\.h1-line)[^{]*\{[^}]*\}/gu)) {
    assert.doesNotMatch(rule, /white-space: nowrap/u, rule);
    assert.doesNotMatch(rule, /word-break: keep-all/u, "CJK wraps between characters");
  }
});

test("column, archive-year and thought anchors land at the page's scroll padding, not twice it", () => {
  const shell = read("app/styles/shell.css");
  for (const selector of [/\.sh-series h2\{[^}]*\}/u, /\.sh-year > h2\{[^}]*\}/u, /\.sh-note\{[^}]*\}/u]) {
    assert.doesNotMatch(shell.match(selector)[0], /scroll-margin/u, String(selector));
  }
  assert.match(shell, /\.sh-note:target\{background:/u, "the targeted thought keeps its highlight");
  assert.doesNotMatch(read("app/globals.css").match(/\.thought-card \{[^}]*\}/u)[0], /scroll-margin/u);
});
