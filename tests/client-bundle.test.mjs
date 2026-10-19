import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { clientAssetFiles } from "./client-assets.mjs";
import { buildSearchIndex, EXCERPT_LENGTH, searchableText } from "../ui/garden/search-index.mjs";

const root = new URL("../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");

function files(dir, pattern) {
  const full = new URL(dir, root);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full, { recursive: true }).filter((name) => pattern.test(name)).map((name) => path.join(full.pathname, name));
}

test("client JS never carries post bodies", () => {
  const scripts = clientAssetFiles(/\.js$/u);
  assert.ok(scripts.length, "run the build first");
  // Sentences from the middle of example posts: only the server and the static HTML may have them.
  const bodies = ["浇到盆底出水，然后把托盘倒掉", "罗勒要见光，薄荷更耐阴", "这篇文章不是功能清单"];
  for (const file of scripts) {
    const source = fs.readFileSync(file, "utf8");
    for (const sentence of bodies) assert.ok(!source.includes(sentence), `${path.basename(file)} contains post text: ${sentence}`);
  }
  const biggest = Math.max(...scripts.map((file) => fs.statSync(file).size));
  assert.ok(biggest < 1_000_000, `largest client chunk is ${biggest} bytes`);
});

test("client components do not import the content module", () => {
  const clientFiles = files("app/", /\.tsx?$/u).filter((file) => /^["']use client["']/mu.test(fs.readFileSync(file, "utf8")));
  for (const file of clientFiles) {
    const source = fs.readFileSync(file, "utf8");
    const offending = source.match(/^import (?!type\b)[^;]*from ["'](\.\.\/lib\/content|\.\.\/\.\.\/lib\/content|@garden\/generated-content|\.\/MarkdownArticle)["']/mu);
    assert.equal(offending, null, `${path.relative(root.pathname, file)} imports ${offending?.[1]}`);
  }
});

test("search loads a small index on demand", () => {
  const header = read("app/components/SiteHeader.tsx");
  assert.doesNotMatch(header, /lib\/content/u);
  assert.match(header, /fetch\(searchIndexUrl\)/u);
  assert.match(header, /import\("fuse\.js"\)/u);
  assert.doesNotMatch(header, /^import Fuse\b/mu);

  const index = JSON.parse(read("public/search-index.json"));
  assert.ok(index.length > 0);
  for (const record of index) {
    assert.deepEqual(Object.keys(record).sort(), ["content", "date", "description", "path", "section", "tags", "title"]);
    assert.ok(Array.from(record.content).length <= EXCERPT_LENGTH + 1);
  }
  const raw = JSON.stringify(index);
  assert.ok(!raw.includes("浇到盆底出水，然后把托盘倒掉"), "the index holds excerpts, not bodies");
  assert.match(read(".garden/site-config.ts"), /export const searchIndexUrl = "\/search-index\.json\?v=[0-9a-f]{12}";/u);

  const sample = buildSearchIndex({
    posts: [{ title: "T", path: "a/b", date: "2026-01-01", tags: ["x"], content: `# H\n\n${"字".repeat(500)}` }],
    columns: [{ title: "C", path: "col/x", column: "col", columnTitle: "专栏一", date: "2026-01-02", content: "short" }],
    thoughts: [{ title: "想", slug: "s", date: "2026-01-03", content: "一条随想" }],
  });
  // A post in no column has no section; a column page that is not a post keeps its column URL.
  assert.deepEqual(sample.map((record) => [record.section, record.path]), [["", "/blog/a/b"], ["专栏一", "/columns/col/x"], ["随想", "/thoughts/s"]]);
  assert.equal(Array.from(sample[0].content).length, EXCERPT_LENGTH + 1);
  assert.equal(sample[2].description, "一条随想");
  assert.equal(searchableText("**粗** [链接](https://a.dev) `x`"), "粗 链接 x");
});

test("/blog gets its list as props, not from the content module", () => {
  const archive = read("app/components/BlogArchive.tsx");
  assert.match(archive, /import type \{ ArchivePost, ArchiveSeries \} from "\.\.\/lib\/archive";/u);
  const page = read("app/blog/page.tsx");
  assert.match(page, /<BlogArchive posts=\{list\} series=\{series\} \/>/u);
});

test("client JS has no Markdown parser and no previewed file text", () => {
  const scripts = clientAssetFiles(/\.js$/u);
  assert.ok(scripts.length, "run the build first");
  for (const file of scripts) {
    const source = fs.readFileSync(file, "utf8");
    // A sentence from content/posts/windowsill-herbs-kit/watering-log.md.
    assert.ok(!source.includes("土面下两指还湿就不浇"), `${path.basename(file)} carries the previewed Markdown`);
  }
  const drawer = read("app/components/garden/FilePreview.tsx");
  assert.match(drawer, /^"use client";/u);
  assert.doesNotMatch(drawer, /react-markdown|marked|remark|rehype|MarkdownArticle/u);
});
