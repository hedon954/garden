import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { SITE_NAV, isCurrentNav } from "../ui/garden/site-nav.mjs";

test("header nav links are written with the slash and shaped by siteHref for the build", () => {
  assert.deepEqual(SITE_NAV.map((item) => item.href), ["/blog/", "/thoughts/", "/columns/", "/tags/", "/about/"]);
  for (const { href } of SITE_NAV) assert.match(href, /^\/[a-z]+\/$/u);
  const header = fs.readFileSync(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8");
  assert.match(header, /^const nav = SITE_NAV\.map\(\(item\) => \(\{ \.\.\.item, href: siteHref\(item\.href\) \}\)\);$/mu, "the slash follows trailingSlash");
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
  assert.deepEqual(active("/"), []);
  assert.deepEqual(active(""), []);
  assert.deepEqual(active("/blogroll"), [], "a longer name is not the same section");
  assert.deepEqual(active("/tagsx/"), []);
});
