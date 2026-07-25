import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: pathname === "/rss.xml" ? "application/rss+xml" : "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished blog home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Hedon Log · 写作、构建与保持好奇 · Hedon Log<\/title>/i);
  assert.match(html, /把复杂的事/);
  assert.match(html, /置顶博文/);
  assert.match(html, /最近随想/);
  assert.match(html, /主题专栏/);
  assert.doesNotMatch(html, /section-index|pinned-list/);
  assert.match(html, /section-heading accent-heading/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("starter preview is removed from source and dependencies", async () => {
  const [page, layout, packageJson, siteHeader, contentModule] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/content.ts", import.meta.url), "utf8"),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview", templateRoot)));
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(siteHeader, /includeMatches:\s*true/);
  assert.match(siteHeader, /className="search-match"/);
  assert.match(contentModule, /toSearchableText/);
});

test("publishes a valid RSS feed", async () => {
  const response = await render("/rss.xml");
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/rss\+xml\b/i,
  );
  const xml = await response.text();
  assert.match(xml, /^<\?xml version="1\.0"/);
  assert.match(xml, /<title>Hedon Log<\/title>/);
  assert.match(xml, /<title>注意力也是一种界面<\/title>/);
});

test("renders complex Markdown, article covers, and mixed thought media", async () => {
  const [articleResponse, thoughtsResponse, archiveResponse] = await Promise.all([
    render("/blog/markdown-lab"),
    render("/thoughts"),
    render("/blog"),
  ]);

  assert.equal(articleResponse.status, 200);
  const article = await articleResponse.text();
  assert.match(article, /Markdown 复杂语法实验场/);
  assert.match(article, /class="katex-display"/);
  assert.match(article, /language-mermaid/);
  assert.match(article, /data-mermaid-theme="neutral"/);
  assert.match(article, /mermaid-view-switcher/);
  assert.match(article, />渲染<\/button>/);
  assert.match(article, />Code<\/button>/);
  assert.doesNotMatch(article, /mermaid-theme-picker|森林/);
  assert.match(article, /language-typescript/);
  assert.match(article, /language-python/);
  assert.match(article, /language-rust/);
  assert.match(article, /language-go/);
  assert.match(article, /language-sql/);
  assert.match(article, /language-swift/);
  assert.match(article, /<details>/);
  assert.match(article, /class="article-cover"/);
  assert.ok(
    article.indexOf('class="article-cover"') <
      article.indexOf('class="article-header"'),
    "article cover should render before the title header",
  );

  assert.equal(thoughtsResponse.status, 200);
  const thoughts = await thoughtsResponse.text();
  assert.match(thoughts, /混合记录 · 6 个附件/);
  assert.match(thoughts, /thought-gallery-3/);
  assert.match(thoughts, /<audio/);
  assert.match(thoughts, /<video/);
  assert.match(thoughts, /class="link-embed"/);

  assert.equal(archiveResponse.status, 200);
  const archive = await archiveResponse.text();
  assert.match(archive, /class="archive-cover"/);
  assert.match(archive, /class="archive-copy"/);
  assert.match(archive, /class="archive-meta"/);
});
