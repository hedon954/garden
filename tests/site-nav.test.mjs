import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { SITE_NAV, isCurrentNav, siteNav } from "../ui/garden/site-nav.mjs";

test("header nav links are written with the slash and shaped by siteHref for the build", () => {
  assert.deepEqual(SITE_NAV.map((item) => item.href), ["/blog/", "/thoughts/", "/columns/", "/tags/", "/about/"]);
  for (const { href } of SITE_NAV) assert.match(href, /^\/[a-z]+\/$/u);
  const header = fs.readFileSync(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8");
  assert.match(header, /const nav = siteNav\(\{ shelf \}\)\.map\(\(item\) => \(\{ \.\.\.item, key: item\.href, href: siteHref\(item\.href\) \}\)\);/u, "the slash follows trailingSlash");
  assert.match(header, /const current = \(href: string\) => isCurrentNav\(pathname, href\);/u);
  assert.doesNotMatch(header, /href: "\/(blog|thoughts|columns|tags|about)"/u);
});

test("the current section is found with or without the trailing slash", () => {
  const active = (pathname) => SITE_NAV.filter((item) => isCurrentNav(pathname, item.href)).map((item) => item.label);
  assert.deepEqual(active("/blog"), ["文章"]);
  assert.deepEqual(active("/blog/"), ["文章"]);
  assert.deepEqual(active("/blog/go/go-lock/"), ["文章"]);
  assert.deepEqual(active("/a2/demo"), ["文章"]);
  assert.deepEqual(active("/columns"), ["专栏"]);
  assert.deepEqual(active("/columns/rust-action/rust-action-spinlock"), ["专栏"]);
  assert.deepEqual(active("/thoughts/"), ["随想"]);
  assert.deepEqual(active("/thoughts/rainy-night"), ["随想"]);
  assert.deepEqual(active("/tags"), ["标签"]);
  assert.deepEqual(active("/about/"), ["关于"]);
  assert.equal(isCurrentNav("/bookshelf", "/bookshelf/"), true);
  assert.equal(isCurrentNav("/bookshelf/", "/bookshelf/"), true);
  assert.equal(isCurrentNav("/blog/note/note-obsidian", "/bookshelf/"), false);
  assert.deepEqual(active("/"), []);
  assert.deepEqual(active(""), []);
  assert.deepEqual(active("/blogroll"), [], "a longer name is not the same section");
  assert.deepEqual(active("/tagsx/"), []);
});

test("书架 is a nav item only when the site has a shelf", () => {
  assert.deepEqual(siteNav().map((item) => item.href), SITE_NAV.map((item) => item.href));
  assert.deepEqual(
    siteNav({ shelf: true }).map((item) => item.label),
    ["文章", "随想", "专栏", "标签", "书架", "关于"],
  );
  assert.equal(siteNav({ shelf: true }).find((item) => item.href === "/bookshelf/")?.href, "/bookshelf/");
});
