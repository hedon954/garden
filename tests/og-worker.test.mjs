import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createHandler, createRateLimiter, originAllowed } from "../worker/og/handler.mjs";
import { cardDate, cardUpdates, refreshUrl, safeToUpdate } from "../ui/garden/card-refresh.mjs";

const PAGE = `<html><head><meta property="og:title" content="KV Caching, revised">
<meta property="og:description" content="Now with numbers."><meta property="og:image" content="https://cdn.example/x.png">
<meta property="og:site_name" content="Hugging Face"></head><body></body></html>`;
const LISTED = "https://huggingface.co/blog/kv";

function setup({ routes = {}, list = [LISTED], options = {}, now } = {}) {
  const calls = [];
  const store = new Map();
  const fetch = async (url, init) => {
    calls.push(url);
    const route = routes[url];
    if (!route) throw new TypeError("fetch failed");
    if (typeof route === "function") return route(init);
    return new Response(route.body ?? "", { status: route.status ?? 200, headers: route.headers ?? { "content-type": "text/html" } });
  };
  const handle = createHandler({
    fetch,
    loadAllowlist: async () => ({ urls: list }),
    cache: { get: async (key) => store.get(key) ?? null, put: async (key, value) => void store.set(key, value) },
    options: { ratePerMinute: 1000, ...options },
    now,
  });
  return { handle, calls, store };
}

const ask = (target, { origin = "https://hedon.top", method = "GET" } = {}) =>
  new Request(`https://og.example.workers.dev/?url=${encodeURIComponent(target)}`, { method, headers: origin ? { origin } : {} });

