import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { clientAssetFiles } from "./client-assets.mjs";
import { buildFullIndex, buildSearchIndex, fullText } from "../ui/garden/search-index.mjs";
import { createSearch, queryTerms } from "../ui/garden/search-match.mjs";
import { expandFullIndex, loadFullIndex, saveDataOn, whenIdleAfterLoad } from "../ui/garden/search-full.mjs";

const root = new URL("../", import.meta.url);

test("full text: markdown, HTML, math and long code blocks are stripped; short code stays", () => {
  const text = fullText([
    "# 标题",
    "",
    "正文里有 `inline_code` 和 [链接文字](https://example.com) 以及 <b>粗体</b>。",
    "",
    "- [x] 已完成的事",
    "> [!TIP]",
    "> 提示内容[^1]",
    "",
    "```sh",
    "npm i hd-garden",
    "```",
    "",
    "```rust",
    "fn a() {}",
    "fn b() {}",
    "fn c() {}",
    "fn d() {}",
    "fn e() {}",
    "```",
    "",
    "$$",
    "x^2 + y^2",
    "$$",
    "",
    "[^1]: 脚注正文",
  ].join("\n"));
  assert.equal(text, "标题 正文里有 inline_code 和 链接文字 以及 粗体 。 已完成的事 提示内容 npm i hd-garden 脚注正文");
});

test("full index: aligned with the small index, named by a hash of its text", () => {
  const posts = [{ title: "A", path: "a", date: "2026-01-01", content: "第一篇正文" }];
  const thoughts = [{ title: "T", slug: "t", date: "2026-01-02", content: "一条随想" }];
  // A post that sits in a column is one entry, at its /blog/ URL.
  const columns = [{ ...posts[0], column: "c", columnTitle: "专栏", path: "c/a" }];
  const full = buildFullIndex({ posts, columns, thoughts });
  assert.deepEqual(full.texts, ["第一篇正文", "一条随想"]);
  assert.deepEqual(expandFullIndex(full), [["/blog/a", "第一篇正文"], ["/thoughts/t", "一条随想"]]);
  assert.deepEqual(full.docs.map(([url]) => url), buildSearchIndex({ posts, columns, thoughts }).map((record) => record.path));
  assert.match(full.fileName, /^search-full\.[0-9a-f]{10}\.json$/u);
  assert.deepEqual(JSON.parse(full.json), { hash: full.hash, texts: full.texts, docs: full.docs });
  assert.throws(() => expandFullIndex({ docs: [] }));
  assert.equal(buildFullIndex({ posts, columns, thoughts }).hash, full.hash);
  assert.notEqual(buildFullIndex({ posts: [{ ...posts[0], content: "改过的正文" }], columns, thoughts }).hash, full.hash);
});

test("search finds a phrase that only appears deep in a body, with a snippet around it", () => {
  const filler = "前面是很长的一段铺垫文字。".repeat(60);
  const posts = [
    { title: "窗台香草", path: "herbs", date: "2026-01-01", tags: ["园艺"], content: `${filler}\n\n剪叶之后把盆转半圈，让另一面也能见到上午的光。` },
    { title: "Rust 内存序", path: "rust", date: "2026-01-02", tags: ["Rust"], content: "Acquire 和 Release 成对出现。" },
  ];
  const records = buildSearchIndex({ posts });
  const bodies = new Map(expandFullIndex(buildFullIndex({ posts })));

  // The excerpt index cannot see it…
  assert.equal(createSearch(records).search("把盆转半圈").length, 0);
  // …the full text can.
  const [hit, ...rest] = createSearch(records, bodies).search("把盆转半圈");
  assert.equal(rest.length, 0);
  assert.equal(hit.item.path, "/blog/herbs");
  const content = hit.matches.find((match) => match.key === "content");
  const [start, end] = content.indices[0];
  assert.equal(hit.item.content.slice(start, end + 1), "把盆转半圈");

  // Every word has to match, in any field; case does not matter.
  assert.equal(createSearch(records, bodies).search("rust release")[0].item.path, "/blog/rust");
  assert.equal(createSearch(records, bodies).search("rust 盆").length, 0);
  // Title hits rank above body hits.
  const ranked = createSearch(records, new Map([["/blog/herbs", "顺便提到 Rust"], ["/blog/rust", "x"]])).search("rust");
  assert.deepEqual(ranked.map((result) => result.item.path), ["/blog/rust", "/blog/herbs"]);
  assert.deepEqual(queryTerms("  Rust  rust 内存 "), ["rust", "内存"]);
});

