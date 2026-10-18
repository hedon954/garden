import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { remarkA2 } from "../app/lib/remark-a2.mjs";
import { imageSources, probeRemoteSize, readImageCache, refreshImageSizes, sizeFromBytes, svgSizeFromHead } from "../scripts/image-sizes.mjs";
import { figureBreakout, figureImageWidth, figureLayout } from "../ui/garden/enhance.mjs";
import { imageDimensions, lookupImageSize } from "../ui/garden/image-dims.mjs";

// A 1×1 PNG grown to 300×120 in its header: enough for the size, nothing else.
function pngHeader(width, height) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes.set([8, 6, 0, 0, 0], 24);
  return bytes;
}

const noDns = async () => {};

test("image sources: Markdown and HTML images, balanced parentheses, code skipped", () => {
  const body = [
    "![a](https://cdn.example.com/img/image%20(9).png)",
    "![b](<./shots/a b.png> \"标题\")",
    "<img src=\"/media/posts/x.webp\" width=\"300\">",
    "`![code](https://cdn.example.com/no.png)`",
    "```md\n![fence](https://cdn.example.com/no2.png)\n```",
    "![a again](https://cdn.example.com/img/image%20(9).png)",
  ].join("\n\n");
  assert.deepEqual(imageSources(body), ["https://cdn.example.com/img/image%20(9).png", "./shots/a b.png", "/media/posts/x.webp"]);
});

