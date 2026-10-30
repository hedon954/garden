import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  fetchFavicon,
  fetchPageMeta,
  metaRefreshTarget,
  isPublicUrl,
  isSiteBrandOgImage,
  linkHost,
  parseHead,
  safeFetch,
} from "../scripts/link-meta-core.mjs";
import { linkAssetsForRender, readLinkCache, refreshLinkAssets } from "../scripts/link-assets.mjs";
import { markdownLinks } from "../ui/garden/markdown-links.mjs";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

/** A fake web: url → { status, type, body, location }. Anything else is a network error. */
function fakeFetch(routes, calls = []) {
  return async (url) => {
    calls.push(url);
    const route = routes[url];
    if (!route) throw new TypeError(`fetch failed: ${url}`);
    if (route instanceof Error) throw route;
    const headers = new Headers();
    if (route.type) headers.set("content-type", route.type);
    if (route.location) headers.set("location", route.location);
    return new Response(route.status && route.status >= 300 && route.status < 400 ? null : route.body ?? "", {
      status: route.status ?? 200,
      headers,
    });
  };
}

function site(posts) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "garden-links-"));
  fs.mkdirSync(path.join(root, "content", "posts"), { recursive: true });
  fs.mkdirSync(path.join(root, "public"), { recursive: true });
  for (const [name, body] of Object.entries(posts)) {
    fs.writeFileSync(path.join(root, "content", "posts", name), `---\ntitle: t\n---\n${body}\n`);
  }
  return root;
}

const HEAD = `<!doctype html><html><head>
<title>Fallback &amp; title</title>
<meta property="og:title" content="KV Caching Explained">
<meta property="og:description" content="How the cache &quot;works&quot;.">
<meta property="og:image" content="/img/cover.png">
<meta property="og:site_name" content="Hugging Face">
<meta name="author" content="Not Lain">
<meta property="article:published_time" content="2025-01-30T08:00:00Z">
<link rel="apple-touch-icon" href="/apple.png">
<link rel="icon" sizes="32x32" href="/fav-32.png">
<link rel="shortcut icon" href="/favicon.ico">
</head><body>ignored</body></html>`;

test("parseHead reads Open Graph fields and ranks icon candidates", () => {
  const meta = parseHead(HEAD, "https://huggingface.co/blog/kv");
  assert.equal(meta.title, "KV Caching Explained");
  assert.equal(meta.description, 'How the cache "works".');
  assert.equal(meta.image, "https://huggingface.co/img/cover.png");
  assert.equal(meta.siteName, "Hugging Face");
  assert.equal(meta.author, "Not Lain");
  assert.equal(meta.publishedTime, "2025-01-30");
  assert.deepEqual(meta.icons, [
    "https://huggingface.co/fav-32.png",
    "https://huggingface.co/favicon.ico",
    "https://huggingface.co/apple.png",
  ]);
  assert.equal(parseHead("<head><title>Only</title></head>", "https://a.com/").title, "Only");
  assert.equal(parseHead('<head><meta name="author" content="https://x.com/me"></head>', "https://a.com/").author, "");
});

test("site brand /og.png is not treated as a card cover image", () => {
  assert.equal(isSiteBrandOgImage("https://hedon.top/og.png"), true);
  assert.equal(isSiteBrandOgImage("https://hedon.top/og.png?v=1"), true);
  assert.equal(isSiteBrandOgImage("https://other.example/og.png"), true);
  assert.equal(isSiteBrandOgImage("https://other.example/media/og.png"), false);
  assert.equal(isSiteBrandOgImage("https://hedon.top/media/covers/x.jpg"), false);
  assert.equal(isSiteBrandOgImage("https://hedon.top/og.pngx"), false);
  assert.equal(isSiteBrandOgImage(""), false);

  const brandOnly = `<head><meta property="og:title" content="Synctest">
<meta property="og:description" content="A note.">
<meta name="twitter:image" content="https://hedon.top/og.png"></head>`;
  assert.equal(parseHead(brandOnly, "https://hedon.top/blog/x/").image, "");

  const realCover = `<head><meta property="og:title" content="With cover">
<meta property="og:image" content="https://hedon.top/media/covers/real.webp"></head>`;
  assert.equal(parseHead(realCover, "https://hedon.top/blog/y/").image, "https://hedon.top/media/covers/real.webp");
});

test("only public http(s) addresses may be fetched", () => {
  for (const ok of ["https://huggingface.co/blog", "http://example.com:80/x", "https://[2606:4700::1111]/"]) {
    assert.equal(isPublicUrl(ok), true, ok);
  }
  for (const bad of [
    "file:///etc/passwd",
    "ftp://example.com/",
    "http://localhost/",
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://172.20.0.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://100.64.0.1/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://printer.local/",
    "http://metadata.google.internal/",
    "https://example.com:8443/",
    "https://user:pw@example.com/",
    "http://intranet/",
  ]) {
    assert.equal(isPublicUrl(bad), false, bad);
  }
  assert.equal(linkHost("https://www.Example.com/a"), "example.com");
});

