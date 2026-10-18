import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { rehypeHeadingAnchors } from "../ui/garden/heading-anchors.mjs";
import { findInvalidNesting } from "../ui/garden/html-nesting.mjs";

// Markup the HTML parser repairs builds a different tree from what React renders: hydration fails (React #418).

test("findInvalidNesting reports what the parser would repair, and nothing else", () => {
  const problems = (html) => findInvalidNesting(html).map((item) => item.problem);
  assert.deepEqual(problems('<h3><a href="#x">标题 <a href="https://e.org">外链</a></a></h3>'), ["<a> inside <a>"]);
  assert.deepEqual(problems("<p>一段<div>块</div></p>"), ["<div> inside <p>"]);
  assert.deepEqual(problems("<button>a<button>b</button></button>"), ["<button> inside <button>"]);
  assert.deepEqual(problems('<p><a href="/a">1</a> <a href="/b">2</a><img src="x.png"><br/></p><ul><li><p>x</p></li></ul>'), []);
  // Raw text, comments and foreign content are not page markup.
  assert.deepEqual(problems('<script>"<a><a>"</script><style>a{}</style><!-- <a><a> --><svg><a><a></a></a></svg>'), []);
});

function headingHtml(markdown) {
  return String(unified().use(remarkParse).use(remarkRehype).use(rehypeSlug).use(rehypeHeadingAnchors).use(rehypeStringify).processSync(markdown));
}

test("heading self-links never nest: text around a link in a heading gets its own anchor", () => {
  assert.equal(headingHtml("## 普通标题"), '<h2 id="普通标题"><a href="#普通标题" class="h-anchor">普通标题</a></h2>');
  const withLink = headingHtml("### 标题里的 [Typora](https://typora.io/) 外链");
  assert.equal(
    withLink,
    '<h3 id="标题里的-typora-外链"><a href="#标题里的-typora-外链" class="h-anchor">标题里的 </a><a href="https://typora.io/">Typora</a><a href="#标题里的-typora-外链" class="h-anchor"> 外链</a></h3>',
  );
  const nested = headingHtml("## **粗体 [链接](https://e.org)** 和 `code`");
  assert.deepEqual(findInvalidNesting(nested), []);
  assert.match(nested, /<strong><a href="#[^"]+" class="h-anchor">粗体 <\/a><a href="https:\/\/e\.org">链接<\/a><\/strong><a href="#[^"]+" class="h-anchor"> 和 <code>code<\/code><\/a>/u);
  assert.equal(headingHtml("## [整个标题是链接](https://e.org)"), '<h2 id="整个标题是链接"><a href="https://e.org">整个标题是链接</a></h2>');
  assert.equal(headingHtml("##### 五级标题"), "<h5>五级标题</h5>".replace("<h5>", '<h5 id="五级标题">'));
});

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-nesting`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const serverBuilt = fs.existsSync(new URL("../dist/server/index.js", import.meta.url));

test("no page of the server build has markup the parser would repair", { skip: serverBuilt ? false : "needs npm run build" }, async () => {
  const sitemap = fs.readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  const pages = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(([, loc]) => new URL(loc).pathname)), "/tags"];
  assert.ok(pages.length > 15, `only ${pages.length} pages`);
  assert.ok(pages.some((page) => page.startsWith("/blog/markdown-lab")), "markdown-lab has a heading with a link in it");
  const found = [];
  for (const pathname of pages) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    for (const item of findInvalidNesting(await response.text())) found.push(`${pathname}: ${item.problem} … ${item.context}`);
  }
  assert.deepEqual(found, []);
});

const outDir = new URL("../dist/client/", import.meta.url).pathname;
const exported = fs.existsSync(path.join(outDir, "index.html"));

// CI runs this after its static export (STATIC_EXPORT=1 npm run build).
test("no page of the static export has markup the parser would repair", { skip: exported ? false : "needs a static export in dist/client" }, () => {
  const pages = fs.readdirSync(outDir, { recursive: true }).filter((name) => name.endsWith(".html") && !name.split(path.sep).includes("media"));
  assert.ok(pages.length > 5);
  const found = [];
  for (const page of pages) {
    for (const item of findInvalidNesting(fs.readFileSync(path.join(outDir, page), "utf8"))) found.push(`${page}: ${item.problem} … ${item.context}`);
  }
  assert.deepEqual(found, []);
});
