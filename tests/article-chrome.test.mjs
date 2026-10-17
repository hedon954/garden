import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("keeps a compact alert body that starts on the next line of the same paragraph", () => {
  const html = render([
    "> [!NOTE]",
    "> 普通补充信息会显示为「提醒」。",
  ].join("\n"));
  assert.match(html, /class="markdown-alert markdown-alert-note"/);
  assert.match(html, /markdown-alert-title"><svg[^>]*>[\s\S]*?<\/svg>提醒<\/p>\s*<p>普通补充信息会显示为「提醒」。<\/p>/);
  assert.doesNotMatch(html, /\[!NOTE\]/);
});

test("keeps a compact alert when the custom title and body share the paragraph", () => {
  const html = render([
    "> [!TIP] 推荐做法",
    "> 先在本地预览，再发布文章。",
  ].join("\n"));
  assert.match(html, /class="markdown-alert markdown-alert-tip"/);
  assert.match(html, /markdown-alert-title"><svg[^>]*>[\s\S]*?<\/svg>推荐做法<\/p>\s*<p>先在本地预览，再发布文章。<\/p>/);
  assert.doesNotMatch(html, /\[!TIP\]/);
});

test("keeps the separate-paragraph alert form", () => {
  const html = render([
    "> [!WARNING]",
    ">",
    "> 这项操作需要先备份。",
  ].join("\n"));
  assert.match(html, /class="markdown-alert markdown-alert-warning"/);
  assert.match(html, /markdown-alert-title"><svg[^>]*>.*?<\/svg>警告<\/p>\s*<p>这项操作需要先备份。<\/p>/);
  assert.doesNotMatch(html, /\[!WARNING\]/);
});

test("maps the legacy alert aliases onto the current labels", () => {
  const html = render([
    "> [!INFO]",
    "> 说明也是提醒。",
    "",
    "> [!SUCCESS]",
    "> 成功也是建议。",
    "",
    "> [!DANGER]",
    "> 危险也是注意。",
    "",
    "> [!FAILURE]",
    "> 失败也是注意。",
  ].join("\n"));
  assert.match(html, /markdown-alert-note"[^>]*>[\s\S]*?<\/svg>提醒<\/p>\s*<p>说明也是提醒。<\/p>/);
  assert.match(html, /markdown-alert-tip"[^>]*>[\s\S]*?<\/svg>建议<\/p>\s*<p>成功也是建议。<\/p>/);
  assert.match(html, /markdown-alert-caution"[^>]*>[\s\S]*?<\/svg>注意<\/p>\s*<p>危险也是注意。<\/p>/);
  assert.match(html, /markdown-alert-caution"[^>]*>[\s\S]*?<\/svg>注意<\/p>\s*<p>失败也是注意。<\/p>/);
  assert.doesNotMatch(html, /\[!(?:INFO|SUCCESS|DANGER|FAILURE)\]/);
});

test("drops a marker line that continues inside the same text node", () => {
  const tree = {
    type: "root",
    children: [{
      type: "blockquote",
      children: [{
        type: "paragraph",
        children: [{ type: "text", value: "[!NOTE]\n正文还在同一段" }],
      }],
    }],
  };
  remarkA2()(tree);
  const quote = tree.children[0];
  assert.ok(quote.data.hProperties.className.includes("markdown-alert-note"));
  assert.equal(quote.children[1].children[0].value, "正文还在同一段");
  assert.equal(quote.children.length, 2);
});

test("renders the lab sample and the authoring examples as alert cards", async () => {
  const [lab, authoring] = await Promise.all([
    readFile(new URL("../content/posts/markdown-lab.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/content-authoring.md", import.meta.url), "utf8"),
  ]);
  const labSample = lab.split("\n").slice(49, 60).join("\n");
  const authoringSample = authoring.split("\n").slice(169, 177).join("\n");
  const labHtml = render(labSample);
  const authoringHtml = render(authoringSample);
  for (const kind of ["note", "tip", "warning", "caution"]) {
    assert.match(labHtml, new RegExp(`markdown-alert-${kind}`));
  }
  assert.match(labHtml, /提醒/);
  assert.match(labHtml, /警告/);
  assert.match(labHtml, /注意/);
  assert.doesNotMatch(labHtml, /「提示」|「告警」|「警示」/);
  assert.match(authoringHtml, /markdown-alert-note/);
  assert.match(authoringHtml, /markdown-alert-tip/);
  assert.match(authoringHtml, /markdown-alert-warning/);
  assert.match(authoringHtml, /推荐做法/);
  assert.match(authoringHtml, /先在本地预览，再发布文章。/);
  assert.doesNotMatch(authoringHtml, /\[!/);
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
