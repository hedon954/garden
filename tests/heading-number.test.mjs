import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { markdownSyntaxPlugins } from "../ui/garden/markdown-syntax.mjs";
import { autoNumbersHeadings } from "../app/lib/heading-number.ts";

test("automatic heading numbering is disabled even for legacy true", () => {
 for (const setting of [undefined, true, false]) assert.equal(autoNumbersHeadings("## 标题", setting), false);
});

test("Markdown headings preserve manual numbers, inline markup, nested levels and ranges", async () => {
 const source = "## 重点 **总结**\n\n### 人员\n\n#### 流程 `code`\n\n## 1. 标题\n\n## 1.标题\n\n4~6 个小时，7~8 个小时。\n\n~~删除线~~\n";
 const html = String(await unified().use(remarkParse).use(markdownSyntaxPlugins).use(remarkRehype).use(rehypeStringify).process(source));
 assert.match(html, /<h2>重点 <strong>总结<\/strong><\/h2>/);
 assert.match(html, /<h3>人员<\/h3>/);
 assert.match(html, /<h4>流程 <code>code<\/code><\/h4>/);
 assert.match(html, /<h2>1\. 标题<\/h2>/);
 assert.match(html, /<h2>1\.标题<\/h2>/);
 assert.match(html, /4~6 个小时，7~8 个小时。/);
 assert.match(html, /<del>删除线<\/del>/);
 const article = await readFile(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
 assert.doesNotMatch(article, /sec-no|stripPrefix|splitHeadingNumber|autoNumbersHeadings/);
 const toc = await readFile(new URL("../app/components/TableOfContents.tsx", import.meta.url), "utf8");
 assert.doesNotMatch(toc, /className="t-no"/);
});

test("single tilde is literal across soft breaks, while double tilde, code, escapes and math remain", async () => {
 const source = '4~6\n7~8\n\n~~delete~~\n\n`4~6 ~~code~~`\n\n```text\n4~6 ~~fenced~~\n```\n\n\\~escape\\~ [range](https://example.test/4~6) $a \\sim b$';
 const html = String(await unified().use(remarkParse).use(markdownSyntaxPlugins).use(remarkRehype).use(rehypeStringify).process(source));
 assert.match(html, /4~6<br>\n7~8/);
 assert.equal((html.match(/<del>/g) ?? []).length, 1);
 assert.match(html, /<del>delete<\/del>/);
 assert.match(html, /<code>4~6 ~~code~~<\/code>/);
 assert.match(html, /4~6 ~~fenced~~/);
 assert.match(html, /~escape~ <a href="https:\/\/example.test\/4~6">range<\/a>/);
 assert.match(html, /a \\sim b/);
});
