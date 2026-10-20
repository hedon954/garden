import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { ALLOWED_EN_HANDBOOK_CJK } from "../scripts/handbook-allowlist.mjs";
import { findBuiltEnglishHtmlCjk } from "../scripts/handbook-facts.mjs";
import { applyRoot404ForPath, pickNotFoundLang, stripConfiguredBasePath } from "../ui/garden/html-lang.mjs";
import "./workerd-modules.mjs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const root = path.resolve(import.meta.dirname, "..");

async function fetchRoute(pathname, expectedStatus = 200) {
  const url = new URL("../dist/server/index.js", import.meta.url);
  url.searchParams.set("test", `${process.pid}-route-lang`);
  const { default: worker } = await import(url.href);
  let currentPath = pathname;
  let res;
  for (let hops = 0; hops < 3; hops += 1) {
    res = await worker.fetch(
      new Request(`http://localhost${currentPath}`, { headers: { accept: "text/html", "user-agent": UA } }),
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );
    if (res.status === 308 || res.status === 307) {
      const loc = res.headers.get("location");
      if (loc) {
        currentPath = new URL(loc, "http://localhost").pathname;
        continue;
      }
    }
    break;
  }
  assert.equal(res.status, expectedStatus, pathname);
  return res.text();
}

async function html(pathname) {
  const raw = await fetchRoute(pathname, 200);
  return raw.replace(/<script[\s\S]*?<\/script>/gu, "").replace(/<style[\s\S]*?<\/style>/gu, "");
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
  test(`English handbook built HTML has no CJK in <head> meta tags, chrome, body, or fenced code: ${route}`, async () => {
    const raw = await fetchRoute(route, 200);
    const page = raw.replace(/<script[\s\S]*?<\/script>/gu, "").replace(/<style[\s\S]*?<\/style>/gu, "");
    assert.deepEqual(chromeChinese(page), []);
    assert.deepEqual(bodyChinese(page), []);
    assert.deepEqual(findBuiltEnglishHtmlCjk(raw, route), []);
  });
}

test("missing /garden/en/* route serves an English 404 with English metadata and zero CJK", async () => {
  const raw404 = await fetchRoute("/garden/en/does-not-exist", 404);
  assert.match(raw404, /<html[^>]*\slang="en"/u);
  assert.match(raw404, /<h1[^>]*>Page not found<\/h1>/u);
  assert.match(raw404, /The address may be wrong, or the page has moved\./u);
  assert.match(raw404, />Back to home</u);
  assert.match(raw404, /<meta property="og:locale" content="en_US"/u);
  assert.deepEqual(findBuiltEnglishHtmlCjk(raw404, "/garden/en/does-not-exist"), []);
});

test("root 404.html without JS shows one line of Chinese and one line of English, never both full copy sets at once", async () => {
  const rawStatic404 = await fetchRoute("/does-not-exist", 404);
  const mainMatch = /<main\b[^>]*\bid="garden-not-found"[^>]*>([\s\S]*?)<\/main>/u.exec(
    rawStatic404.replace(/<script[\s\S]*?<\/script>/gu, ""),
  );
  assert.ok(mainMatch, "root 404 has #garden-not-found main");
  const mainNoJs = mainMatch[1];
  // Shows one line of Chinese (heading) and one line of English (deck)
  assert.match(mainNoJs, /<h1[^>]*>找不到这一页<\/h1>/u);
  assert.match(mainNoJs, /<p[^>]*\blang="en"[^>]*>The address may be wrong, or the page has moved\.<\/p>/u);
  // Never shows both full copy sets at once
  assert.doesNotMatch(mainNoJs, /Page not found/u);
  assert.doesNotMatch(mainNoJs, /地址可能写错了，或者这篇已经不在了。/u);
  assert.doesNotMatch(mainNoJs, /返回首页/u);
  assert.doesNotMatch(mainNoJs, /Back to home/u);
});

