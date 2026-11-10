import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { markdownPlugins } from "../app/lib/markdown-plugins.ts";
import { keepClosingPunctuation, rehypeKeepPunctuation } from "../ui/garden/rehype-keep-punctuation.mjs";
import { renderFilePreview } from "../scripts/file-preview.mjs";

const render = (children) => renderToStaticMarkup(createElement(ReactMarkdown, {
  remarkPlugins: markdownPlugins,
  rehypePlugins: [rehypeRaw, rehypeKatex, rehypeKeepPunctuation],
}, children));

const glue = (html, punct) => html.includes(`</span>${punct}</span>`) && html.includes('class="g-keep-punct"');

test("keeps closing punctuation inside a nowrap cluster after inline math", () => {
  const html = render("> **注意**：他无法反推出 $a$ 或 $b$，因此算不出 $S$。");
  assert.ok(glue(html, "，"));
  assert.ok(glue(html, "。"));
  assert.ok(!html.includes('class="katex-error"'));
  assert.equal((html.match(/class="g-keep-punct"/g) ?? []).length, 2);
});

test("covers English and closing brackets or quotes, and leaves ordinary text unchanged", () => {
  const html = render("compute $S$, then $a$; and $b$: also $T$. plus $U$). and $V$」。 普通逗号，以及句号。");
  for (const punct of [",", ";", ":", ".", ").", "」。"]) assert.ok(glue(html, punct), punct);
  assert.ok(html.includes("普通逗号，以及句号。"));
  assert.ok(!html.includes('<span class="g-keep-punct">普通'));
});

test("does not wrap display math or alter the formula source", () => {
  const html = render("前\n\n$$\nC = a + b\n$$\n\n后。");
  assert.ok(html.includes('class="katex-display"') || html.includes("katex-display"));
  assert.ok(!html.includes("g-keep-punct"));
  assert.ok(html.includes("C = a + b"));
});

test("the same clustering is applied to file previews", () => {
  const html = renderFilePreview("算不出 $S$。");
  assert.ok(glue(html, "。"));
});

test("the tree helper only consumes an immediate punctuation run", () => {
  const tree = {
    type: "root",
    children: [
      { type: "element", tagName: "span", properties: { className: ["katex"] }, children: [] },
      { type: "text", value: "。因此" },
    ],
  };
  keepClosingPunctuation(tree);
  assert.equal(tree.children[0].properties.className[0], "g-keep-punct");
  assert.equal(tree.children[0].children[1].value, "。");
  assert.equal(tree.children[1].value, "因此");
});
