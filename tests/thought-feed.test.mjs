import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { DEFAULT_PAGE_SIZE, extraPages, pageCount, pageItems, pagePath, pageSizeOf } from "../ui/garden/paging.mjs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const items = Array.from({ length: 23 }, (_, index) => index + 1);

test("the feed is cut into pages of pageSize, the last page holds the rest", () => {
  assert.equal(pageCount(23, 10), 3);
  assert.deepEqual(pageItems(items, 1, 10), items.slice(0, 10));
  assert.deepEqual(pageItems(items, 3, 10), [21, 22, 23]);
  assert.deepEqual(pageItems(items, 4, 10), []);
  assert.deepEqual(extraPages(23, 10), [2, 3]);
  assert.deepEqual(extraPages(10, 10), [], "exactly one page: no extra files");
  assert.equal(pageCount(0, 10), 1);
});

test("page size falls back to the default when unset or invalid", () => {
  assert.equal(DEFAULT_PAGE_SIZE, 10);
  for (const value of [undefined, 0, -3, 2.5, "x"]) assert.equal(pageSizeOf(value), 10);
  assert.equal(pageSizeOf(4), 4);
});

test("page 1 is the list itself, later pages live under page/<n>/", () => {
  assert.equal(pagePath("/thoughts", 1), "/thoughts/");
  assert.equal(pagePath("/thoughts", 2), "/thoughts/page/2/");
});

test("without JavaScript the end of a page is a plain 下一页 link; the last page says so", () => {
  const more = read("app/components/FeedMore.tsx");
  assert.match(more, /<a\s+href=\{href\}\s+rel="next"\s+data-feed-next=""/u);
  assert.match(more, /IntersectionObserver/u);
  assert.match(more, /labels\.feedEnd/u);
  const feed = read("app/components/ThoughtFeed.tsx");
  assert.match(feed, /const next = page < total \? thoughtsPageHref\(page \+ 1\) : null;/u);
  const i18n = read("app/lib/i18n.ts");
  assert.match(i18n, /nextPage: "下一页"/u);
  assert.match(i18n, /nextPage: "Next page"/u);
});

test("paged lists stay out of the sitemap; each paged page declares its canonical", () => {
  const build = read("scripts/build-content.mjs");
  const sitemap = build.slice(build.indexOf("const sitemapEntries = ["), build.indexOf("].map(pageAddress)"));
  assert.ok(sitemap.includes("/thoughts/"));
  assert.doesNotMatch(sitemap, /page\//u);
  assert.match(read("app/thoughts/page/[n]/page.tsx"), /alternates: pageAlternates\(pagePath\("\/thoughts", page\)\)/u);
});

test("pageSize is documented as an optional site config key", () => {
  assert.match(read("templates/site/site.config.yaml"), /# pageSize: 10/u);
});