test("root 404.html loaded at /garden/en/xxx (with and without basePath) shows English copy, lang=en, and zero CJK", async () => {
  const vm = await import("node:vm");
  const rawStatic404 = await fetchRoute("/does-not-exist", 404);
  const scriptMatch = /<script\b[^>]*\bdata-not-found-script=""[^>]*>([\s\S]*?)<\/script>/u.exec(rawStatic404);
  assert.ok(scriptMatch, "root 404 contains inline language-picker script");

  function runInline404Script(pathname, configuredBasePath = "") {
    const scriptCode = scriptMatch[1].replace(/var b="[^"]*";/u, `var b=${JSON.stringify(configuredBasePath)};`);
    const metaStore = new Map([
      ['meta[name="description"]', "原始中文描述"],
      ['meta[property="og:title"]', "站点名"],
      ['meta[property="og:description"]', "原始中文副标题"],
      ['meta[property="og:locale"]', "zh_CN"],
      ['meta[property="og:image:alt"]', "站点名 · 首页"],
      ['meta[name="twitter:title"]', "站点名"],
      ['meta[name="twitter:description"]', "原始中文副标题"],
    ]);
    const h1 = { textContent: "找不到这一页" };
    const deck = {
      textContent: "The address may be wrong, or the page has moved.",
      lang: "en",
      removeAttribute(attr) {
        if (attr === "lang") this.lang = undefined;
      },
    };
    const homeLink = { textContent: "← /" };
    const skipLink = { textContent: "跳到正文" };
    const footerP = { innerHTML: "© 2026 作者 · 页脚 · 基于 Garden 构建" };
    const headerLinks = [
      { textContent: "文章" },
      { textContent: "随想" },
      { textContent: "专栏" },
      { textContent: "标签" },
      { textContent: "关于" },
      { textContent: "搜索" },
      { textContent: "深色模式" },
    ];
    const headerAria = [
      {
        val: "站点导航",
        getAttribute() { return this.val; },
        setAttribute(_k, v) { this.val = v; },
      },
      {
        val: "搜索文章",
        getAttribute() { return this.val; },
        setAttribute(_k, v) { this.val = v; },
      },
    ];
    const document = {
      documentElement: { lang: "zh-CN" },
      title: "找不到这一页 · Garden",
      querySelector(sel) {
        if (metaStore.has(sel)) {
          return {
            setAttribute(_k, v) { metaStore.set(sel, v); },
          };
        }
        if (sel === ".skip-link") return skipLink;
        if (sel === ".sh-footer .sh-foot > p") return footerP;
        return null;
      },
      querySelectorAll(sel) {
        if (sel.includes("#site-header a")) return headerLinks;
        if (sel.includes("#site-header [aria-label]")) return headerAria;
        return [];
      },
      getElementById(id) {
        if (id !== "garden-not-found") return null;
        return {
          querySelector(sel) {
            if (sel === "h1") return h1;
            if (sel === "[data-not-found-deck]") return deck;
            if (sel === "a[data-not-found-home]") return homeLink;
            return null;
          },
        };
      },
    };
    vm.runInNewContext(scriptCode, { location: { pathname }, document });
    return { document, metaStore, h1, deck, homeLink, skipLink, footerP, headerLinks, headerAria };
  }

  // 1. Without basePath at /garden/en/xxx
  assert.equal(stripConfiguredBasePath("/garden/en/xxx", ""), "/garden/en/xxx");
  assert.equal(pickNotFoundLang("/garden/en/xxx", ""), "en");
  const domNoBase = runInline404Script("/garden/en/xxx", "");
  assert.equal(domNoBase.document.documentElement.lang, "en");
  assert.equal(domNoBase.h1.textContent, "Page not found");
  assert.equal(domNoBase.deck.textContent, "The address may be wrong, or the page has moved.");
  assert.equal(domNoBase.homeLink.textContent, "Back to home");
  assert.equal(domNoBase.metaStore.get('meta[property="og:locale"]'), "en_US");
  const htmlNoBase = applyRoot404ForPath(rawStatic404, "/garden/en/xxx", "");
  assert.match(htmlNoBase, /<html[^>]*\slang="en"/u);
  assert.match(htmlNoBase, /<h1>Page not found<\/h1>/u);
  assert.match(htmlNoBase, />The address may be wrong, or the page has moved\.</u);
  assert.match(htmlNoBase, />Back to home</u);
  assert.deepEqual(findBuiltEnglishHtmlCjk(htmlNoBase, "404.html@/garden/en/xxx"), []);

  // 2. With basePath /garden-docs-v6 at /garden-docs-v6/garden/en/xxx
  assert.equal(stripConfiguredBasePath("/garden-docs-v6/garden/en/xxx", "/garden-docs-v6"), "/garden/en/xxx");
  assert.equal(pickNotFoundLang("/garden-docs-v6/garden/en/xxx", "/garden-docs-v6"), "en");
  const domWithBase = runInline404Script("/garden-docs-v6/garden/en/xxx", "/garden-docs-v6");
  assert.equal(domWithBase.document.documentElement.lang, "en");
  assert.equal(domWithBase.h1.textContent, "Page not found");
  assert.equal(domWithBase.deck.textContent, "The address may be wrong, or the page has moved.");
  assert.equal(domWithBase.homeLink.textContent, "Back to home");
  const htmlWithBase = applyRoot404ForPath(rawStatic404, "/garden-docs-v6/garden/en/xxx", "/garden-docs-v6");
  assert.match(htmlWithBase, /<html[^>]*\slang="en"/u);
  assert.match(htmlWithBase, /<h1>Page not found<\/h1>/u);
  assert.match(htmlWithBase, />Back to home</u);
  assert.deepEqual(findBuiltEnglishHtmlCjk(htmlWithBase, "404.html@/garden-docs-v6/garden/en/xxx"), []);

  // 3. Non-English paths (/garden/xxx, /blog/xxx, /garden-docs-v6/garden/xxx) show Chinese copy
  for (const [p, b] of [
    ["/garden/xxx", ""],
    ["/blog/xxx", ""],
    ["/garden-docs-v6/garden/xxx", "/garden-docs-v6"],
    ["/other-prefix/garden/en/xxx", "/garden-docs-v6"],
  ]) {
    assert.equal(pickNotFoundLang(p, b), "zh", `${p} (base=${b})`);
    const domZh = runInline404Script(p, b);
    assert.equal(domZh.document.documentElement.lang, "zh-CN");
    assert.equal(domZh.h1.textContent, "找不到这一页");
    assert.equal(domZh.deck.textContent, "地址可能写错了，或者这篇已经不在了。");
    assert.equal(domZh.homeLink.textContent, "返回首页");
  }
});

