import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { autoNumbersHeadings, splitHeadingNumber } from "../app/lib/heading-number.ts";

test("an author-written heading number is kept exactly, trailing dot included", () => {
  assert.deepEqual(splitHeadingNumber("2. KV Cache 和 Prefix Cache"), { no: "2.", text: "KV Cache 和 Prefix Cache" });
  assert.deepEqual(splitHeadingNumber("4.1 Prompt 出问题的六个层次"), { no: "4.1", text: "Prompt 出问题的六个层次" });
  assert.deepEqual(splitHeadingNumber("4.1. 写法与约束层"), { no: "4.1.", text: "写法与约束层" });
  assert.deepEqual(splitHeadingNumber("  10 总结  "), { no: "10", text: "总结" });
  // a number that is the whole heading, or glued to the text, is not a section number
  assert.equal(splitHeadingNumber("2026"), null);
  assert.equal(splitHeadingNumber("3D 渲染"), null);
  assert.equal(splitHeadingNumber("KV Cache"), null);
});

test("the article and the TOC both use the number as written; auto numbers stay plain", async () => {
  const [content, article] = await Promise.all([
    readFile(new URL("../app/lib/content.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(content, /import \{ [^}]*\bsplitHeadingNumber\b[^}]* \} from "\.\/heading-number";/);
  assert.match(content, /no = split\.no;/);
  assert.match(article, /return \{ no: split\.no, children: stripPrefix\(children, prefix\) \};/);
  // auto-numbered articles: "1", "1.2", no dot
  assert.match(content, /no = String\(h2\);/);
  assert.match(content, /no = h2 \? `\$\{h2\}\.\$\{h3\}` : String\(h3\);/);
  assert.doesNotMatch(content, /\(\\d\+\(\?:\\\.\\d\+\)\*\)\\\.\?\[ \\t\]/);
});

test("front matter numbering: false turns off automatic heading numbers", () => {
  const plain = "## 写法\n\n### 每格写成一行\n";
  const numbered = "## 1. 写法\n";
  assert.equal(autoNumbersHeadings(plain), true);
  assert.equal(autoNumbersHeadings(plain, true), true);
  assert.equal(autoNumbersHeadings(plain, false), false);
  // an article that writes its own numbers is never auto-numbered
  assert.equal(autoNumbersHeadings(numbered), false);
  assert.equal(autoNumbersHeadings(numbered, true), false);
});

test("numbering reaches the TOC and the article on blog and column pages", async () => {
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const [content, article, blog, column, build] = await Promise.all([
    read("app/lib/content.ts"),
    read("app/components/MarkdownArticle.tsx"),
    read("app/blog/[...path]/page.tsx"),
    read("app/columns/[column]/[...path]/page.tsx"),
    read("scripts/build-content.mjs"),
  ]);
  assert.match(content, /const autoNumber = autoNumbersHeadings\(markdown, numbering\);/);
  assert.match(content, /\} else if \(autoNumber\) \{/);
  assert.match(article, /const autoNumber = autoNumbersHeadings\(content, numbering\);/);
  assert.match(article, /if \(!autoNumber\) return \{ no: "", children \};/);
  assert.match(blog, /extractHeadings\(post\.content, \{ numbering: post\.numbering \}\)/);
  assert.match(blog, /<MarkdownArticle content=\{post\.content\} numbering=\{post\.numbering\} \/>/);
  assert.match(column, /extractHeadings\(entry\.content, \{ numbering: entry\.numbering \}\)/);
  assert.match(column, /<MarkdownArticle content=\{entry\.content\} numbering=\{entry\.numbering\} \/>/);
  // a typo such as `numbering: no` fails the build instead of being ignored
  assert.match(build, /typeof data\.numbering !== "boolean"/);
  assert.match(build, /numbering\?: boolean;/);
});