test("the example site's full index has bodies the excerpts do not", () => {
  const file = fs.readdirSync(new URL("public/", root)).find((name) => /^search-full\.[0-9a-f]+\.json$/u.test(name));
  assert.ok(file, "run garden sync first");
  const full = JSON.parse(fs.readFileSync(new URL(`public/${file}`, root), "utf8"));
  assert.equal(file, `search-full.${full.hash}.json`);
  const small = JSON.parse(fs.readFileSync(new URL("public/search-index.json", root), "utf8"));
  const phrase = "剪叶之后把盆转半圈";
  assert.ok(full.texts.some((text) => text.includes(phrase)));
  assert.ok(!JSON.stringify(small).includes(phrase));
  const config = fs.readFileSync(new URL(".garden/site-config.ts", root), "utf8");
  assert.ok(config.includes(`/search-full.${full.hash}.json`), "site config points at the current file");
  assert.equal(createSearch(small, new Map(expandFullIndex(full))).search(phrase)[0]?.item.path, "/blog/windowsill-herbs");
});

test("search stays fast on a site the size of hedon.top", () => {
  const word = (index) => `段落${index % 97}内容讲到第${index}个概念和一些 English words like cache memory ordering`;
  const posts = Array.from({ length: 120 }, (_, n) => ({
    title: `第 ${n} 篇`, path: `p${n}`, date: "2026-01-01", tags: ["tag"],
    content: Array.from({ length: 300 }, (_, i) => word(n * 300 + i)).join("。"),
  }));
  const records = buildSearchIndex({ posts });
  const engine = createSearch(records, new Map(expandFullIndex(buildFullIndex({ posts }))));
  const queries = ["c", "ca", "cac", "cache", "cache m", "cache me", "段", "段落", "段落4", "概念", "不存在的词"];
  engine.search("warm up");
  const started = performance.now();
  for (const query of queries) engine.search(query);
  const perKeystroke = (performance.now() - started) / queries.length;
  assert.ok(perKeystroke < 50, `${perKeystroke.toFixed(1)} ms per keystroke`);
});

function fakeWindow(readyState) {
  const listeners = {};
  const idle = [];
  return {
    idle,
    document: { readyState },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
    requestIdleCallback: (fn, options) => { idle.push({ fn, options }); return idle.length; },
    cancelIdleCallback: () => {},
    fire: (type) => listeners[type]?.(),
  };
}

test("the full index is fetched only after load, when the browser is idle", () => {
  const win = fakeWindow("interactive");
  let runs = 0;
  whenIdleAfterLoad(() => { runs += 1; }, { win });
  assert.equal(win.idle.length, 0, "nothing scheduled before load");
  win.fire("load");
  assert.equal(win.idle.length, 1);
  assert.ok(win.idle[0].options.timeout > 0, "idle callback has a timeout");
  assert.equal(runs, 0, "not run until idle");
  win.idle[0].fn();
  assert.equal(runs, 1);

  // Already loaded: straight to idle. Without requestIdleCallback: a timer.
  const loaded = fakeWindow("complete");
  whenIdleAfterLoad(() => {}, { win: loaded });
  assert.equal(loaded.idle.length, 1);
  const timers = [];
  const old = { ...fakeWindow("complete"), requestIdleCallback: undefined, setTimeout: (fn, ms) => timers.push(ms) };
  whenIdleAfterLoad(() => {}, { win: old });
  assert.equal(timers.length, 1);

  // Cancelled before load: never runs.
  const leaving = fakeWindow("loading");
  const cancel = whenIdleAfterLoad(() => { throw new Error("ran"); }, { win: leaving });
  cancel();
  leaving.fire("load");
  assert.equal(leaving.idle.length, 0);

  assert.equal(saveDataOn({ connection: { saveData: true } }), true);
  assert.equal(saveDataOn({}), false);
});