test("redirects are followed by hand and a hop to a private address is refused", async () => {
  const fetch = fakeFetch({
    "https://a.com/": { status: 301, location: "https://b.com/" },
    "https://b.com/": { status: 302, location: "http://169.254.169.254/" },
  });
  await assert.rejects(() => safeFetch("https://a.com/", { fetch }), /blocked address/u);
  const ok = fakeFetch({
    "https://a.com/": { status: 301, location: "/final" },
    "https://a.com/final": { type: "text/html", body: HEAD },
  });
  const meta = await fetchPageMeta("https://a.com/", { fetch: ok });
  assert.equal(meta.url, "https://a.com/final");
  assert.equal(meta.title, "KV Caching Explained");
});

test("HTML meta refresh is followed before reading Open Graph", async () => {
  const stub = `<!doctype html><html><head><title>页面已移动</title>
<meta http-equiv="refresh" content="0; url=/blog/go/final/">
<link rel="canonical" href="https://a.com/blog/go/final/"></head><body></body></html>`;
  assert.equal(metaRefreshTarget(stub, "https://a.com/old/"), "https://a.com/blog/go/final/");
  const fetch = fakeFetch({
    "https://a.com/old/": { type: "text/html", body: stub },
    "https://a.com/blog/go/final/": { type: "text/html", body: HEAD },
  });
  const meta = await fetchPageMeta("https://a.com/old/", { fetch });
  assert.equal(meta.url, "https://a.com/blog/go/final/");
  assert.equal(meta.title, "KV Caching Explained");
  assert.equal(meta.description, 'How the cache "works".');
});

test("non-HTML pages are not parsed", async () => {
  const fetch = fakeFetch({ "https://a.com/file.pdf": { type: "application/pdf", body: "%PDF" } });
  await assert.rejects(() => fetchPageMeta("https://a.com/file.pdf", { fetch }), /not HTML/u);
});

test("favicon: <link rel=icon> first, then /favicon.ico, else nothing", async () => {
  const calls = [];
  const fetch = fakeFetch({
    "https://huggingface.co/": { type: "text/html", body: HEAD },
    "https://huggingface.co/fav-32.png": { status: 404 },
    "https://huggingface.co/favicon.ico": { type: "application/octet-stream", body: PNG },
  }, calls);
  const icon = await fetchFavicon("https://huggingface.co/blog/kv", { fetch });
  assert.equal(icon.source, "https://huggingface.co/favicon.ico");
  assert.equal(icon.ext, "ico");
  assert.deepEqual([...icon.bytes], [...PNG]);
  assert.deepEqual(calls.slice(0, 3), ["https://huggingface.co/", "https://huggingface.co/fav-32.png", "https://huggingface.co/favicon.ico"]);

  const noHead = fakeFetch({ "https://plain.dev/favicon.ico": { type: "image/x-icon", body: PNG } });
  assert.equal((await fetchFavicon("https://plain.dev/post", { fetch: noHead })).ext, "ico");

  const html = fakeFetch({ "https://bad.dev/favicon.ico": { type: "text/html", body: "<html>" } });
  assert.equal(await fetchFavicon("https://bad.dev/x", { fetch: html }), null);
  assert.equal(await fetchFavicon("https://down.dev/x", { fetch: fakeFetch({}) }), null);
});

test("markdownLinks finds body links and skips code", () => {
  const links = markdownLinks([
    "See [Hugging Face](https://huggingface.co/blog/kv) and <https://a.com/x>.",
    "Bare https://bare.dev/page here. ![img](https://img.dev/a.png)",
    "`[code](https://code.dev/)` stays code.",
    "```",
    "[fenced](https://fenced.dev/)",
    "```",
  ].join("\n"));
  assert.deepEqual(links.map((link) => link.url), ["https://huggingface.co/blog/kv", "https://a.com/x", "https://bare.dev/page"]);
});

test("refreshLinkAssets downloads icons into the site and caches them", async () => {
  const root = site({ "a.md": "Read [HF](https://huggingface.co/blog/kv) and [down](https://down.dev/x)." });
  const fetch = fakeFetch({
    "https://huggingface.co/": { type: "text/html", body: "<head></head>" },
    "https://huggingface.co/favicon.ico": { type: "image/png", body: PNG },
  });
  const { stats } = await refreshLinkAssets({ siteRoot: root, fetch, dnsCheck: false });
  assert.deepEqual(stats, { fetched: 1, cached: 0, missing: 1 });
  const cache = readLinkCache(root);
  assert.match(cache.favicons["huggingface.co"].file, /^\/link-assets\/fav\/huggingface\.co-[0-9a-f]{10}\.png$/u);
  assert.equal(cache.favicons["down.dev"], undefined);
  const file = path.join(root, "public", cache.favicons["huggingface.co"].file);
  assert.deepEqual([...fs.readFileSync(file)], [...PNG]);
  assert.deepEqual(linkAssetsForRender(root, "/blog"), {
    favicons: { "huggingface.co": `/blog${cache.favicons["huggingface.co"].file}` },
    cards: {},
  });
});

