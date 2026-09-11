import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { markdownPlugins } from "../app/lib/markdown-plugins.ts";

const render = (children) => renderToStaticMarkup(createElement(ReactMarkdown, {
  remarkPlugins: markdownPlugins,
  rehypePlugins: [rehypeRaw, rehypeKatex],
}, children));

test("renders Chinese emphasis next to parentheses without inserting spaces", () => {
  const html = render("实现**掩码（Masking）**操作，引入**多头注意力（Multi-Head Attention）**机制，前**（说明）**后，前**(note)**后。");
  for (const text of ["掩码（Masking）", "多头注意力（Multi-Head Attention）", "（说明）", "(note)"]) {
    assert.ok(html.includes(`<strong>${text}</strong>`));
  }
  assert.ok(!html.includes("**"));
});

test("preserves literal stars, code, and ordinary English emphasis", () => {
  const html = render('`**（代码）**`\n\n\\*\\*（转义）\\*\\*\n\n```python\ntext = "**（字符串）**"\n```\n\nEnglish **bold** and *italic*.');
  assert.ok(html.includes("<code>**（代码）**</code>"));
  assert.ok(html.includes("<p>**（转义）**</p>"));
  assert.ok(html.includes('text = &quot;**（字符串）**&quot;'));
  assert.ok(html.includes("English <strong>bold</strong> and <em>italic</em>."));
});

test("keeps nested code, links, and math inside emphasis and underline", () => {
  const html = render('前**掩码（`mask`）**后，前**[链接](https://example.com)（说明）**后。\n\n<u>前面有 `Your journey`，后面有 `with one step`。</u>\n\n**第二部分：$\\sum_{j=1}^{N}$（求和）**\n\n$$\nC_i = \\sum_{j=1}^N w_{ij} \\cdot V_j\n$$');
  assert.ok(html.includes("<strong>掩码（<code>mask</code>）</strong>"));
  assert.ok(html.includes('<strong><a href="https://example.com">链接</a>（说明）</strong>'));
  assert.ok(html.includes("<u>前面有 <code>Your journey</code>，后面有 <code>with one step</code>。</u>"));
  assert.match(html, /<strong>第二部分：<span class="katex">/u);
  assert.ok(html.includes('class="katex-display"'));
  assert.ok(html.includes("<munderover>"));
  assert.ok(!html.includes('class="katex-error"'));
});
