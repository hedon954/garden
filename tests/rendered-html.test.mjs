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
  assert.match(html, /<title>[^<]+<\/title>/i);
  assert.match(html, /把复杂的事/);
  assert.match(html, /置顶博文/);
  assert.match(html, /最近随想/);
  assert.match(html, /主题专栏/);
  assert.match(html, /rel="me(?: [^"]*)?"/);
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
  const xml = await readFile(new URL("../public/rss.xml", import.meta.url), "utf8");
  assert.match(xml, /^<\?xml version="1\.0"/);
  assert.match(xml, /<title>[^<]+<\/title>/);
  assert.match(xml, /<title>注意力也是一种界面<\/title>/);
  assert.match(xml, /<title>雨后的城市<\/title>/);
  assert.match(xml, /<content:encoded><!\[CDATA\[/);
  assert.match(xml, /xmlns:content="http:\/\/purl\.org\/rss\/1\.0\/modules\/content\/"/);

  const postsXml = await readFile(new URL("../public/posts.xml", import.meta.url), "utf8");
  assert.match(postsXml, /<title>注意力也是一种界面<\/title>/);
  assert.doesNotMatch(postsXml, /<title>雨后的城市<\/title>/);
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
  assert.match(article, />图表<\/button>/);
  assert.match(article, />Code<\/button>/);
  assert.doesNotMatch(article, /mermaid-theme-picker|森林/);
  assert.match(article, /language-typescript/);
  assert.match(article, /language-python/);
  assert.match(article, /language-rust/);
  assert.match(article, /language-go/);
  assert.match(article, /language-sql/);
  assert.match(article, /language-swift/);
  assert.match(article, /<details>/);
  assert.match(article, /class="article-hero article-cover"/);
  assert.match(article, /class="article-header article-summary-row"/);
  assert.match(article, /class="article-reading-layout"/);
  assert.match(article, /class="article-reading-column"/);
  assert.match(article, /约 <!-- -->[\d,]+<!-- --> 字/);
  assert.ok(
    article.indexOf('class="article-hero article-cover"') <
      article.indexOf('class="article-header article-summary-row"'),
    "article cover should render before the title header",
  );
  assert.ok(
    article.indexOf('class="article-header article-summary-row"') <
      article.indexOf('class="article-reading-layout"'),
    "article summary should be a distinct row above the body and table of contents",
  );

  assert.equal(thoughtsResponse.status, 200);
  const thoughts = await thoughtsResponse.text();
  assert.match(thoughts, /混合记录 · 6 个附件/);
  assert.match(thoughts, /thought-gallery-3/);
  assert.match(thoughts, /<audio/);
  assert.match(thoughts, /<video/);
  assert.match(thoughts, /class="link-embed u-bookmark-of"/);
  assert.match(thoughts, /href="\/thoughts\/rainy-night"/);

  assert.equal(archiveResponse.status, 200);
  const archive = await archiveResponse.text();
  assert.match(archive, /class="archive-cover"/);
  assert.match(archive, /class="archive-copy"/);
  assert.match(archive, /class="archive-meta"/);
  assert.match(archive, /href="\/blog\?topic=/);
});

test("publishes discovery routes, permanent thought pages, and real integration adapters", async () => {
  const [sitemapResponse, robotsResponse, thoughtResponse] = await Promise.all([
    render("/sitemap.xml"),
    render("/robots.txt"),
    render("/thoughts/rainy-night"),
  ]);

  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  assert.match(sitemap, /\/blog\/markdown-lab/);
  assert.match(sitemap, /\/thoughts\/rainy-night/);
  assert.match(sitemap, /\/columns\/building-in-public\/smallest-closed-loop/);

  assert.equal(robotsResponse.status, 200);
  const robots = await robotsResponse.text();
  assert.match(robots, /Sitemap: .*\/sitemap\.xml/);

  assert.equal(thoughtResponse.status, 200);
  const thought = await thoughtResponse.text();
  assert.match(thought, /class="thought-card h-entry"/);
  assert.match(thought, /rel="canonical"/);

  const [comments, giscus, webmentions, search, columns] = await Promise.all([
    readFile(new URL("../app/components/Comments.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/GiscusComments.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Webmentions.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/columns/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(giscus, /https:\/\/giscus\.app\/client\.js/);
  assert.doesNotMatch(comments, /localStorage/);
  assert.doesNotMatch(giscus, /localStorage/);
  assert.match(webmentions, /mentions\.jf2|endpoint/);
  assert.match(search, /ArrowDown/);
  assert.match(search, /previousFocusRef/);
  assert.doesNotMatch(columns, /columns\[0\]/);
});

test("keeps the admin studio protected and writes content through GitHub", async () => {
  const response = await render("/api/admin/thoughts");
  assert.equal(response.status, 401);

  const [adminPage, thoughtApi, distributionApi, githubContent, workflow] = await Promise.all([
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/thoughts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/distribution/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/github-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
  ]);

  assert.match(adminPage, /api\/auth\/github/);
  assert.match(adminPage, /AdminDashboard/);
  assert.match(thoughtApi, /createRepositoryThought/);
  assert.match(githubContent, /CONTENT_GITHUB_TOKEN/);
  assert.match(githubContent, /content\/thoughts/);
  assert.match(distributionApi, /X_USER_ACCESS_TOKEN/);
  assert.match(distributionApi, /CSDN_SYNC_WEBHOOK/);
  assert.match(workflow, /actions\/deploy-pages/);
  assert.match(workflow, /STATIC_EXPORT=1/);
});
