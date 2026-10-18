import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { columnRedirects, internalLinkResolver, readRedirects, routeKey } from "../ui/garden/internal-links.mjs";
import * as fromScript from "../scripts/redirects.mjs";

// A neutral fixture that mirrors an old-style dated address moving to its new home.
const config = {
  redirects: {
    "/2025/11/17/go/go-gc/": "/blog/go/go-gc-tri-color-marking/",
    "/2024/01/20/go/go-gpm/": "/blog/go/go-gpm/",
    "/wiki/rust/04-action/rust-action-httpie.html": "/blog/rust-action-httpie/",
    "/old/chain/": "/2024/01/20/go/go-gpm/",
    "/loop/a/": "/loop/b/",
    "/loop/b/": "/loop/a/",
    "/moved-away/": "https://elsewhere.example/post/",
    "/gone/": "/blog/not-built/",
    "/with-anchor/": "/blog/go/go-gpm/#scheduler",
  },
};
const routes = ["/", "/blog", "/columns", "/tags", "/blog/go/go-gc-tri-color-marking", "/blog/go/go-gpm", "/blog/rust-action-httpie", "/columns/rust-action/rust-action-spinlock"];
const redirects = [...readRedirects(config), ...columnRedirects({ columns: [{ slug: "rust-action" }] })];
const resolve = internalLinkResolver({ redirects, routes });

test("a link to go-gc's old dated address points straight at the new page", () => {
  assert.equal(resolve("/2025/11/17/go/go-gc/"), "/blog/go/go-gc-tri-color-marking/");
  // Written without the trailing slash, or percent-encoded: same page.
  assert.equal(resolve("/2025/11/17/go/go-gc"), "/blog/go/go-gc-tri-color-marking/");
  assert.equal(resolve("/2025/11/17/go/%67o-gc/"), "/blog/go/go-gc-tri-color-marking/");
});

test("the link's own #hash and ?query are kept", () => {
  assert.equal(resolve("/2025/11/17/go/go-gc/#三色标记"), "/blog/go/go-gc-tri-color-marking/#三色标记");
  assert.equal(resolve("/2025/11/17/go/go-gc/?from=rss#gc-roots"), "/blog/go/go-gc-tri-color-marking/?from=rss#gc-roots");
  assert.equal(resolve("/2025/11/17/go/go-gc?x=1"), "/blog/go/go-gc-tri-color-marking/?x=1");
  // A target's own #anchor is used when the link has none, and loses to the link's.
  assert.equal(resolve("/with-anchor/"), "/blog/go/go-gpm/#scheduler");
  assert.equal(resolve("/with-anchor/#mine"), "/blog/go/go-gpm/#mine");
});

test("old .html addresses, chains and column addresses resolve too", () => {
  assert.equal(resolve("/wiki/rust/04-action/rust-action-httpie.html#install"), "/blog/rust-action-httpie/#install");
  assert.equal(resolve("/old/chain/"), "/blog/go/go-gpm/");
  assert.equal(resolve("/columns/rust-action/"), "/columns/#rust-action");
  assert.equal(resolve("/columns/rust-action"), "/columns/#rust-action");
});

test("links that cannot be resolved stay plain anchors", () => {
  assert.equal(resolve("/loop/a/"), null, "redirect loop");
  assert.equal(resolve("/moved-away/"), null, "external target");
  assert.equal(resolve("/gone/"), null, "target page not built");
  assert.equal(resolve("/blog/never-written/"), null, "no such page");
  assert.equal(resolve("/posts.xml"), null, "file");
  for (const href of ["#top", "https://elsewhere.example/", "//cdn.example/x", "mailto:a@b.c", "notes/x", "", undefined]) assert.equal(resolve(href), null, String(href));
});

test("pages that never moved go through unchanged, as written", () => {
  assert.equal(resolve("/blog/go/go-gpm/"), "/blog/go/go-gpm/");
  assert.equal(resolve("/blog/go/go-gpm#scheduler"), "/blog/go/go-gpm#scheduler");
  assert.equal(resolve("/blog/?t=Go"), "/blog/?t=Go");
  assert.equal(resolve("/"), "/");
  assert.equal(routeKey("/blog/"), "/blog");
  assert.equal(routeKey("/"), "/");
});

test("with a base path, Link gets the route without it", () => {
  const based = internalLinkResolver({ redirects, routes, basePath: "/garden/" });
  assert.equal(based("/garden/2025/11/17/go/go-gc/#x"), "/blog/go/go-gc-tri-color-marking/#x");
  assert.equal(based("/garden/blog/go/go-gpm/"), "/blog/go/go-gpm/");
  assert.equal(based("/blog/go/go-gpm/"), null, "outside the base path");
});

test("the build script and the renderer read redirects with one parser", () => {
  assert.equal(fromScript.readRedirects, readRedirects);
  assert.equal(fromScript.columnRedirects, columnRedirects);
  const source = fs.readFileSync(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
  assert.match(source, /internalLinkResolver\(\{\s*redirects: \[\s*\.\.\.readRedirects\(siteConfig\),\s*\.\.\.columnRedirects\(/u);
  assert.match(source, /\.\.\.posts\.map\(postHref\),\s*\.\.\.columns\.map\(columnHref\),/u);
});
