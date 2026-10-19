import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import postcss from "postcss";
import darkFallback from "../build/dark-fallback-postcss.mjs";

const a2 = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
const backing = () => {
  const rules = [];
  postcss.parse(a2).walkRules((rule) => {
    if (rule.nodes.some((decl) => decl.prop === "background" && decl.value === "#faf9f5")) rules.push(rule);
  });
  return rules;
};

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
  assert.match(out, /@media \(prefers-color-scheme: dark\) \{\s*html:not\(\[data-theme\]\) \.markdown-image-trigger img,\s*html:not\(\[data-theme\]\) \.markdown-image-lightbox-content img,\s*html:not\(\[data-theme\]\) \.markdown-body > img,\s*html:not\(\[data-theme\]\) \.markdown-body > p > img:not\(\[class\]\) \{\s*background: #faf9f5;/u);
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
