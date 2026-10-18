import assert from "node:assert/strict";
import test from "node:test";
import {
  filterByTags,
  selectedTags,
  tagCounts,
  tagFilterHref,
  tagOptions,
  tagSummary,
  toggleTag,
  visibleTagOptions,
} from "../app/lib/tag-filter.ts";

const posts = [
  { path: "a", tags: ["Go", "GC", "运行时"] },
  { path: "b", tags: ["Go", "GC"] },
  { path: "c", tags: ["Go", "并发"] },
  { path: "d", tags: ["Rust", "并发"] },
  { path: "e", tags: [] },
  { path: "f" },
];

test("counts tags once per post, most used first", () => {
  const counts = tagCounts([...posts, { tags: ["Go", "Go"] }]);
  assert.deepEqual(counts[0], ["Go", 4]);
  assert.deepEqual(Object.fromEntries(counts), { Go: 4, GC: 2, 并发: 2, 运行时: 1, Rust: 1 });
  assert.ok(counts.every((entry, index) => index === 0 || counts[index - 1][1] >= entry[1]));
});

test("selected tags come from the repeated param, trimmed and de-duplicated", () => {
  assert.deepEqual(selectedTags(["Go", " GC ", "Go", ""]), ["Go", "GC"]);
  assert.deepEqual(selectedTags([]), []);
});

test("several tags combine as an intersection", () => {
  assert.deepEqual(filterByTags(posts, []).map((post) => post.path), ["a", "b", "c", "d", "e", "f"]);
  assert.deepEqual(filterByTags(posts, ["Go"]).map((post) => post.path), ["a", "b", "c"]);
  assert.deepEqual(filterByTags(posts, ["Go", "GC"]).map((post) => post.path), ["a", "b"]);
  assert.deepEqual(filterByTags(posts, ["Go", "GC", "运行时"]).map((post) => post.path), ["a"]);
  assert.deepEqual(filterByTags(posts, ["Rust", "GC"]), []);
});

test("each option counts what would remain, and options that would empty the list are disabled", () => {
  const byTag = (selected) => Object.fromEntries(tagOptions(posts, selected).map((option) => [option.tag, option]));

  const none = byTag([]);
  assert.equal(none.Go.next, 3);
  assert.equal(none.Rust.next, 1);
  assert.ok(Object.values(none).every((option) => !option.disabled && !option.selected));

  const go = byTag(["Go"]);
  assert.equal(go.Go.selected, true);
  assert.equal(go.Go.next, 3);
  assert.equal(go.GC.next, 2);
  assert.equal(go["并发"].next, 1);
  assert.equal(go.Rust.next, 0);
  assert.equal(go.Rust.disabled, true);
  assert.equal(go.Go.disabled, false);

  const goGc = byTag(["Go", "GC"]);
  assert.equal(goGc["运行时"].next, 1);
  assert.equal(goGc["并发"].disabled, true);
});

test("a selection the posts cannot satisfy stays selected and removable", () => {
  const options = tagOptions(posts, ["Rust", "GC", "不存在"]);
  const selected = options.filter((option) => option.selected).map((option) => option.tag);
  assert.deepEqual(selected.sort(), ["GC", "Rust", "不存在"].sort());
  assert.ok(options.filter((option) => option.selected).every((option) => !option.disabled && option.next === 0));
  assert.ok(options.filter((option) => !option.selected).every((option) => option.disabled));
});

test("only the top tags show by default, but selected tags always show", () => {
  const many = Array.from({ length: 20 }, (_, index) => ({ tags: Array.from({ length: 20 - index }, (__, n) => `t${n}`) }));
  const options = tagOptions(many, ["t19"]);
  const collapsed = visibleTagOptions(options, false, 14);
  assert.equal(collapsed.shown.length, 15);
  assert.ok(collapsed.shown.some((option) => option.tag === "t19"));
  assert.equal(collapsed.hidden, 5);
  assert.deepEqual(visibleTagOptions(options, true, 14), { shown: options, hidden: 0 });
  assert.equal(visibleTagOptions(tagOptions(many, []), false, 14).shown.length, 14);
});

test("toggling, links and the summary line", () => {
  assert.deepEqual(toggleTag(["Go"], "GC"), ["Go", "GC"]);
  assert.deepEqual(toggleTag(["Go", "GC"], "Go"), ["GC"]);
  assert.equal(tagFilterHref([]), "/blog");
  assert.equal(tagFilterHref(["Prompt", "工程实践"]), `/blog?t=Prompt&t=${encodeURIComponent("工程实践")}`);
  assert.equal(new URL(tagFilterHref(["AI Agent"]), "http://x").searchParams.get("t"), "AI Agent");
  assert.equal(tagSummary(0, 9), "共 9 篇");
  assert.equal(tagSummary(2, 5), "2 个标签，共 5 篇");
});
