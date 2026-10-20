import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { ALLOWED_EN_HANDBOOK_CJK } from "../scripts/handbook-allowlist.mjs";
import { findBuiltEnglishHtmlCjk, stripAllowedFigureAllKeywordInHtml } from "../scripts/handbook-facts.mjs";
import { inAppPath, isHandbookPath, pickNotFoundLang, stripConfiguredBasePath } from "../ui/garden/html-lang.mjs";
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

function bodyChinese(page, route = "/garden/en") {
  // Check visible text and attributes inside <main>, excluding the allowlisted 中 switcher,
  // 丨 title-split explanation, and the narrow `"全部"` config value on /garden/en/components/figure.
  const mainMatch = /<main\b[\s\S]*?<\/main>/u.exec(stripAllowedFigureAllKeywordInHtml(page, route));
  const mainHtml = mainMatch ? mainMatch[0] : stripAllowedFigureAllKeywordInHtml(page, route);
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
    assert.deepEqual(bodyChinese(page, route), []);
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

test("stripConfiguredBasePath and pickNotFoundLang resolve /garden/en/* with and without basePath", () => {
  assert.equal(stripConfiguredBasePath("/garden/en/does-not-exist", ""), "/garden/en/does-not-exist");
  assert.equal(pickNotFoundLang("/garden/en/does-not-exist", ""), "en");
  assert.equal(
    stripConfiguredBasePath("/garden-docs-v6/garden/en/does-not-exist", "/garden-docs-v6"),
    "/garden/en/does-not-exist",
  );
  assert.equal(pickNotFoundLang("/garden-docs-v6/garden/en/does-not-exist", "/garden-docs-v6"), "en");
  assert.equal(pickNotFoundLang("/does-not-exist", ""), "zh");
  assert.equal(pickNotFoundLang("/garden/does-not-exist", ""), "zh");
  assert.equal(pickNotFoundLang("/garden-docs-v6/garden/does-not-exist", "/garden-docs-v6"), "zh");
});

const outDir = new URL("../dist/client/", import.meta.url).pathname;
const exported = fs.existsSync(path.join(outDir, "404.html")) && fs.existsSync(path.join(outDir, "index.html"));

test("static export keeps a single root 404.html and no index.txt RSC payload contains Chinese 404 copy", { skip: exported ? false : "needs a static export in dist/client" }, () => {
  assert.equal(fs.existsSync(path.join(outDir, "404.html")), true);
  assert.equal(fs.existsSync(path.join(outDir, "garden", "en", "404.html")), false);

  const indexTxtFiles = fs
    .readdirSync(outDir, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith("index.txt"));
  assert.ok(indexTxtFiles.length > 0, "expected index.txt RSC payloads in dist/client");
  for (const rel of indexTxtFiles) {
    const content = fs.readFileSync(path.join(outDir, rel), "utf8");
    assert.equal(content.includes("找不到这一页"), false, `${rel} should not contain Chinese 404 copy`);
  }
});

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

const MIME_TYPES = {
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

test("real browser renders 404 in English at /garden/en/does-not-exist (with and without basePath) and keeps /does-not-exist Chinese with zero hydration errors", async () => {
  const chromeBin = findChromeBinary();
  assert.ok(chromeBin, "Expected Chrome/Chromium binary to be installed for real-browser 404 test");

  const root404Html = fs.existsSync(path.join(outDir, "404.html"))
    ? fs.readFileSync(path.join(outDir, "404.html"), "utf8")
    : await fetchRoute("/does-not-exist", 404);

  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? "/", "http://127.0.0.1");
    const stripped = u.pathname.replace(/^\/garden-docs-v6(?=\/|$)/u, "") || "/";
    for (const candidatePath of [u.pathname, stripped]) {
      const candidate = path.join(outDir, candidatePath);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const ext = path.extname(candidate);
        res.writeHead(200, { "content-type": MIME_TYPES[ext] ?? "application/octet-stream" });
        res.end(fs.readFileSync(candidate));
        return;
      }
      const idx = path.join(candidate, "index.html");
      if (fs.existsSync(idx) && fs.statSync(idx).isFile()) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(fs.readFileSync(idx));
        return;
      }
    }
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(root404Html);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-chrome-404-"));

  const chrome = spawn(
    chromeBin,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  try {
    const wsUrl = await new Promise((resolve, reject) => {
      let stderr = "";
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for Chrome DevTools:\n${stderr}`)), 45000);
      chrome.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/u);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
      chrome.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Chrome exited prematurely (${code}):\n${stderr}`));
      });
    });

    const browserRes = await fetch(wsUrl.replace(/^ws:/u, "http:").replace(/\/devtools\/browser\/.*$/u, "/json/list"));
    const targets = await browserRes.json();
    const pageWsUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    assert.ok(pageWsUrl, "Expected a debuggable page target in headless Chrome");

    const ws = new WebSocket(pageWsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    let nextId = 1;
    const pending = new Map();
    const consoleErrors = [];
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === "Runtime.consoleAPICalled") {
        const type = msg.params.type;
        const text = (msg.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" ");
        if (type === "error" || type === "warning" || /hydrat|#418|#423|#425/iu.test(text)) {
          consoleErrors.push(`console.${type}: ${text}`);
        }
      } else if (msg.method === "Runtime.exceptionThrown") {
        consoleErrors.push(`exception: ${JSON.stringify(msg.params.exceptionDetails)}`);
      } else if (msg.method === "Log.entryAdded") {
        const entry = msg.params.entry;
        if (entry.level === "error" && entry.source !== "network") {
          consoleErrors.push(`log.${entry.level}: ${entry.text} (${entry.url ?? ""})`);
        }
      }
    });

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");

    async function inspectRouteInBrowser(routePath) {
      consoleErrors.length = 0;
      await send("Page.navigate", { url: `http://127.0.0.1:${port}${routePath}` });
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const check = await send("Runtime.evaluate", {
          expression: `Boolean(document.getElementById("garden-not-found") && Object.keys(document.getElementById("garden-not-found")).some(k => k.startsWith("__reactProps$")))`,
          returnByValue: true,
        });
        if (check.result?.value === true) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      // Wait an extra tick after hydration for layout effects and any post-hydration warnings
      await new Promise((r) => setTimeout(r, 150));
      const evalRes = await send("Runtime.evaluate", {
        expression: `(() => {
          const mainEl = document.getElementById("garden-not-found");
          const hydrated = Boolean(mainEl && Object.keys(mainEl).some(k => k.startsWith("__reactProps$")));
          const meta = (sel) => document.querySelector(sel)?.getAttribute("content") ?? null;
          return {
            hydrated,
            lang: document.documentElement.lang,
            title: document.title,
            h1: document.querySelector("h1")?.textContent ?? null,
            deck: document.querySelector("#garden-not-found .sh-deck")?.textContent ?? null,
            homeLink: document.querySelector("#garden-not-found a")?.textContent ?? null,
            description: meta('meta[name="description"]'),
            ogTitle: meta('meta[property="og:title"]'),
            ogDescription: meta('meta[property="og:description"]'),
            ogLocale: meta('meta[property="og:locale"]'),
            ogImageAlt: meta('meta[property="og:image:alt"]'),
            twitterTitle: meta('meta[name="twitter:title"]'),
            twitterDescription: meta('meta[name="twitter:description"]'),
            visibleText: document.body.innerText,
          };
        })()`,
        returnByValue: true,
      });
      return {
        ...evalRes.result.value,
        consoleErrors: [...consoleErrors],
      };
    }

    // 1. English 404 without basePath (/garden/en/does-not-exist) and with basePath (/garden-docs-v6/garden/en/does-not-exist)
    for (const enPath of ["/garden/en/does-not-exist", "/garden-docs-v6/garden/en/does-not-exist"]) {
      const snap = await inspectRouteInBrowser(enPath);
      assert.equal(snap.hydrated, true, `${enPath} should hydrate in Chrome`);
      assert.deepEqual(snap.consoleErrors, [], `${enPath} should have zero hydration or console errors`);
      assert.equal(snap.lang, "en", `${enPath} <html lang>`);
      assert.match(snap.title, /^Page not found · /u, `${enPath} document.title`);
      assert.equal(HAN.test(snap.title), false, `${enPath} title must not contain CJK: ${snap.title}`);
      assert.equal(snap.h1, "Page not found", `${enPath} <h1>`);
      assert.equal(snap.deck, "The address may be wrong, or the page has moved.", `${enPath} deck`);
      assert.equal(snap.homeLink, "Back to home", `${enPath} home link`);
      assert.equal(snap.description, "The address may be wrong, or the page has moved.");
      assert.match(snap.ogTitle ?? "", /^Page not found · /u);
      assert.equal(snap.ogDescription, "The address may be wrong, or the page has moved.");
      assert.equal(snap.ogLocale, "en_US");
      assert.match(snap.ogImageAlt ?? "", /^Page not found · /u);
      assert.match(snap.twitterTitle ?? "", /^Page not found · /u);
      assert.equal(snap.twitterDescription, "The address may be wrong, or the page has moved.");

      // Visible text must have no CJK (apart from the single allowlisted 中 switcher button)
      const visibleWithoutSwitcher = snap.visibleText.replace(/中\s*\/\s*EN/gu, "EN");
      const cjkInVisible = [...visibleWithoutSwitcher].filter((ch) => HAN.test(ch));
      assert.deepEqual(cjkInVisible, [], `${enPath} visible text must not contain CJK: ${snap.visibleText}`);
    }

    // 2. Non-English 404 (/does-not-exist) stays Chinese
    const zhSnap = await inspectRouteInBrowser("/does-not-exist");
    assert.equal(zhSnap.hydrated, true, "/does-not-exist should hydrate in Chrome");
    assert.deepEqual(zhSnap.consoleErrors, [], "/does-not-exist should have zero hydration or console errors");
    assert.equal(zhSnap.lang, "zh-CN");
    assert.match(zhSnap.title, /^找不到这一页 · /u);
    assert.equal(zhSnap.h1, "找不到这一页");
    assert.equal(zhSnap.deck, "地址可能写错了，或者这篇已经不在了。");
    assert.equal(zhSnap.homeLink, "返回首页");
    assert.equal(zhSnap.description, "地址可能写错了，或者这篇已经不在了。");
    assert.match(zhSnap.ogTitle ?? "", /^找不到这一页 · /u);
    assert.equal(zhSnap.ogDescription, "地址可能写错了，或者这篇已经不在了。");
    assert.equal(zhSnap.ogLocale, "zh_CN");

    await send("Browser.close").catch(() => {});
    ws.close();
  } finally {
    if (chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill("SIGTERM");
      await new Promise((resolve) => {
        const t = setTimeout(() => {
          chrome.kill("SIGKILL");
          resolve();
        }, 2000);
        chrome.once("exit", () => {
          clearTimeout(t);
          resolve();
        });
      });
    }
    server.close();
    await fs.promises.rm(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
  }
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

test("routeLang: /garden/en is English, /garden is Chinese, elsewhere the site language", () => {
  const src = fs.readFileSync(new URL("../app/lib/i18n.ts", import.meta.url), "utf8");
  assert.match(src, /\^\\\/garden\\\/en\(\\\/\|\$\)/u);
  assert.match(src, /return siteLang;\n\}/u);
  assert.equal(inAppPath("/garden/en/does-not-exist"), "/garden/en/does-not-exist");
  assert.equal(inAppPath("/garden-docs-v6/garden/en/does-not-exist"), "/garden/en/does-not-exist");
  assert.equal(isHandbookPath("/garden/en/does-not-exist"), true);
  assert.equal(isHandbookPath("/garden-docs-v6/garden/en/does-not-exist"), true);
  assert.equal(isHandbookPath("/does-not-exist"), false);
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