test("worker: CORS only for the site and localhost", async () => {
  const config = { allowedOrigins: ["https://hedon.top"], allowLocalhost: true };
  assert.equal(originAllowed("https://hedon.top", config), true);
  assert.equal(originAllowed("http://localhost:4321", config), true);
  assert.equal(originAllowed("http://127.0.0.1:3000", config), true);
  assert.equal(originAllowed("https://evil.example", config), false);
  assert.equal(originAllowed("https://hedon.top.evil.example", config), false);
  assert.equal(originAllowed("http://localhost.evil.example", config), false);
  assert.equal(originAllowed("", config), false);
  assert.equal(originAllowed("http://localhost:4321", { ...config, allowLocalhost: false }), false);

  const { handle, calls } = setup({ routes: { [LISTED]: { body: PAGE } } });
  const denied = await handle(ask(LISTED, { origin: "https://evil.example" }));
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  assert.equal((await handle(ask(LISTED, { origin: "" }))).status, 403);
  assert.deepEqual(calls, []);

  const preflight = await handle(ask(LISTED, { method: "OPTIONS" }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://hedon.top");
  assert.equal(preflight.headers.get("vary"), "Origin");
  assert.equal((await handle(ask(LISTED, { method: "POST" }))).status, 405);
});

test("worker: answers listed URLs with text only, never a remote image", async () => {
  const { handle, calls } = setup({ routes: { [LISTED]: { body: PAGE } } });
  const response = await handle(ask(`${LISTED}#section`, { origin: "http://localhost:4321" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:4321");
  const body = await response.json();
  assert.deepEqual(body, { url: LISTED, title: "KV Caching, revised", description: "Now with numbers.", siteName: "Hugging Face" });
  assert.doesNotMatch(JSON.stringify(body), /cdn\.example|image/u);
  // Second ask is served from cache.
  const again = await handle(ask(LISTED));
  assert.equal(again.headers.get("x-cache"), "hit");
  assert.equal(calls.length, 1);
});

test("worker: anything not in the site's allowlist is refused without fetching", async () => {
  const { handle, calls } = setup({ routes: { [LISTED]: { body: PAGE } } });
  for (const target of ["https://huggingface.co/blog/other", "http://169.254.169.254/latest/meta-data", "http://localhost:8080/", "not a url"]) {
    const response = await handle(ask(target));
    assert.ok([400, 403].includes(response.status), target);
  }
  assert.equal((await handle(new Request("https://og.example/", { headers: { origin: "https://hedon.top" } }))).status, 400);
  assert.deepEqual(calls, []);
});

test("worker: a listed URL on a private address, or redirecting to one, is never fetched there", async () => {
  const { handle, calls } = setup({
    list: ["http://10.0.0.5/admin", LISTED],
    routes: { [LISTED]: () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1:8080/" } }) },
  });
  assert.equal((await handle(ask("http://10.0.0.5/admin"))).status, 502);
  assert.equal((await handle(ask(LISTED))).status, 502);
  assert.deepEqual(calls, [LISTED]);
});

test("worker: non-HTML, oversized and slow pages are refused", async () => {
  const big = `<html><head><title>x</title>${"<meta name=a content=b>".repeat(60000)}`;
  const { handle } = setup({
    list: ["https://a.dev/pdf", "https://a.dev/big", "https://a.dev/slow"],
    routes: {
      "https://a.dev/pdf": { body: "%PDF", headers: { "content-type": "application/pdf" } },
      "https://a.dev/big": { body: big },
      "https://a.dev/slow": (init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")))),
    },
    options: { timeoutMs: 30, maxBytes: 64 * 1024 },
  });
  assert.equal((await handle(ask("https://a.dev/pdf"))).status, 502);
  // A head larger than the cap is cut off; without a usable title the answer is an error, not a hang.
  const bigResponse = await handle(ask("https://a.dev/big"));
  assert.ok([200, 502].includes(bigResponse.status));
  const started = Date.now();
  assert.equal((await handle(ask("https://a.dev/slow"))).status, 502);
  assert.ok(Date.now() - started < 1000);
});

test("worker: per-IP budget", async () => {
  let clock = 0;
  const limit = createRateLimiter({ perMinute: 2, now: () => clock });
  assert.deepEqual([limit("a"), limit("a"), limit("a"), limit("b")], [true, true, false, true]);
  clock += 60000;
  assert.equal(limit("a"), true);

  const { handle } = setup({ routes: { [LISTED]: { body: PAGE } }, options: { ratePerMinute: 1 } });
  assert.equal((await handle(ask(LISTED), { ip: "1.2.3.4" })).status, 200);
  const blocked = await handle(ask(LISTED), { ip: "1.2.3.4" });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("retry-after"), "60");
  assert.equal((await handle(ask(LISTED), { ip: "5.6.7.8" })).status, 200);
});

test("worker: an allowlist that fails to load allows nothing, and a later good load is used", async () => {
  let fail = true;
  const handle = createHandler({
    fetch: async () => new Response(PAGE, { headers: { "content-type": "text/html" } }),
    loadAllowlist: async () => {
      if (fail) throw new Error("site down");
      return { urls: [LISTED] };
    },
    options: { allowlistTtlMs: 0 },
  });
  assert.equal((await handle(ask(LISTED))).status, 403);
  fail = false;
  assert.equal((await handle(ask(LISTED))).status, 200);
});

test("client: only shown fields change, never blanked, never above the fold", () => {
  const shown = { title: "Old title", description: "Old text", siteName: "Hugging Face" };
  assert.deepEqual(cardUpdates(shown, { title: "New  title", description: "", siteName: "Hugging Face", author: "Someone" }), { title: "New title" });
  assert.deepEqual(cardUpdates(shown, null), {});
  assert.deepEqual(cardUpdates({ publishedTime: "2025 年 1 月 30 日" }, { publishedTime: "2025-02-01" }), { publishedTime: "2025 年 2 月 1 日" });
  assert.equal(cardUpdates({ title: "a" }, { title: "x".repeat(400) }).title.length, 200);
  assert.equal(cardDate("2025-01-30T00:00:00Z"), "2025 年 1 月 30 日");
  assert.equal(cardDate("soon"), "");
  assert.equal(safeToUpdate(1200, 900), true);
  assert.equal(safeToUpdate(300, 900), false);
  assert.equal(refreshUrl("https://og.example.dev/", "https://a.dev/x?y=1"), "https://og.example.dev/?url=https%3A%2F%2Fa.dev%2Fx%3Fy%3D1");
  assert.equal(refreshUrl("http://localhost:8787", "https://a.dev/"), "http://localhost:8787/?url=https%3A%2F%2Fa.dev%2F");
  assert.equal(refreshUrl("http://evil.example", "https://a.dev/"), "");
  assert.equal(refreshUrl("javascript:alert(1)", "https://a.dev/"), "");
});

test("client: no Worker configured means no script, and cards work without JavaScript", () => {
  const article = fs.readFileSync(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
  assert.match(article, /const cardWorker = content\.includes\("\{card\}"\) \? siteConfig\.linkPreview\?\.worker : undefined;/u);
  assert.match(article, /\{cardWorker \? <LinkCardRefresh endpoint=\{cardWorker\} \/> : null\}/u);
  const refresh = fs.readFileSync(new URL("../app/components/LinkCardRefresh.tsx", import.meta.url), "utf8");
  assert.match(refresh, /\.catch\(\(\) => \{\}\)/u);
  assert.match(refresh, /credentials: "omit"/u);
  assert.doesNotMatch(refresh, /lc-thumb|\.src\s*=/u);
  const allowlist = JSON.parse(fs.readFileSync(new URL("../public/link-allowlist.json", import.meta.url), "utf8"));
  assert.deepEqual(allowlist.urls, ["https://github.com/remarkjs/remark-gfm", "https://katex.org/docs/supported.html"]);
  const toml = fs.readFileSync(new URL("../worker/og/wrangler.toml", import.meta.url), "utf8");
  assert.match(toml, /main = "index\.mjs"/u);
});
