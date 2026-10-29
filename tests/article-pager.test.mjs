import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { adjacentByDate, adjacentInOrder } from "../ui/garden/adjacent.mjs";

const posts = [
  { path: "c", date: "2026-03-01" },
  { path: "a", date: "2026-01-01" },
  { path: "b", date: "2026-02-01" },
];
const is = (path) => (item) => item.path === path;

test("posts: 上一篇 is the earlier post, 下一篇 the later one", () => {
  assert.deepEqual(adjacentByDate(posts, is("b")), { prev: posts[1], next: posts[0] });
});

test("the first and the last post show only one side", () => {
  assert.deepEqual(adjacentByDate(posts, is("a")), { prev: null, next: posts[2] });
  assert.deepEqual(adjacentByDate(posts, is("c")), { prev: posts[2], next: null });
});

test("an unknown entry has no neighbours", () => {
  assert.deepEqual(adjacentByDate(posts, is("x")), { prev: null, next: null });
});

test("a column follows its own order, not the dates", () => {
  const series = [{ path: "late", date: "2026-05-01" }, { path: "early", date: "2026-01-01" }];
  assert.deepEqual(adjacentInOrder(series, is("early")), { prev: series[0], next: null });
});

test("article pages put the pager between the Webmention section and the comments", () => {
  const view = fs.readFileSync(new URL("../app/components/PostReadingView.tsx", import.meta.url), "utf8");
  const webmentions = view.indexOf("<Webmentions");
  const pager = view.indexOf("<ArticlePager");
  const comments = view.indexOf("<Comments");
  assert.ok(webmentions > 0 && webmentions < pager && pager < comments, "PostReadingView");
  for (const file of ["app/blog/[...path]/page.tsx", "app/columns/[column]/[...path]/page.tsx"]) {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /<PostReadingView/, file);
  }
});

test("column pages no longer have their own next-only link", () => {
  const source = fs.readFileSync(new URL("../app/columns/[column]/[...path]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /next-entry/u);
});

test("随想 pages have no pager: they read as a feed", () => {
  const source = fs.readFileSync(new URL("../app/thoughts/[slug]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /ArticlePager/u);
});

test("the article pager has no divider above it", () => {
  const css = fs.readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.match(css, /\.gdoc-pager\.article-pager \{\s*border-top: 0;/u);
});