test("sizes come from the header bytes; SVGs from their opening tag even when it is cut off", () => {
  assert.deepEqual(sizeFromBytes(pngHeader(300, 120)), { width: 300, height: 120 });
  assert.equal(sizeFromBytes(new Uint8Array([1, 2, 3])), null);
  const svg = new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" width="776px" height="326px" content="${"x".repeat(9000)}`);
  assert.deepEqual(sizeFromBytes(svg), { width: 776, height: 326 });
  assert.deepEqual(svgSizeFromHead('<?xml version="1.0"?><svg viewBox="0 0 640 360">'), { width: 640, height: 360 });
  assert.deepEqual(svgSizeFromHead('<svg width="320" viewBox="0 0 640 360">'), { width: 320, height: 180 });
  assert.equal(svgSizeFromHead('<svg width="100%">'), null);
});

test("remote probe asks for the first bytes only and stops reading", async () => {
  const seen = [];
  let pulled = 0;
  const fetcher = async (url, init) => {
    seen.push([url, init.headers.range, init.redirect]);
    if (url.endsWith("/old.png")) return new Response(null, { status: 301, headers: { location: "/new.png" } });
    // A server that ignores Range and would send 10 MB.
    const head = pngHeader(1600, 900);
    const stream = new ReadableStream({
      pull(controller) {
        pulled += 1;
        controller.enqueue(pulled === 1 ? head : new Uint8Array(64 * 1024));
        if (pulled > 160) controller.close();
      },
    });
    return new Response(stream, { status: 200 });
  };
  assert.deepEqual(await probeRemoteSize("https://cdn.example.com/old.png", { fetch: fetcher, checkHost: noDns }), { width: 1600, height: 900 });
  assert.deepEqual(seen.map(([url]) => url), ["https://cdn.example.com/old.png", "https://cdn.example.com/new.png"]);
  assert.equal(seen[0][1], "bytes=0-65535");
  assert.equal(seen[0][2], "manual");
  assert.ok(pulled < 5, `read ${pulled} chunks; it should stop after the head`);
});

test("remote probe refuses private hosts and reports HTTP errors", async () => {
  const fetcher = async () => new Response("nope", { status: 404 });
  await assert.rejects(probeRemoteSize("http://127.0.0.1/a.png", { fetch: fetcher, checkHost: noDns }), /public/u);
  await assert.rejects(probeRemoteSize("https://cdn.example.com/a.png", { fetch: fetcher, checkHost: noDns }), /HTTP 404/u);
});

test("image-sizes.json: new images are probed once, failures warn and never throw", async () => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "garden-images-"));
  try {
    fs.mkdirSync(path.join(site, "content", "posts"), { recursive: true });
    fs.writeFileSync(path.join(site, "content", "posts", "a.md"), "---\ntitle: A\n---\n\n![x](https://cdn.example.com/a.png)\n\n![y](https://cdn.example.com/broken.png)\n\n![z](./local.png)\n");
    let calls = 0;
    const fetcher = async (url) => {
      calls += 1;
      return url.includes("broken") ? new Response("", { status: 500 }) : new Response(pngHeader(1200, 800));
    };
    const lines = [];
    const first = await refreshImageSizes({ siteRoot: site, fetch: fetcher, checkHost: noDns, log: (line) => lines.push(line) });
    assert.deepEqual(first.images, { "https://cdn.example.com/a.png": { width: 1200, height: 800 } });
    assert.equal(first.failed, 1);
    assert.ok(lines.some((line) => line.includes("broken.png") && line.includes("警告")));
    assert.deepEqual(readImageCache(site).images, first.images);
    calls = 0;
    await refreshImageSizes({ siteRoot: site, fetch: fetcher, checkHost: noDns });
    assert.equal(calls, 1, "only the image that failed is tried again");
    // Images no longer in any post leave the cache.
    fs.writeFileSync(path.join(site, "content", "posts", "a.md"), "---\ntitle: A\n---\n\n正文。\n");
    await refreshImageSizes({ siteRoot: site, fetch: fetcher, checkHost: noDns });
    assert.deepEqual(readImageCache(site).images, {});
    // A network that throws still lets the build go on.
    fs.writeFileSync(path.join(site, "content", "posts", "a.md"), "---\ntitle: A\n---\n\n![x](https://cdn.example.com/n.png)\n");
    const result = await refreshImageSizes({ siteRoot: site, fetch: async () => { throw new Error("offline"); }, checkHost: noDns });
    assert.equal(result.failed, 1);
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

test("build-time figure layout matches what the browser computes in a 740px column", () => {
  for (const naturalWidth of [600, 714, 740, 1400, 1480, 1484, 1500, 1600, 2000, 2080, 2400, 4000]) {
    const imageClient = Math.min(naturalWidth, 714);
    const client = figureBreakout({ viewport: 1440, articleLeft: 350, articleRight: 1090, figureClient: 740, imageClient, naturalWidth });
    const width = figureImageWidth({ naturalWidth, widened: client.left > 0 }) || naturalWidth;
    assert.deepEqual(figureLayout({ naturalWidth }), { side: client.left, width }, `naturalWidth ${naturalWidth}`);
  }
  assert.deepEqual(figureLayout({ naturalWidth: 0 }), { side: 0, width: 0 });
});

test("image attributes: width, height and the box width before the file loads", () => {
  assert.deepEqual(imageDimensions({}, null), {});
  assert.deepEqual(imageDimensions({}, { width: 1200, height: 600 }), {
    width: 1200, height: 600, "data-nw": 1200, "data-bw": 1200, style: { width: "1200px" },
  });
  // A 2x screenshot that widens shows at half its pixels.
  assert.equal(imageDimensions({}, { width: 2400, height: 1200 }).style.width, "1200px");
  // An author's width wins and only gains the matching height.
  assert.deepEqual(imageDimensions({ width: "300" }, { width: 1200, height: 600 }), { width: 300, height: 150, "data-nw": 1200, "data-aw": 300 });
  // Both written by the author: kept exactly, even if the ratio differs from the file.
  assert.deepEqual(imageDimensions({ width: "300", height: "100" }, { width: 1200, height: 600 }), { width: 300, height: 100, "data-nw": 1200, "data-aw": 300 });
  // Only a height written: kept, the width follows the ratio.
  assert.deepEqual(imageDimensions({ height: "200" }, { width: 1200, height: 600 }), { width: 400, height: 200, "data-nw": 1200, "data-aw": 400 });
  const sizes = { "https://cdn.example.com/图 1.png": { width: 10, height: 5 } };
  assert.deepEqual(lookupImageSize(sizes, "https://cdn.example.com/%E5%9B%BE%201.png"), { width: 10, height: 5 });
  assert.equal(lookupImageSize(sizes, "https://cdn.example.com/other.png"), null);
});

test("figures with a known wide image get the breakout at build time", () => {
  const sizes = { "https://cdn.example.com/wide.png": { width: 2400, height: 1200 }, "https://cdn.example.com/small.png": { width: 800, height: 400 } };
  const tree = unified().use(remarkParse).use(remarkA2, { imageSize: (src) => sizes[src] ?? null })
    .runSync(unified().use(remarkParse).parse("![](https://cdn.example.com/wide.png)\n\n![](https://cdn.example.com/small.png)\n\n![](https://cdn.example.com/unknown.png)\n"));
  const figures = tree.children.map((node) => node.data.hProperties);
  assert.deepEqual(figures[0], { className: ["fig", "fig-wide"], style: "--wl:150px;--wr:150px" });
  assert.deepEqual(figures[1], { className: ["fig"] });
  assert.deepEqual(figures[2], { className: ["fig"] }, "unknown size: no class, the browser decides after load as before");
});

test("the build-time breakout only applies where the column is full width, and yields to the script", () => {
  const css = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.match(css, /@media \(min-width: 1348px\) \{\s*\.post-reading-page \.markdown-body \.fig-wide \{\s*margin-left: calc\(-1 \* var\(--wl, 0px\)\);/u);
  const measure = fs.readFileSync(new URL("../app/components/ArticleMeasure.tsx", import.meta.url), "utf8");
  assert.match(measure, /figure\.classList\.remove\("fig-wide"\)/u);
  assert.match(measure, /image\.naturalWidth \|\| known/u);
  const base = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.match(base, /\.markdown-body img,\s*\.markdown-image-trigger img \{[^}]*height: auto;/u);
});

test("a TOC that slides aside past the right edge does not widen the page", () => {
  const css = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  // clip, not hidden: hidden would make #main-content a scroll container and break the sticky TOC.
  // Also while it slides back, after data-toc-yield is gone.
  assert.match(css, /@media \(min-width: 1200px\) \{[^@]*#main-content:has\(\.toc\) \{\s*overflow-x: clip;\s*\}/u);
  assert.match(css, /html\[data-toc-yield\] \.toc \{\s*transform: translateX\(var\(--tocshift, 0px\)\);/u, "the slide itself is unchanged");
});
