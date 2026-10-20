import assert from "node:assert/strict";
import test from "node:test";
import "./workerd-modules.mjs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

async function html(pathname) {
  const url = new URL("../dist/server/index.js", import.meta.url);
  url.searchParams.set("test", `${process.pid}-route-lang`);
  const { default: worker } = await import(url.href);
  const res = await worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html", "user-agent": UA } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(res.status, 200, pathname);
  return (await res.text()).replace(/<script[\s\S]*?<\/script>/gu, "").replace(/<style[\s\S]*?<\/style>/gu, "");
}

const HAN = /[\u4e00-\u9fff]/u;
// Chrome only: everything outside the article body (.e-content), plus attributes
// and copy/tab controls inside it. The 「中 / EN」 switcher keeps its 中 on purpose.
function chromeChinese(page) {
  const attrs = [...page.matchAll(/\s(?:aria-label|title|placeholder)="([^"]*)"/gu)].map((m) => m[1]).filter((v) => HAN.test(v));
  const outside = page.replace(/<div class="e-content">[\s\S]*?<\/article>/u, "");
  const texts = [...outside.matchAll(/>([^<]+)</gu)].map((m) => m[1].trim()).filter((v) => HAN.test(v) && v !== "中");
  const tabs = [...page.matchAll(/role="tab"[^>]*>([^<]*)</gu)].map((m) => m[1]).filter((v) => HAN.test(v));
  return [...attrs, ...texts, ...tabs];
}

for (const path of ["/garden/en", "/garden/en/ai-writing", "/garden/en/writing", "/garden/en/components/compare"]) {
  test(`English handbook chrome has no Chinese: ${path}`, async () => {
    assert.deepEqual(chromeChinese(await html(path)), []);
  });
}

test("English handbook header, code tabs and copy buttons are English", async () => {
  const page = await html("/garden/en/writing");
  assert.match(page, /aria-label="Site navigation"/u);
  assert.match(page, />Posts</u);
  assert.match(page, />Skip to content</u);
  assert.match(page, /aria-label="Copy code"/u);
  assert.match(page, /role="tab"[^>]*>Code</u);
  assert.match(page, /role="tab"[^>]*>Diff from previous</u);
});

test("interactive runtime chrome follows the handbook language", async () => {
  // The y label (分钟 in the sample) is the author's; the instruction around it is chrome.
  assert.match(await html("/garden/en/components/interactive"), /, use the left and right arrow keys to read each point"/u);
  assert.match(await html("/garden/components/interactive"), /，左右方向键查看各点"/u);
});

test("Chinese handbook keeps the Chinese chrome", async () => {
  const page = await html("/garden/writing");
  assert.match(page, /aria-label="站点导航"/u);
  assert.match(page, />文章</u);
  assert.match(page, />跳到正文</u);
  assert.match(page, /aria-label="复制代码"/u);
  assert.match(page, /role="tab"[^>]*>代码</u);
  assert.match(page, /role="tab"[^>]*>对比上一版</u);
});

test("routeLang: /garden/en is English, /garden is Chinese, elsewhere the site language", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../app/lib/i18n.ts", import.meta.url), "utf8");
  assert.match(src, /\^\\\/garden\\\/en\(\\\/\|\$\)/u);
  assert.match(src, /return siteLang;\n\}/u);
});

test("the language switch keeps the basePath: /repo/garden/x/ ⇄ /repo/garden/en/x/", async () => {
  const { swapHandbookLang } = await import("../app/lib/handbook-path.ts");
  assert.equal(swapHandbookLang("/garden/ai-writing/", "en"), "/garden/en/ai-writing/");
  assert.equal(swapHandbookLang("/garden/en/ai-writing/", "zh"), "/garden/ai-writing/");
  assert.equal(swapHandbookLang("/garden/", "en"), "/garden/en/");
  assert.equal(swapHandbookLang("/garden/en/", "zh"), "/garden/");
  assert.equal(swapHandbookLang("/garden-docs-v6/garden/components/compare/", "en"), "/garden-docs-v6/garden/en/components/compare/");
  assert.equal(swapHandbookLang("/garden-docs-v6/garden/en/", "zh"), "/garden-docs-v6/garden/");
  assert.equal(swapHandbookLang("/blog/x/", "en"), null);
});

test("the infinite-scroll link carries the basePath", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("../app/components/FeedMore.tsx", import.meta.url), "utf8");
  assert.match(src, /useState\(next \? `\$\{base\}\$\{next\}` : null\)/u);
});
