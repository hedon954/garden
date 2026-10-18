import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { splitHeadingNumber } from "../app/lib/heading-number.ts";

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
  assert.match(content, /import \{ splitHeadingNumber \} from "\.\/heading-number";/);
  assert.match(content, /no = split\.no;/);
  assert.match(article, /return \{ no: split\.no, children: stripPrefix\(children, prefix\) \};/);
  // auto-numbered articles: "1", "1.2", no dot
  assert.match(content, /no = String\(h2\);/);
  assert.match(content, /no = h2 \? `\$\{h2\}\.\$\{h3\}` : String\(h3\);/);
  assert.doesNotMatch(content, /\(\\d\+\(\?:\\\.\\d\+\)\*\)\\\.\?\[ \\t\]/);
});