test("a build with no network keeps the cached icons and never throws", async () => {
  const root = site({ "a.md": "Read [HF](https://huggingface.co/blog/kv) and [gone](https://gone.dev/x)." });
  const online = fakeFetch({ "https://huggingface.co/favicon.ico": { type: "image/png", body: PNG } });
  await refreshLinkAssets({ siteRoot: root, fetch: online, dnsCheck: false });
  const before = readLinkCache(root);

  const offline = async () => {
    throw new TypeError("getaddrinfo ENOTFOUND");
  };
  const { stats } = await refreshLinkAssets({ siteRoot: root, fetch: offline, dnsCheck: false });
  assert.deepEqual(stats, { fetched: 0, cached: 1, missing: 1 });
  assert.deepEqual(readLinkCache(root), before);

  // Timeouts and garbage responses are just misses too.
  const hanging = (url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
  await refreshLinkAssets({ siteRoot: root, fetch: hanging, dnsCheck: false, timeoutMs: 20 });
  assert.deepEqual(readLinkCache(root), before);

  // A cache entry whose file is gone is not used.
  fs.rmSync(path.join(root, "public", "link-assets"), { recursive: true });
  assert.deepEqual(linkAssetsForRender(root), { favicons: {}, cards: {} });
});

test("a site with no cache and no network renders links without icons", async () => {
  const root = site({ "a.md": "[x](https://x.dev/)" });
  await refreshLinkAssets({ siteRoot: root, fetch: async () => { throw new Error("offline"); }, dnsCheck: false });
  assert.deepEqual(linkAssetsForRender(root), { favicons: {}, cards: {} });
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "garden-empty-"));
  assert.deepEqual(linkAssetsForRender(empty), { favicons: {}, cards: {} });
  await refreshLinkAssets({ siteRoot: empty, fetch: async () => { throw new Error("offline"); } });
});

test("external links show the local favicon before the text", () => {
  const source = fs.readFileSync(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
  assert.match(source, /linkAssets\?\.favicons\?\.\[linkHost\(href\)\]/u);
  assert.match(source, /if \(!src\) return null;/u);
  assert.match(source, /<span className="fav-keep">\{icon\}\{first\}<\/span>/u);
  assert.match(source, /\{external && href \? <WithFavicon href=\{href\}>\{children\}<\/WithFavicon> : children\}/u);
  const css = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.match(css, /\.markdown-body a\.ext img\.fav \{[^}]*width: 14px;[^}]*height: 14px;/u);
  assert.match(css, /\.markdown-body a\.ext \.fav-keep \{\s*white-space: nowrap;/u);
  // A long first word (a bare URL) keeps only its head with the icon; the rest wraps.
  assert.match(source, /if \(match\[1\]\.trim\(\)\.length > 24\)/u);
  assert.match(css, /\.markdown-body a\.ext \{\s*overflow-wrap: break-word;/u);
  const bin = fs.readFileSync(new URL("../bin/garden.mjs", import.meta.url), "utf8");
  assert.match(bin, /case "build":\s*\/\/[^\n]*\n\s*if \(process\.env\.GARDEN_OFFLINE !== "1"\) runNode\("scripts\/link-assets\.mjs"\);/u);
});

test("a multi-size .ico is cut down to the image closest to 32px", async () => {
  const { trimIco } = await import("../scripts/link-meta-core.mjs");
  const images = [
    { width: 16, data: new Uint8Array(40).fill(1) },
    { width: 32, data: new Uint8Array(60).fill(2) },
    { width: 0, data: new Uint8Array(500).fill(3) }, // 256px
  ];
  const header = 6 + images.length * 16;
  const total = header + images.reduce((sum, image) => sum + image.data.length, 0);
  const ico = new Uint8Array(total);
  const view = new DataView(ico.buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = header;
  images.forEach((image, index) => {
    const at = 6 + index * 16;
    ico[at] = image.width;
    ico[at + 1] = image.width;
    view.setUint16(at + 6, 32, true);
    view.setUint32(at + 8, image.data.length, true);
    view.setUint32(at + 12, offset, true);
    ico.set(image.data, offset);
    offset += image.data.length;
  });
  const trimmed = trimIco(ico);
  assert.equal(trimmed.byteLength, 22 + 60);
  const out = new DataView(trimmed.buffer);
  assert.equal(out.getUint16(4, true), 1);
  assert.equal(trimmed[6], 32);
  assert.equal(out.getUint32(18, true), 22);
  assert.ok(trimmed.subarray(22).every((byte) => byte === 2));
  assert.equal(trimIco(PNG), PNG);
});
