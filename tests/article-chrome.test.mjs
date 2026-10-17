import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { markdownPlugins } from "../app/lib/markdown-plugins.ts";
import { remarkA2 } from "../app/lib/remark-a2.mjs";

const render = (markdown) => renderToStaticMarkup(createElement(ReactMarkdown, {
  remarkPlugins: [...markdownPlugins, remarkA2],
  rehypePlugins: [rehypeRaw],
}, markdown));

test("renders every demo alert type as a tinted card with its icon and label", () => {
  const html = render([
    "> [!NOTE]",
    ">",
    "> 注意正文",
    "",
    "> [!TIP]",
    ">",
    "> 建议正文",
    "",
    "> [!IMPORTANT]",
    ">",
    "> 重要正文",
    "",
    "> [!WARNING]",
    ">",
    "> 警告正文",
    "",
    "> [!CAUTION]",
    ">",
    "> 注意框正文",
    "",
    "> [!IMPORTANT] 自定义标题",
    ">",
    "> 自定义正文",
  ].join("\n"));

  for (const [kind, label] of [
    ["note", "提醒"],
    ["tip", "建议"],
    ["important", "重要"],
    ["warning", "警告"],
    ["caution", "注意"],
  ]) {
    assert.match(html, new RegExp(`class="markdown-alert markdown-alert-${kind}"`));
    assert.match(html, new RegExp(`class="markdown-alert-title"><svg viewBox="0 0 16 16"[^>]*>.*?</svg>${label}</p>`));
  }
  assert.match(html, /markdown-alert-title"><svg[^>]*>.*?<\/svg>自定义标题<\/p>/);
  assert.match(html, /注意正文/);
  assert.doesNotMatch(html, /garden-callout-marker/);
  assert.doesNotMatch(html, /\[!NOTE\]/);
});

test("maps a legacy callout marker onto the demo alert kind", () => {
  const html = render([
    "> <span class=\"garden-callout-marker garden-callout-marker--info\" aria-hidden=\"true\"></span>",
    ">",
    "> **一句话核心**",
    ">",
    "> ReAct 是更好的故事。",
  ].join("\n"));
  assert.match(html, /class="markdown-alert markdown-alert-note"/);
  assert.match(html, /markdown-alert-title"><svg[^>]*>.*?<\/svg>一句话核心<\/p>/);
  assert.match(html, /ReAct 是更好的故事。/);
  assert.doesNotMatch(html, /garden-callout-marker/);
});

test("leaves a plain quote unmarked and captions a markdown figure", () => {
  const html = render([
    "> 自从有了 AI 后，手写文章的次数越来越少了。",
    "",
    "![KV Cache Decoding Workflow](https://example.com/kv.png)",
    "",
    "![](https://example.com/bare.png)",
  ].join("\n"));
  assert.match(html, /<blockquote>\s*<p>自从有了 AI/);
  assert.doesNotMatch(html, /markdown-alert/);
  assert.match(html, /<figure class="fig"><div class="fig-card"><img src="https:\/\/example.com\/kv.png" alt="KV Cache Decoding Workflow"\/?><\/div><figcaption>KV Cache Decoding Workflow<\/figcaption><\/figure>/);
  assert.match(html, /<figure class="fig"><div class="fig-card"><img src="https:\/\/example.com\/bare.png" alt=""\/?><\/div><\/figure>/);
  assert.doesNotMatch(html, /<figcaption><\/figcaption>/);
});
