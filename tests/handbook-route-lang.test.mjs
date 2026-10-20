import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { ALLOWED_EN_HANDBOOK_CJK } from "../scripts/handbook-allowlist.mjs";
import "./workerd-modules.mjs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const root = path.resolve(import.meta.dirname, "..");

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

const HAN = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/u;
// Chrome only: everything outside the article body (.e-content), plus attributes
// and copy/tab controls inside it. The 「中 / EN」 switcher keeps its 中 on purpose.
function chromeChinese(page) {
  const attrs = [...page.matchAll(/\s(?:aria-label|title|placeholder)="([^"]*)"/gu)].map((m) => m[1]).filter((v) => HAN.test(v));
  const outside = page.replace(/<div class="e-content">[\s\S]*?<\/article>/u, "");
  const texts = [...outside.matchAll(/>([^<]+)</gu)].map((m) => m[1].trim()).filter((v) => HAN.test(v) && v !== ALLOWED_EN_HANDBOOK_CJK.switcher);
  const tabs = [...page.matchAll(/role="tab"[^>]*>([^<]*)</gu)].map((m) => m[1]).filter((v) => HAN.test(v));
  return [...attrs, ...texts, ...tabs];
}

function allEnglishHandbookRoutes() {
  const enDir = path.join(root, "docs/handbook/en");
  const files = fs.readdirSync(enDir, { recursive: true }).map(String).filter((f) => f.endsWith(".md"));
  const routes = [];
  for (const rel of files.sort()) {
    const raw = fs.readFileSync(path.join(enDir, rel), "utf8");
    if (!/^---\n[\s\S]*?\nsection:/mu.test(raw)) continue;
    routes.push(rel === "index.md" ? "/garden/en" : `/garden/en/${rel.replace(/\.md$/u, "")}`);
  }
  return routes;
}

function bodyChinese(page) {
  // Check visible text and attributes inside <main>, excluding the allowlisted 中 switcher and 丨 title-split explanation.
  const mainMatch = /<main\b[\s\S]*?<\/main>/u.exec(page);
  const mainHtml = mainMatch ? mainMatch[0] : page;
  const attrs = [...mainHtml.matchAll(/\s(?:aria-label|title|placeholder|alt)="([^"]*)"/gu)]
    .map((m) => m[1])
    .filter((v) => HAN.test(v));
  const texts = [...mainHtml.matchAll(/>([^<]+)</gu)]
    .map((m) => m[1].trim())
    .filter((v) => {
      if (!HAN.test(v)) return false;
      if (v === ALLOWED_EN_HANDBOOK_CJK.switcher) return false;
      const chars = [...v].filter((ch) => HAN.test(ch));
      if (chars.every((ch) => ALLOWED_EN_HANDBOOK_CJK.titleSplitChars.has(ch))) return false;
      return true;
    });
  return [...attrs, ...texts];
}

for (const route of allEnglishHandbookRoutes()) {
  test(`English handbook page has no CJK characters (chrome, body, fenced code): ${route}`, async () => {
    const page = await html(route);
    assert.deepEqual(chromeChinese(page), []);
    assert.deepEqual(bodyChinese(page), []);
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

test("<html lang> is en on English handbook pages and zh-CN on Chinese ones (worker)", async () => {
  const raw = async (path) => {
    const url = new URL("../dist/server/index.js", import.meta.url);
    url.searchParams.set("test", `${process.pid}-html-lang`);
    const { default: worker } = await import(url.href);
    const res = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html", "user-agent": UA } }), { ASSETS: { fetch: async () => new Response("", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    return res.text();
  };
  for (const path of ["/garden/en", "/garden/en/ai-writing", "/garden/en/components/compare"]) assert.match(await raw(path), /<html[^>]*\slang="en"/u, path);
  for (const path of ["/garden", "/garden/ai-writing", "/blog", "/thoughts"]) assert.match(await raw(path), /<html[^>]*\slang="zh-CN"/u, path);
});

test("<html lang> in the static export: English handbook files only, basePath or not", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { setHandbookHtmlLang } = await import("../scripts/html-lang.mjs");
  const { handbookHtmlLang } = await import("../ui/garden/html-lang.mjs");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "html-lang-"));
  const page = '<!DOCTYPE html><html lang="zh-CN" suppressHydrationWarning><head></head><body></body></html>';
  for (const file of ["garden/en/index.html", "base/garden/en/start/index.html", "garden/start/index.html", "blog/x/index.html", "garden/index.html"]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), page);
  }
  assert.deepEqual(setHandbookHtmlLang(root), ["base/garden/en/start/index.html", "garden/en/index.html"]);
  assert.match(fs.readFileSync(path.join(root, "garden/en/index.html"), "utf8"), /<html lang="en" suppressHydrationWarning>/u);
  assert.match(fs.readFileSync(path.join(root, "garden/start/index.html"), "utf8"), /<html lang="zh-CN"/u);
  assert.equal(handbookHtmlLang("/garden/english-notes/"), null);
  const cli = fs.readFileSync(new URL("../bin/garden.mjs", import.meta.url), "utf8");
  assert.match(cli, /runNode\("scripts\/html-lang\.mjs"\)/u);
});
