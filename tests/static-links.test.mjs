import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findMisshapenLinks, findSlashlessLinks, trailingSlashEnabled, withTrailingSlash } from "../ui/garden/site-href.mjs";

test("site addresses end with a slash, with ?query and #hash after it", () => {
  assert.equal(withTrailingSlash("/blog"), "/blog/");
  assert.equal(withTrailingSlash("/blog/"), "/blog/");
  assert.equal(withTrailingSlash("/"), "/");
  assert.equal(withTrailingSlash("/blog/go/go-lock#mutex"), "/blog/go/go-lock/#mutex");
  assert.equal(withTrailingSlash("/blog?t=Go&t=Rust"), "/blog/?t=Go&t=Rust");
  assert.equal(withTrailingSlash("/blog?t=Go#list"), "/blog/?t=Go#list");
  assert.equal(withTrailingSlash("/columns/#rust-action"), "/columns/#rust-action");
  // Files, hashes and other sites are left alone.
  assert.equal(withTrailingSlash("/rss.xml"), "/rss.xml");
  assert.equal(withTrailingSlash("/media/posts/a/guide.pdf#page=2"), "/media/posts/a/guide.pdf#page=2");
  assert.equal(withTrailingSlash("#top"), "#top");
  assert.equal(withTrailingSlash("https://example.org/a"), "https://example.org/a");
  assert.equal(withTrailingSlash("//cdn.example.org/a"), "//cdn.example.org/a");
});

test("without trailingSlash the slash goes, with ?query and #hash after the path", () => {
  assert.equal(withTrailingSlash("/blog/", false), "/blog");
  assert.equal(withTrailingSlash("/blog", false), "/blog");
  assert.equal(withTrailingSlash("/", false), "/");
  assert.equal(withTrailingSlash("/blog/go/go-lock/#mutex", false), "/blog/go/go-lock#mutex");
  assert.equal(withTrailingSlash("/blog/?t=Go&t=Rust", false), "/blog?t=Go&t=Rust");
  assert.equal(withTrailingSlash("/columns/#rust-action", false), "/columns#rust-action");
  assert.equal(withTrailingSlash("/rss.xml", false), "/rss.xml");
  assert.equal(withTrailingSlash("#top", false), "#top");
  assert.equal(withTrailingSlash("https://example.org/a/", false), "https://example.org/a/");
});

test("trailingSlash: always in a static export, on a server only with TRAILING_SLASH=1", () => {
  assert.equal(trailingSlashEnabled({ STATIC_EXPORT: "1" }), true);
  assert.equal(trailingSlashEnabled({ STATIC_EXPORT: "1", TRAILING_SLASH: "0" }), true);
  assert.equal(trailingSlashEnabled({}), false);
  assert.equal(trailingSlashEnabled({ TRAILING_SLASH: "1" }), true);
  const config = fs.readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /trailingSlash: trailingSlashEnabled\(process\.env\)/u, "Next and the links read the same switch");
  const build = fs.readFileSync(new URL("../scripts/build-content.mjs", import.meta.url), "utf8");
  assert.match(build, /trailingSlash: trailingSlashEnabled\(process\.env\)/u);
});

test("findMisshapenLinks without trailingSlash reports page links that carry the slash", () => {
  const html = '<a href="/">home</a><a href="/blog/">x</a><a href="/blog?t=Go">ok</a><a href="/columns/#a">y</a><a href="/media/a.pdf">f</a><a href="/about">ok</a>';
  assert.deepEqual(findMisshapenLinks(html, { trailing: false }), ["/blog/", "/columns/#a"]);
});

test("findSlashlessLinks reports internal page links without the slash", () => {
  const html = [
    '<a href="/blog/">ok</a>',
    '<a class="x" href="/about">about</a>',
    "<a href='/columns/book-note/note/note-obsidian'>col</a>",
    '<a href="/blog?t=Go&amp;t=Rust">tags</a>',
    '<a href="/rss.xml">rss</a>',
    '<a href="#sec">hash</a>',
    '<a href="https://example.org/x">ext</a>',
    '<link rel="canonical" href="/blog/x">',
    '<a href="/blog/x/#h">ok</a>',
  ].join("");
  assert.deepEqual(findSlashlessLinks(html), ["/about", "/columns/book-note/note/note-obsidian", "/blog?t=Go&t=Rust"]);
});

const outDir = new URL("../dist/client/", import.meta.url).pathname;
const exported = fs.existsSync(path.join(outDir, "index.html"));

// Runs on a static export (STATIC_EXPORT=1 npm run build, as CI's verify job does after npm test).
test("every internal link in the static export ends with a slash", { skip: exported ? false : "needs a static export in dist/client" }, () => {
  // media/ holds files posts offer (an HTML download, a Markdown preview page), not pages of the site.
  const pages = fs.readdirSync(outDir, { recursive: true }).filter((name) => name.endsWith(".html") && !name.split(path.sep).includes("media"));
  assert.ok(pages.length > 5, `only ${pages.length} pages`);
  const offenders = [];
  for (const page of pages) {
    for (const href of findSlashlessLinks(fs.readFileSync(path.join(outDir, page), "utf8"))) offenders.push(`${page}: ${href}`);
  }
  assert.deepEqual(offenders.slice(0, 30), [], `${offenders.length} internal links without the trailing slash`);
});