const outDir = new URL("../dist/client/", import.meta.url).pathname;
const exported = fs.existsSync(path.join(outDir, "404.html")) && fs.existsSync(path.join(outDir, "index.html"));

test("static export root 404.html loaded at /garden/en/xxx (with and without basePath) asserts English copy and zero CJK", { skip: exported ? false : "needs a static export in dist/client" }, () => {
  const raw404 = fs.readFileSync(path.join(outDir, "404.html"), "utf8");
  // No nested /garden/en/404.html is emitted
  assert.equal(fs.existsSync(path.join(outDir, "garden", "en", "404.html")), false);

  // Without JS: one line of Chinese and one line of English, never both full copy sets at once
  const mainNoJs = /<main\b[^>]*\bid="garden-not-found"[^>]*>([\s\S]*?)<\/main>/u.exec(
    raw404.replace(/<script[\s\S]*?<\/script>/gu, ""),
  )?.[1] ?? "";
  assert.match(mainNoJs, /<h1[^>]*>找不到这一页<\/h1>/u);
  assert.match(mainNoJs, /<p[^>]*\blang="en"[^>]*>The address may be wrong, or the page has moved\.<\/p>/u);
  assert.doesNotMatch(mainNoJs, /Page not found/u);
  assert.doesNotMatch(mainNoJs, /地址可能写错了，或者这篇已经不在了。/u);

  // Loaded at /garden/en/xxx without basePath
  const enNoBase = applyRoot404ForPath(raw404, "/garden/en/xxx", "");
  assert.match(enNoBase, /<html[^>]*\slang="en"/u);
  assert.match(enNoBase, /<h1>Page not found<\/h1>/u);
  assert.match(enNoBase, />The address may be wrong, or the page has moved\.</u);
  assert.match(enNoBase, />Back to home</u);
  assert.deepEqual(findBuiltEnglishHtmlCjk(enNoBase, "dist/client/404.html@/garden/en/xxx"), []);

  // Loaded at /garden-docs-v6/garden/en/xxx with basePath /garden-docs-v6
  const enWithBase = applyRoot404ForPath(raw404, "/garden-docs-v6/garden/en/xxx", "/garden-docs-v6");
  assert.match(enWithBase, /<html[^>]*\slang="en"/u);
  assert.match(enWithBase, /<h1>Page not found<\/h1>/u);
  assert.match(enWithBase, />The address may be wrong, or the page has moved\.</u);
  assert.match(enWithBase, />Back to home</u);
  assert.deepEqual(findBuiltEnglishHtmlCjk(enWithBase, "dist/client/404.html@/garden-docs-v6/garden/en/xxx"), []);

  // Loaded at a non-English route (/garden/xxx or /blog/xxx): shows Chinese copy
  const zh404 = applyRoot404ForPath(raw404, "/garden/xxx", "");
  assert.match(zh404, /<html[^>]*\slang="zh-CN"/u);
  assert.match(zh404, /<h1>找不到这一页<\/h1>/u);
  assert.match(zh404, />地址可能写错了，或者这篇已经不在了。</u);
  assert.match(zh404, />返回首页</u);
});

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
  for (const path of ["/garden/en", "/garden/en/ai-writing", "/garden/en/components/compare"]) assert.match(await fetchRoute(path, 200), /<html[^>]*\slang="en"/u, path);
  for (const path of ["/garden", "/garden/ai-writing", "/blog", "/thoughts"]) assert.match(await fetchRoute(path, 200), /<html[^>]*\slang="zh-CN"/u, path);
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