test("a cached index makes no request; storage errors fall back to the network", async () => {
  const docs = [["/blog/a", "正文"]];
  const file = { hash: "new", texts: ["正文"], docs: [["/blog/a", 0]] };
  const noNetwork = () => { throw new Error("network used"); };
  const hit = await loadFullIndex({ url: "/search-full.abc.json", hash: "abc", fetcher: noNetwork, store: { get: async (hash) => (hash === "abc" ? file : null), replace: async () => {} } });
  assert.deepEqual(hit, docs);

  const requests = [];
  const replaced = [];
  const fetcher = async (url) => { requests.push(url); return { ok: true, json: async () => file }; };
  const miss = await loadFullIndex({ url: "/search-full.new.json", hash: "new", fetcher, store: { get: async () => null, replace: async (hash, value) => replaced.push([hash, value]) } });
  assert.deepEqual(miss, docs);
  assert.deepEqual(requests, ["/search-full.new.json"]);
  assert.deepEqual(replaced, [["new", file]], "the new version replaces the old entry");

  const broken = { get: async () => { throw new Error("quota"); }, replace: async () => { throw new Error("quota"); } };
  assert.deepEqual(await loadFullIndex({ url: "/x.json", hash: "x", fetcher, store: broken }), docs);
  assert.deepEqual(await loadFullIndex({ url: "/x.json", hash: "x", fetcher, store: null }), docs);
  await assert.rejects(loadFullIndex({ url: "/x.json", hash: "x", fetcher: async () => ({ ok: false, status: 404 }), store: null }));
});

test("the header loads full text in the background, never in the page bundle", () => {
  const header = fs.readFileSync(new URL("app/components/SiteHeader.tsx", root), "utf8");
  assert.match(header, /saveDataOn\(\)/u);
  assert.match(header, /whenIdleAfterLoad\(/u);
  assert.doesNotMatch(header, /import [^;]*search-full\.[0-9a-f]+\.json/u);
  const scripts = clientAssetFiles(/\.js$/u);
  assert.ok(scripts.length > 0, "run the build first");
  for (const file of scripts) {
    assert.ok(!fs.readFileSync(file, "utf8").includes("剪叶之后把盆转半圈"), `${path.basename(file)} carries body text`);
  }
});

test("search lists a post once, at its /blog/ URL, with its column as the chip", () => {
  // As the build makes them: a column entry is the post itself plus column fields.
  const go = { title: "内存模型", path: "go/go-memory-model", sourcePath: "posts/go/go-memory-model.md", date: "2026-01-03", content: "Go 内存模型" };
  const lone = { title: "独立文章", path: "lone", sourcePath: "posts/lone.md", date: "2026-01-02", content: "没有专栏" };
  const posts = [go, lone];
  const columns = [{ ...go, kind: "column", column: "go-advance", columnTitle: "Go 底层原理", order: 1 }];
  const thoughts = [{ title: "T", slug: "t", date: "2026-01-01", content: "一条随想" }];
  const records = buildSearchIndex({ posts, columns, thoughts });
  assert.deepEqual(records.map((record) => [record.path, record.section]), [
    ["/blog/go/go-memory-model", "Go 底层原理"],
    ["/blog/lone", ""],
    ["/thoughts/t", "随想"],
  ]);
  assert.equal(new Set(records.map((record) => record.title)).size, records.length, "no post twice");
  assert.ok(!records.some((record) => record.path.startsWith("/columns/")));
  // The recent list is the first records: no duplicates there either.
  assert.deepEqual(records.slice(0, 2).map((record) => record.title), ["内存模型", "独立文章"]);
  // Searching returns the post once, so the count is the number of posts.
  const hits = createSearch(records, new Map(expandFullIndex(buildFullIndex({ posts, columns, thoughts })))).search("内存", 6);
  assert.deepEqual(hits.map((hit) => hit.item.path), ["/blog/go/go-memory-model"]);
  // The full-text file follows the same entries.
  assert.deepEqual(buildFullIndex({ posts, columns, thoughts }).docs.map(([url]) => url), records.map((record) => record.path));
});

test("the search label counts every match, not only the rows shown", () => {
  const posts = Array.from({ length: 9 }, (_, index) => ({ title: `Go 内存 ${index}`, path: `p${index}`, date: `2026-01-0${index + 1}`, content: "x" }));
  const engine = createSearch(buildSearchIndex({ posts }));
  const { hits, total } = engine.find("go 内存", 6);
  assert.equal(hits.length, 6);
  assert.equal(total, 9);
  assert.deepEqual(engine.find("", 6), { hits: [], total: 0 });
  // The dialog shows six rows, so its label uses the total.
  const header = fs.readFileSync(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8");
  assert.match(header, /\$\{resultTotal\} 篇相关文章/);
  assert.doesNotMatch(header, /results\.length\} 个相关结果/);
});

test("search text keeps a link's or image's words and drops the whole address, in <…> or with parentheses", () => {
  const md = "图 ![ParentDocumentRetriever](<https://o.com/img/image%20(1).png>) 后文 [Trie](https://en.wikipedia.org/wiki/Trie_(data_structure)) 和 [空格](<https://e.com/a b> \"标题\") 完";
  assert.equal(fullText(md), "图 ParentDocumentRetriever 后文 Trie 和 空格 完");
});
