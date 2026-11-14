import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { markdownPlugins } from "../app/lib/markdown-plugins.ts";
import { keepClosingPunctuation, rehypeKeepPunctuation, splitTrailingKeep } from "../ui/garden/rehype-keep-punctuation.mjs";
import { previewStyleSheet, renderFilePreview } from "../scripts/file-preview.mjs";

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
  assert.ok(((html.match(/class="g-keep-punct"/g) ?? []).length) >= 2);
});

test("covers English and closing brackets or quotes, and leaves ordinary text unchanged", () => {
  const html = render("compute $S$, then $a$; and $b$: also $T$. plus $U$). and $V$」。 普通逗号，以及句号。");
  for (const punct of [",", ";", ":", ".", ").", "」。"]) assert.ok(glue(html, punct), punct);
  assert.ok(html.includes("普通逗号，以及句"));
  assert.ok(html.includes('class="g-keep-punct"') && html.includes("号。"));
  assert.ok(!html.includes('<span class="g-keep-punct">普通'));
});

test("does not wrap display math or alter the formula source", () => {
  const html = render("前\n\n$$\nC = a + b\n$$\n\n后。");
  assert.ok(html.includes('class="katex-display"') || html.includes("katex-display"));
  assert.ok(!html.includes('class="katex-display') || !html.includes("katex-display g-keep-punct"));
  assert.ok(html.includes("C = a + b"));
  assert.ok(!html.includes('<span class="g-keep-punct"><span class="katex-display"'));
  // Prose after the display block may cluster its own trailing punctuation.
  assert.ok(html.includes("后") && html.includes("。"));
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

test("a formula without a suffix has the same bounded viewport without changing MathML", () => {
  const html = render("前 $S$ 后");
  assert.ok(html.includes('<span class="g-inline-math"><span class="katex">'));
  assert.ok(html.includes('<annotation encoding="application/x-tex">S</annotation>'));
  assert.ok(!html.includes('class="g-keep-punct"'));
});

test("viewport construction is idempotent and leaves the KaTeX subtree intact", () => {
  const math={type:"element",tagName:"span",properties:{className:["katex"]},children:[{type:"text",value:"S"}]};
  const original=JSON.stringify(math),tree={type:"root",children:[math,{type:"text",value:"。"}]};
  keepClosingPunctuation(tree);const once=JSON.stringify(tree);keepClosingPunctuation(tree);
  assert.equal(JSON.stringify(tree),once);assert.equal(JSON.stringify(math),original);
});

test("standard closing quote and bracket runs remain prose, not part of MathML", () => {
  for(const suffix of ['"','\'','）','】','〕',']','}']){
    const html=render('$S$'+suffix+'后');
    const escaped=renderToStaticMarkup(createElement('span',null,suffix)).replace(/^<span>|<\/span>$/g,'');
    assert.ok(glue(html,escaped),suffix);
    assert.ok(html.includes('<annotation encoding="application/x-tex">S</annotation>'));
  }
});

test("standalone file previews use the same bounded inline-math stylesheet as the article", () => {
  const css=fs.readFileSync(new URL('../ui/garden/inline-math.css',import.meta.url),'utf8');
  assert.ok(previewStyleSheet().includes(css));
  assert.match(css,/max-width: 100%/);assert.match(css,/overflow-x: auto/);
});

test("prose and emoji keep trailing sentence punctuation, including ASCII tilde", () => {
  const wave = render("希望也能给你带来收获~");
  assert.ok(wave.includes('class="g-keep-punct"'));
  assert.ok(wave.includes("获~") || (wave.includes("获") && wave.includes("~")));
  assert.match(wave, /<span class="g-keep-punct">获~<\/span>/u);

  const emoji = render("那真的恭喜你了 💐~");
  assert.match(emoji, /<span class="g-keep-punct">💐~<\/span>/u);
  assert.ok(emoji.includes("恭喜你了 "));

  const fullwidth = render("结束～");
  assert.match(fullwidth, /<span class="g-keep-punct">束～<\/span>/u);
  const waveDash = render("结束〜");
  assert.match(waveDash, /<span class="g-keep-punct">束〜<\/span>/u);

  const run = render('他说“好的。”');
  assert.match(run, /class="g-keep-punct"/u);
  assert.ok(run.includes("。”") || run.includes("。") && run.includes("”"));
});

test("ZWJ emoji and variation selectors stay in one cluster with following punctuation", () => {
  const family = "👨‍👩‍👧";
  const html = render(`家${family}。`);
  assert.ok(html.includes('class="g-keep-punct"'));
  assert.ok(html.includes(family + "。") || html.includes(family));
  assert.match(html, new RegExp(`<span class="g-keep-punct">${family}。</span>`));

  const vs = render("微笑☺️!");
  assert.match(vs, /<span class="g-keep-punct">☺️!<\/span>/u);
});

test("clusters punctuation after inline strong and links, not after opening brackets", () => {
  const strong = render("这是**重点**。");
  assert.ok(strong.includes('class="g-keep-punct"'));
  assert.match(strong, /<\/strong>。<\/span>/u);

  const link = render("见[文档](https://example.com/path)。");
  assert.match(link, /<\/a>。<\/span>/u);
  assert.ok(link.includes("https://example.com/path"));
  assert.ok(!link.includes('<span class="g-keep-punct">https://example.com/path'));

  const opening = render("前文（后面还很长");
  assert.ok(!opening.includes('class="g-keep-punct"'));
  assert.ok(opening.includes("（后面还很长"));
});

test("mid-sentence ranges and incomplete punctuation runs are not clustered", () => {
  const range = render("每天拥有 2~5 个小时的自由支配时间");
  assert.ok(!range.includes('class="g-keep-punct"'));
  assert.ok(range.includes("2~5"));

  const url = render("打开 https://example.com/foo~bar 再看");
  assert.ok(!url.includes('class="g-keep-punct"'));
  assert.ok(url.includes("https://example.com/foo~bar"));
});

test("splitTrailingKeep only takes the last grapheme plus a closing run", () => {
  assert.deepEqual(splitTrailingKeep("恭喜你了 💐~"), { head: "恭喜你了 ", cluster: "💐~" });
  assert.deepEqual(splitTrailingKeep("收获~"), { head: "收", cluster: "获~" });
  assert.equal(splitTrailingKeep("2~5 个小时"), null);
  assert.equal(splitTrailingKeep("https://example.com/foo~bar"), null);
  assert.deepEqual(splitTrailingKeep("好的。”"), { head: "好", cluster: "的。”" });
  assert.equal(splitTrailingKeep("（开头"), null);
});
