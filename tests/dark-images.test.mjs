import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import postcss from "postcss";
import darkFallback from "../build/dark-fallback-postcss.mjs";

const a2 = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
const tokens = fs.readFileSync(new URL("../app/styles/tokens.css", import.meta.url), "utf8");
const backingRules = () => {
  const rules = [];
  postcss.parse(a2).walkRules((rule) => {
    if (rule.nodes.some((decl) => decl.prop === "background" && decl.value === "var(--image-backing)")) rules.push(rule);
  });
  return rules;
};
const backing = () => backingRules().filter((rule) => !rule.selectors.some((selector) => selector.includes("img.fav")));

test("dark mode puts article images on the light paper colour, nothing else", () => {
  const rules = backing();
  assert.equal(rules.length, 1);
  const [rule] = rules;
  assert.deepEqual(rule.selectors, [
    'html[data-theme="dark"] .markdown-image-trigger img',
    'html[data-theme="dark"] .markdown-image-lightbox-content img',
    'html[data-theme="dark"] .markdown-body > img',
    'html[data-theme="dark"] .markdown-body > p > img:not([class])',
  ]);
  // Only the backing: no padding (the radius stays the image's own), no inversion or filters.
  assert.deepEqual(rule.nodes.filter((node) => node.type === "decl").map((decl) => decl.prop), ["background"]);
  assert.doesNotMatch(a2, /filter:\s*invert|filter:[^;]*invert\(/u);
  // Favicons, link card thumbnails, covers, avatars and the logo are never matched.
  for (const selector of rule.selectors) assert.doesNotMatch(selector, /\.fav|lc-thumb|u-photo|avatar|logo|cover|brand/u);
});

test("the backing also applies without JavaScript on a dark system", () => {
  const out = postcss([darkFallback()]).process(a2, { from: undefined }).css;
  assert.match(out, /@media \(prefers-color-scheme: dark\) \{\s*html:not\(\[data-theme\]\) \.markdown-image-trigger img,\s*html:not\(\[data-theme\]\) \.markdown-image-lightbox-content img,\s*html:not\(\[data-theme\]\) \.markdown-body > img,\s*html:not\(\[data-theme\]\) \.markdown-body > p > img:not\(\[class\]\) \{\s*background: var\(--image-backing\);/u);
});

test("article images and link icons share one dark backing colour, set once", () => {
  // The token lives with the dark theme and is #faf9f5.
  const defined = [];
  postcss.parse(tokens).walkDecls("--image-backing", (decl) => defined.push([decl.parent.selectors, decl.value]));
  assert.deepEqual(defined, [[[':root[data-theme="dark"]', 'html[data-theme="dark"]'], "#faf9f5"]]);
  // The link icon backing reads the same token; no colour is written out in a2.css for either.
  const fav = backingRules().filter((rule) => rule.selectors.some((selector) => selector.includes("img.fav")));
  assert.equal(fav.length, 1);
  assert.deepEqual(fav[0].selectors, ['html[data-theme="dark"] .markdown-body img.fav']);
  assert.equal(backingRules().length, 2);
  assert.doesNotMatch(a2, /#f5f4ed|background:\s*#faf9f5/iu);
  // Without JavaScript on a dark system the token is set too.
  const out = postcss([darkFallback()]).process(tokens, { from: undefined }).css;
  assert.match(out, /@media \(prefers-color-scheme: dark\) \{[^}]*html:not\(\[data-theme\]\)[^{]*\{[^}]*--image-backing: #faf9f5;/u);
});

test("article images are rendered where the selector looks; favicons are not", () => {
  const article = fs.readFileSync(new URL("../app/components/MarkdownImage.tsx", import.meta.url), "utf8");
  assert.match(article, /className="markdown-image-trigger"[\s\S]*?<img loading="lazy"/u);
  assert.match(article, /className="markdown-image-lightbox-content"[\s\S]*?<img src=\{src\}/u);
  const markdown = fs.readFileSync(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
  // Favicons and link-card thumbnails carry a class, so a bare <img> rule never reaches them.
  assert.match(markdown, /<img className="fav"/u);
  assert.match(markdown, /<img className="lc-thumb"/u);
});
