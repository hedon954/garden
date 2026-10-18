import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { homeListDate } from "../app/lib/a2-meta.ts";

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
  assert.match(html, /记一些正在做的事/);
  assert.doesNotMatch(html, /class="sh-feature"[\s\S]{0,400}style="background:var\(--cover\)"/);
  assert.match(html, /<time class="num" dateTime="2026-10-16">2026 年 10 月 16 日<\/time>/);
  assert.match(html, new RegExp(`<time class="num" dateTime="2026-10-10">${homeListDate("2026-10-10")}</time>`));
  const rows = html.match(/<ol class="sh-rows"[\s\S]*?<\/ol>/)?.[0] ?? "";
  assert.doesNotMatch(rows, /2026-10-16|2026 年 10 月 16 日/);
  assert.equal(homeListDate("2026-09-22", new Date("2026-06-01T04:00:00Z")), "9 月 22 日");
  assert.equal(homeListDate("2025-09-22", new Date("2026-06-01T04:00:00Z")), "2025 年 9 月 22 日");
  assert.match(rows, new RegExp(`dateTime="2026-10-10">${homeListDate("2026-10-10")}`));
  const [shell, articleCss] = await Promise.all([
    readFile(new URL("../app/styles/shell.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8"),
  ]);
  assert.match(articleCss, /\.article-hero\.article-cover \{[^}]*border-radius: var\(--r-lg\)/);
  assert.doesNotMatch(articleCss, /article-hero\.article-cover \{\s*border-radius:\s*16px/);
  assert.match(shell, /\.sh-foot-links\{display:flex;align-items:center;gap:20px\}/);
  assert.match(shell, /\.sh-foot a\{display:inline-flex;align-items:center;gap:6px;min-height:44px/);
  assert.match(shell, /\.sh-foot-links a svg\{display:block;flex:none;width:16px;height:16px\}/);
  assert.match(shell, /\.sh-home-grid \.sh-row time\{min-width:6em;font-variant-numeric:tabular-nums\}/);
  const footer = html.match(/<footer class="sh-footer"[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.match(footer, /class="sh-foot-links"/);
  assert.match(footer, /GitHub/);
  assert.match(footer, /RSS\s*<\/a>/);
  assert.match(footer, /基于 <a [^>]*href="https:\/\/github\.com\/hedon954\/garden"[^>]*>Garden<\/a> 构建/);
  assert.doesNotMatch(footer, /aria-label/);
  assert.match(shell, /\.sh-feature \.cover\{[^}]*aspect-ratio:auto;display:block/);
  assert.match(shell, /\.sh-feature \.cover\{[^}]*background:none/);
  assert.match(shell, /\.sh-feature \.cover img\{display:block;width:100%;height:auto\}/);
  assert.doesNotMatch(shell, /\.sh-feature \.cover\{[^}]*aspect-ratio:16\/9/);
  assert.doesNotMatch(shell, /\.sh-feature \.cover\{border-radius:16px\}/);
  const feature = html.match(/<article class="sh-feature"[\s\S]*?<\/article>/)?.[0] ?? "";
  assert.match(feature, /class="cover"/);
  assert.match(feature, /\/media\/covers\/windowsill-herbs\.svg/);
  assert.doesNotMatch(feature, /style="background/);
  const [blogPage, columnPage] = await Promise.all([
    readFile(new URL("../app/blog/[...path]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/columns/[column]/[...path]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(blogPage, /readingTime/);
  assert.doesNotMatch(columnPage, /readingTime/);
  assert.match(shell, /\.sh-intro h1\{[^}]*max-width:var\(--list\);text-wrap:balance/);
  assert.match(shell, /\.sh-intro p\{[^}]*text-wrap:balance/);
  assert.match(html, /id="h-pin">置顶</);
  assert.doesNotMatch(html, /最近随想/);
  assert.doesNotMatch(html, /home-thought-list/);
  assert.match(html, /id="h-cols">专栏</);
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
  assert.match(article, /data-mermaid-theme="a2"/);
  assert.match(article, /class="[^"]*g-mermaid/);
  assert.match(article, /mermaid-src/);
  assert.doesNotMatch(article, /mermaid-view-switcher/);
  assert.doesNotMatch(article, />图表<\/button>/);
  assert.doesNotMatch(article, />Code<\/button>/);
  assert.doesNotMatch(article, /mermaid-theme-picker|森林/);
  assert.match(article, /language-typescript/);
  assert.match(article, /language-python/);
  assert.match(article, /language-rust/);
  assert.match(article, /language-go/);
  assert.match(article, /language-sql/);
  assert.match(article, /language-swift/);
  assert.match(article, /<details>/);
  assert.match(article, /class="article-hero article-cover/);
  assert.match(article, /class="article-header article-summary-row/);
  assert.match(article, /class="article-reading-layout"/);
  assert.match(article, /class="article-reading-column"/);
  assert.doesNotMatch(article, /<strong>(?:提示|建议|告警|警示)<\/strong>/);
  assert.match(article, /markdown-alert-note/);
  assert.match(article, /markdown-alert-tip/);
  assert.match(article, /markdown-alert-warning/);
  assert.match(article, /markdown-alert-caution/);
  assert.match(article, /普通补充信息会显示为「提醒」/);
  assert.match(article, /需要关注的风险会显示为「警告」/);
  assert.match(article, /可能造成严重后果的操作会显示为「注意」/);
  assert.doesNotMatch(article, /\[!(?:NOTE|TIP|WARNING|CAUTION)\]/);
  assert.match(article, /<time class="dt-published" dateTime="2026-07-25T00:00:00\+08:00">2026 年 7 月 25 日<\/time>/);
  assert.doesNotMatch(article, /2026\/07\/25/);
  const meta = article.match(/<ul class="meta article-meta">[\s\S]*?<\/ul>/)?.[0] ?? "";
  const metaText = meta.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  assert.match(metaText, /^Your Name 2026 年 7 月 25 日 约 [\d,]+ 字$/);
  assert.doesNotMatch(meta, /<li>\s*<\/li>/);
  assert.doesNotMatch(meta, /分钟/);
  assert.match(article, /约 <!-- -->[\d,]+<!-- --> 字/);
  assert.ok(
    article.indexOf('class="article-header article-summary-row hero"') <
      article.indexOf('class="article-hero article-cover'),
    "article cover sits in the header after the title, at column width",
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

  const kv = await render("/a2/kv-cache");
  assert.equal(kv.status, 200);
  const kvHtml = await kv.text();
  assert.match(kvHtml, /2026 年 9 月 18 日/);
  assert.match(kvHtml, /约 <!-- -->[\d,]+<!-- --> 字/);
  assert.doesNotMatch(kvHtml, /mermaid-view-switcher/);
  assert.ok(
    kvHtml.indexOf('class="article-header article-summary-row hero"') <
      kvHtml.indexOf('class="article-hero article-cover'),
    "a2 cover stays below the title",
  );

  assert.equal(archiveResponse.status, 200);
  const archive = await archiveResponse.text();
  // The row cover was always clipped to 1px; it is no longer downloaded at all.
  assert.doesNotMatch(archive, /class="archive-cover"/);
  assert.match(archive, /class="archive-copy"/);
  assert.match(archive, /class="archive-meta" dateTime="2026-07-25">07-25</);
  assert.doesNotMatch(archive, /\?topic=|class="sh-filters" aria-label="按分类筛选"/);
});

test("collapses the reading table of contents per heading and keeps its active item visible", async () => {
  const [toc, styles, content] = await Promise.all([
    readFile(new URL("../app/components/TableOfContents.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/content.ts", import.meta.url), "utf8"),
  ]);

  assert.match(toc, /collapsedSections/);
  assert.match(toc, /nestHeadings/);
  assert.match(toc, /renderNode/);
  assert.match(toc, /className="toc-sublist" hidden=\{collapsed\}/);
  assert.match(toc, /aria-label=\{`\$\{collapsed \? "展开" : "收起"\}「\$\{node\.text\}」的子目录`\}/);
  assert.match(toc, /listRef/);
  assert.match(toc, /\[aria-current="location"\]/);
  assert.match(toc, /list\.scrollTo/);
  assert.match(toc, /getComputedStyle\(document\.documentElement\)\.scrollPaddingTop/);
  assert.match(toc, /window\.innerHeight \* 0\.45/);
  assert.match(toc, /anchorStop \+ 240/);
  assert.match(toc, /trackAnchorLayout/);
  assert.match(toc, /image\.compareDocumentPosition\(target\)/);
  assert.match(toc, /image\.addEventListener\("load", realign/);
  assert.match(toc, /history\.pushState/);
  assert.match(toc, /mobileOpen/);
  assert.match(toc, /className="toc-mobile-trigger"/);
  assert.match(toc, /aria-controls=\{panelId\}/);
  assert.match(toc, /document\.body\.style\.overflow = "hidden"/);
  assert.match(toc, /event\.key === "Escape"/);
  assert.match(toc, /closeMobileToc\(\)/);
  assert.match(styles, /\.toc-list[\s\S]*overflow-y: auto/);
  assert.match(styles, /\.toc li\.active > \.toc-item-row > a/);
  assert.match(styles, /\.toc-mobile-trigger[\s\S]*position: fixed/);
  assert.match(styles, /\.toc-mobile-backdrop\[data-mobile-open="true"\]/);
  assert.match(styles, /\.toc\[data-mobile-open="true"\][\s\S]*transform: translateY\(0\)/);
  assert.match(styles, /\.markdown-body h2,[\s\S]*scroll-margin-top: 0/);
  assert.match(styles, /\.markdown-body h3[\s\S]*font-size: clamp\(20px/);
  assert.match(styles, /\.markdown-body h4[\s\S]*font-size: clamp\(19px/);
  assert.match(styles, /\.markdown-body h5[\s\S]*font-size: clamp\(17px/);
  assert.match(styles, /\.markdown-body ul \{\s*list-style: disc outside;/);
  assert.match(styles, /\.archive-cover \{\s*width: 160px;\s*height: auto;/);
  assert.match(styles, /\.article-hero img \{\s*width: 100%;\s*height: auto;/);
  assert.match(content, /unified\(\)\.use\(remarkParse\)\.use\(markdownPlugins\)/);
  assert.match(content, /visit\(tree, "heading"/);
  assert.match(content, /node\.depth >= 2 && node\.depth <= 5/);
});

test("renders a column entry cover when its source article defines one", async () => {
  const columnEntry = await readFile(
    new URL("../app/columns/[column]/[...path]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(columnEntry, /entry\.cover &&/);
  assert.match(columnEntry, /className="article-hero article-cover/);
  assert.match(columnEntry, /src=\{entry\.cover\}/);
  assert.match(columnEntry, /\$\{entry\.title\} 封面/);
  assert.doesNotMatch(columnEntry, /coverAlt/);
});

test("hides empty home sections and gives every content index an intentional empty state", async () => {
  const [home, archive, thoughts, columns, emptyState] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/BlogArchive.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/thoughts/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/columns/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ContentEmptyState.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(home, /pinned\.length > 0/);
  assert.match(home, /posts\.length > 0/);
  assert.doesNotMatch(home, /最近随想|ThoughtCard|getPublishedThoughts/);
  assert.match(home, /columns\[0\]/);
  assert.match(archive, /ContentEmptyState kind="posts"/);
  assert.match(thoughts, /ContentEmptyState kind="thoughts"/);
  assert.match(columns, /ContentEmptyState kind="columns"/);
  assert.match(columns, /column-feature-cover/);
  assert.match(columns, /siteConfig\.pages\.columns\.subtitle/);
  assert.doesNotMatch(columns, /与文章分类相互独立/);
  assert.match(emptyState, /content-empty-state/);
});

test("the example post keeps a wide local image, and tags create a release", async () => {
  const [post, image, measure, publish, a2] = await Promise.all([
    readFile(new URL("../content/posts/windowsill-herbs.md", import.meta.url), "utf8"),
    readFile(new URL("../content/posts/windowsill-herbs/sill.svg", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArticleMeasure.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8"),
  ]);
  assert.match(post, /!\[朝北的窗台，从左到右是罗勒、薄荷和一只空盆。\]\(\.\/windowsill-herbs\/sill\.svg\)/);
  assert.doesNotMatch(post, /oss-|aliyuncs|myqcloud/i);
  // a 2x asset: 2560 pixels wide, displayed at 1280, so it widens to the 1040px cap
  assert.match(image, /width="2560" height="840" viewBox="0 0 1280 420"/);
  assert.match(measure, /querySelectorAll<HTMLElement>\("\.fig"\)/);
  assert.match(measure, /figureBreakout\(\{/);
  // images show at their natural size, capped at the column; only widened ones get an inline width
  const figImg = a2.match(/\.markdown-body \.fig-card img \{[^}]*\}/)?.[0] ?? "";
  assert.match(figImg, /width: auto;/);
  assert.match(figImg, /max-width: 100%;/);
  assert.doesNotMatch(figImg, /(^|[\s;{])width: 100%/);
  assert.match(measure, /image\.style\.removeProperty\("width"\)/);
  assert.match(measure, /figureImageWidth\(\{ naturalWidth: image\.naturalWidth, attrWidth, widened: breakout\.left > 0 \}\)/);
  assert.doesNotMatch(measure, /imageDisplayWidth/);
  assert.match(measure, /naturalWidth/);
  assert.match(publish, /if: github\.event_name == 'push' && startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.match(publish, /gh release create "\$tag" --generate-notes/);

  const response = await render("/blog/windowsill-herbs");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /\/media\/posts\/windowsill-herbs\/sill\.svg/);
  assert.match(html, /class="fig"/);
  assert.match(html, /朝北的窗台，从左到右是罗勒、薄荷和一只空盆。/);
  assert.doesNotMatch(html, /oss-|aliyuncs|myqcloud/i);
  // the markdown syntax tree never leaks onto the image as an attribute
  const images = html.match(/<img\b[^>]*>/g) ?? [];
  assert.ok(images.some((tag) => tag.includes("sill.svg")));
  for (const tag of images) assert.doesNotMatch(tag, /\snode=/);
});

test("columns index shows the configured subtitle", async () => {
  const response = await render("/columns");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /class="sh-deck">按顺序读的一组文章。<\/p>/);
  assert.doesNotMatch(html, /与文章分类相互独立/);
});

test("renders safe external embeds and the complete GitHub profile experience", async () => {
  const [markdown, embed, garden, github, liveGithub, workflow, docs] = await Promise.all([
    readFile(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ExternalEmbed.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/garden/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/GithubProfile.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/GithubLiveOverview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../docs/content-authoring.md", import.meta.url), "utf8"),
  ]);

  assert.match(markdown, /garden-block/);
  assert.match(markdown, /className: "ext"/);
  assert.match(embed, /youtube-nocookie\.com\/embed/);
  assert.match(embed, /player\.bilibili\.com\/player\.html/);
  assert.match(embed, /\['http:', 'https:'\]/);
  assert.match(garden, /GardenMediaGuide/);
  assert.match(docs, /X（Twitter）、微信公众号/);
  assert.match(github, /pinnedItems\(first: 6/);
  assert.match(github, /totalCommitContributions/);
  assert.match(github, /contributionCalendar/);
  assert.match(github, /status \{ message emoji \}/);
  assert.match(github, /events\/public\?per_page=100/);
  assert.match(liveGithub, /cache: "no-store"/);
  assert.match(liveGithub, /本次访问已同步/);
  assert.match(liveGithub, /statusMessage\?\.trim\(\) \|\| profileBio/);
  assert.match(workflow, /GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
});

test("renders every reading TOC link with a matching Markdown heading ID", async () => {
  const response = await render("/blog/markdown-lab");
  assert.equal(response.status, 200);
  const html = await response.text();
  const toc = html.match(/<aside class="toc[\s\S]*?<\/aside>/u)?.[0];
  assert.ok(toc, "the Markdown lab should render a table of contents");
  const targets = [...toc.matchAll(/href="#([^"]+)"/gu)].map((match) => match[1]);
  assert.ok(targets.length > 0, "the Markdown lab should expose TOC links");
  for (const target of targets) {
    assert.match(html, new RegExp(`id="${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "u"));
  }
});

test("publishes discovery routes, permanent thought pages, and real integration adapters", async () => {
  const [sitemapResponse, robotsResponse, thoughtResponse, gardenResponse] = await Promise.all([
    render("/sitemap.xml"),
    render("/robots.txt"),
    render("/thoughts/rainy-night"),
    render("/garden"),
  ]);

  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  assert.match(sitemap, /\/blog\/markdown-lab/);
  assert.match(sitemap, /\/thoughts\/rainy-night/);
  assert.match(sitemap, /\/columns\/building-in-public\/smallest-closed-loop/);
  assert.match(sitemap, /\/garden/);

  assert.equal(gardenResponse.status, 200);
  const garden = await gardenResponse.text();
  assert.match(garden, /id="garden-admin-title"/);
  assert.match(garden, /make dev/);

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

  const [
    adminPage,
    thoughtApi,
    distributionApi,
    githubContent,
    workflow,
    verifyWorkflow,
  ] = await Promise.all([
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/thoughts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/distribution/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/github-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/verify.yml", import.meta.url), "utf8"),
  ]);

  assert.match(adminPage, /api\/auth\/github/);
  assert.match(adminPage, /AdminDashboard/);
  assert.match(thoughtApi, /createRepositoryThought/);
  assert.match(githubContent, /CONTENT_GITHUB_TOKEN/);
  assert.match(githubContent, /content\/thoughts/);
  assert.match(githubContent, /async function mutateRepository/);
  assert.match(githubContent, /repositoryPostPath\(input\.sourcePath\)/);
  assert.match(githubContent, /JSON\.stringify\(\{ \.\.\.payload, branch: config\.branch \}\)/);
  assert.doesNotMatch(githubContent, /const \{ config, response \} = await requestRepository/);
  assert.match(distributionApi, /X_USER_ACCESS_TOKEN/);
  assert.match(distributionApi, /CSDN_SYNC_WEBHOOK/);
  assert.match(workflow, /actions\/deploy-pages/);
  assert.match(workflow, /PAGES_REPOSITORY/);
  assert.match(workflow, /PAGES_DEPLOY_KEY/);
  assert.match(workflow, /prepare-pages-output\.mjs/);
  assert.match(workflow, /STATIC_EXPORT=1/);
  assert.match(verifyWorkflow, /pages:validate/);
});

test("0.4.3: wider reading column, transparent column cards, and tag chips under the meta row", async () => {
  const [tokens, globals, shell, a2, measure] = await Promise.all([
    readFile(new URL("../app/styles/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/shell.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ArticleMeasure.tsx", import.meta.url), "utf8"),
  ]);

  // H. body width
  assert.match(tokens, /--col: 740px;/);
  assert.match(globals, /--content: 740px;/);
  assert.doesNotMatch(tokens + globals + a2 + shell, /minmax\(0, 700px\)|--col: 700px|--content: 700px/);
  // figures and tables break out from the text column, not the article grid
  assert.match(measure, /querySelector\("\.markdown-body"\)/);

  // I. column cards: transparent, with a border
  const card = shell.match(/\.sh-col\{[^}]*\}/)?.[0] ?? "";
  assert.match(card, /background:transparent/);
  assert.match(card, /border:1px solid var\(--rule\)/);
  assert.match(card, /border-radius:var\(--r\)/);
  assert.doesNotMatch(card, /var\(--card\)/);
  assert.match(shell, /\.sh-col:hover\{background:var\(--card-hover\);box-shadow:var\(--card-shadow\)\}/);
  assert.doesNotMatch(shell, /\.sh-col:hover\{[^}]*(border|transform)/);
  assert.match(shell, /\.sh-col \.cover\{[^}]*margin:0/);
  assert.match(shell, /\.sh-col \.body\{padding:16px 18px 18px\}/);
  assert.match(shell, /\.sh-col:hover h3 a\{color:var\(--blue\)\}/);

  // J. tag chips
  assert.match(a2, /\.article-tagrow \{[^}]*flex-wrap: wrap;[^}]*gap: 8px;/);
  assert.match(a2, /\.article-tagrow \.tag-chip \{[^}]*padding: 2px 10px;[^}]*border-radius: 999px;[^}]*background: var\(--chip\);[^}]*color: var\(--soft\);/);
  assert.match(a2, /\.article-tagrow \.tag-chip::after \{[^}]*height: 44px;/);
  assert.doesNotMatch(globals + a2, /\.article-tags\b/);

  const [postResponse, columnResponse] = await Promise.all([
    render("/blog/markdown-lab"),
    render("/columns/building-in-public/ship-with-evidence"),
  ]);
  for (const [response, tags] of [
    [postResponse, ["Markdown", "Typora", "Mermaid", "KaTeX"]],
    [columnResponse, ["验证", "发布"]],
  ]) {
    assert.equal(response.status, 200);
    const html = await response.text();
    const header = html.match(/<header class="article-header[\s\S]*?<\/header>/)?.[0] ?? "";
    assert.ok(header, "article header renders");
    const meta = header.indexOf('class="meta article-meta"');
    const row = header.indexOf('class="article-tagrow"');
    assert.ok(meta >= 0 && row > meta, "tag row sits right after the meta row");
    for (const tag of tags) {
      assert.match(header, new RegExp(`<a class="tag-chip p-category" href="/blog\\?t=${encodeURIComponent(tag)}">#(<!-- -->)?${tag}</a>`));
    }
    assert.doesNotMatch(header, /class="cat"|\/blog\?topic=/);
    assert.doesNotMatch(html, /class="article-tags"/);
  }
});

test("posts have no topic: no field, no filter, no label", async () => {
  const files = [
    "scripts/build-content.mjs", "scripts/check-post.mjs", "scripts/new-post.mjs",
    "app/lib/content.ts", "app/garden-modules.d.ts", "app/page.tsx",
    "app/components/SiteHeader.tsx", "app/components/BlogArchive.tsx", "app/tags/page.tsx",
    "app/components/AdminDashboard.tsx", "app/admin/page.tsx", "app/a2/[slug]/page.tsx", "app/lib/a2-preview.ts",
    "app/globals.css", "Makefile", "templates/site/Makefile", "docs/content-authoring.md", "docs/quick-start.md",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const meaningful = source.replace(/\/\/ Older posts may still carry `topic:`; it is no longer used\.\n\s*delete data\.topic;/, "");
    assert.doesNotMatch(meaningful, /\btopics?\b|TOPIC/, `${file} still mentions topic`);
  }
});

test("/blog rows show the post's column, linked to that column; other posts show nothing there", async () => {
  const response = await render("/blog");
  assert.equal(response.status, 200);
  const html = await response.text();
  const rows = [...html.matchAll(/<li class="sh-row">[\s\S]*?<\/li>/g)].map((match) => match[0]);
  assert.ok(rows.length >= 9);
  const inColumn = rows.find((row) => row.includes("/blog/building-in-public/ship-with-evidence"));
  assert.match(inColumn ?? "", /<a (?=[^>]*class="cat")(?=[^>]*href="\/columns#building-in-public")[^>]*>一个人造产品<\/a>/);
  const standalone = rows.find((row) => row.includes("/blog/markdown-lab"));
  assert.ok(standalone);
  assert.doesNotMatch(standalone, /class="cat"/);
});

test("/blog filters by several tags through the URL, and /tags is only an index", async () => {
  const [archive, source, tagsPage, redirect, shell] = await Promise.all([
    render("/blog").then((response) => response.text()),
    readFile(new URL("../app/components/BlogArchive.tsx", import.meta.url), "utf8"),
    render("/tags").then((response) => response.text()),
    readFile(new URL("../app/components/TagRedirect.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/shell.css", import.meta.url), "utf8"),
  ]);
  const chips = archive.match(/<ul class="sh-tagchips" aria-label="按标签筛选">[\s\S]*?<\/ul>/)?.[0] ?? "";
  assert.match(chips, /<button type="button" class="sh-tagchip" aria-pressed="false">/);
  assert.match(archive, /<span aria-live="polite">共 <!-- -->?9<!-- -->? 篇<\/span>|<span aria-live="polite">共 9 篇<\/span>/);
  assert.match(source, /searchParams\.getAll\(TAG_PARAM\)/);
  assert.match(source, /filterByTags\(posts, selected\)/);
  assert.match(source, /router\.push\(tagFilterHref/);
  assert.match(source, /没有同时带这些标签的文章。/);
  assert.match(source, /清除/);
  assert.match(source, /`展开全部 \$\{options\.length\} 个标签`/);
  assert.match(source, /expanded \? "收起"/);
  assert.doesNotMatch(source, /topic|按分类筛选/);

  assert.match(tagsPage, /<ul class="sh-tagchips sh-tagindex" aria-label="全部标签">/);
  assert.match(tagsPage, /<a href="\/blog\?t=Markdown" class="sh-tagchip">#<!-- -->Markdown<span class="n num">/);
  assert.doesNotMatch(tagsPage, /aria-pressed|sh-tagresult|分类/);
  assert.match(redirect, /router\.replace\(target\)/);

  assert.match(shell, /\.sh-tagchips\{display:flex;flex-wrap:wrap;gap:12px 8px/);
  assert.match(shell, /\.sh-tagchip\[aria-pressed="true"\]\{background:var\(--chip-on\);color:var\(--chip-on-text\)/);
  assert.match(shell, /\.sh-tagchip:disabled\{/);
  // the expand control is a text button, not a chip
  assert.match(shell, /\.sh-tagmore\{[^}]*border:0;background:none;color:var\(--blue\)[^}]*text-decoration:underline/);
  assert.match(shell, /\.sh-tagchip::after,\.sh-tagmore::after\{[^}]*height:44px/);
});

test("/blog renders the full list on the server, before any script runs", async () => {
  const [response, page, generated] = await Promise.all([
    render("/blog"),
    readFile(new URL("../app/blog/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.garden/generated-content.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(response.status, 200);
  const html = await response.text();
  // Anything React streams in later sits in a hidden block; the list must come before it.
  const hiddenAt = html.search(/<div hidden id="S:/);
  const visible = hiddenAt >= 0 ? html.slice(0, hiddenAt) : html;
  const posts = JSON.parse(generated.match(/export const posts = (\[[\s\S]*?\]) as ContentEntry\[\];/)[1]);
  assert.ok(posts.length >= 9);
  for (const post of posts) {
    assert.ok(visible.includes(`href="/blog/${post.path}"`), `${post.path} is in the server-rendered list`);
    assert.ok(visible.includes(post.title.replace(/&/g, "&amp;")), `${post.title} is in the server-rendered list`);
  }
  assert.match(page, /<Suspense fallback=\{<BlogArchiveFallback posts=\{list\} series=\{series\} \/>\}>/);
});

test("palette: warm paper, ink accent, no blue, readable chips in both themes", async () => {
  const [tokens, shell, globals, a2, ui] = await Promise.all([
    readFile(new URL("../app/styles/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/shell.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8"),
    readFile(new URL("../ui/react/ui.css", import.meta.url), "utf8"),
  ]);
  const block = (css, start) => css.slice(css.indexOf(start), css.indexOf("}", css.indexOf(start)));
  const light = block(tokens, ":root,\n:root[data-theme=\"light\"] {");
  const dark = block(tokens, ":root[data-theme=\"dark\"],\nhtml[data-theme=\"dark\"] {");
  const token = (css, name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];

  assert.equal(token(light, "paper"), "#faf9f5");
  for (const name of ["paper-deep", "well", "blue-tint", "chip"]) assert.equal(token(light, name), "#f0eee6", name);
  assert.equal(token(light, "card-hover"), "#f5f4ed");
  assert.equal(token(light, "chip-hover"), "#e8e5db");
  assert.equal(token(light, "blue"), "#30302e");
  assert.equal(token(light, "chip-on"), "#30302e");
  assert.equal(token(light, "chip-on-text"), "#faf9f5");
  assert.match(light, /--card-shadow: 0 1px 2px rgb\(20 20 19 \/ 4%\), 0 4px 14px rgb\(20 20 19 \/ 5%\);/);
  assert.equal(token(dark, "paper"), "#1f1e1d");
  assert.equal(token(dark, "blue"), "#eeece7");
  assert.equal(token(dark, "chip-on"), "#eeece7");
  assert.match(shell, /:root\{\s*--paper:#FAF9F5;/);
  assert.match(globals, /:root \{\s*--paper: #faf9f5;\s*--paper-deep: #f0eee6;/);

  // no blue left in the site styles, except the NOTE callout, which follows the A2 demo
  const blues = /2c55b4|93b2f4|5e86e0|4c72c9|eaf0fc|eef3fc|44,\s*85,\s*180|44 85 180|147,\s*178,\s*244|147 178 244/i;
  const a2WithoutCallouts = a2.replace(/--al-note(-bg|-line)?: [^;]+;/g, "");
  for (const [name, css] of Object.entries({ tokens, shell, globals, a2: a2WithoutCallouts, ui })) assert.doesNotMatch(css, blues, name);

  // WCAG AA (4.5:1) for chip text, selected chips and muted text
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  for (const [theme, css] of [["light", light], ["dark", dark]]) {
    const pairs = [["soft", "chip"], ["soft", "chip-hover"], ["ink", "chip-hover"], ["chip-on-text", "chip-on"], ["muted", "paper"], ["muted", "chip"], ["muted", "card-hover"], ["blue", "paper"]];
    for (const [fg, bg] of pairs) {
      const r = ratio(token(css, fg), token(css, bg));
      assert.ok(r >= 4.5, `${theme} ${fg} on ${bg}: ${r.toFixed(2)}`);
    }
  }

  // card hover: fill and faint shadow, no movement, quiet for reduced motion
  assert.match(shell, /\.sh-col\{[^}]*transition:background-color \.15s ease,box-shadow \.15s ease\}/);
  assert.match(shell, /@media \(prefers-reduced-motion:reduce\)\{\s*\.sh-col,[^{]*\{transition:none\}/);
  assert.match(shell, /\.sh-tagchip\{[^}]*background:var\(--chip\);color:var\(--soft\)/);
});

test("body links answer hover with a darker underline, and the current TOC item is marked", async () => {
  const [a2, globals] = await Promise.all([
    readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  for (const css of [a2, globals]) {
    const rest = css.match(/\.markdown-body a \{[^}]*\}/)?.[0] ?? "";
    const hover = css.match(/\.markdown-body a:hover \{[^}]*\}/)?.[0] ?? "";
    assert.match(rest, /text-decoration-color: color-mix\(in srgb, var\(--ink\) 35%, transparent\);/);
    assert.match(hover, /text-decoration-color: var\(--ink\);/);
    assert.match(hover, /text-decoration-thickness: 2px;/);
    // the colour itself does not change on hover
    assert.doesNotMatch(hover, /(^|[\s;{])color:/);
  }
  assert.match(a2, /\.markdown-body a\.ext:hover \{[^}]*text-decoration-color: var\(--ink\);[^}]*text-decoration-thickness: 2px;/);
  assert.match(a2, /\.toc li\.active > \.toc-item-row > a \{[^}]*font-weight: 600;/);
  assert.match(a2, /\.toc li\.active > \.toc-item-row::before \{[^}]*width: 2px;[^}]*background: var\(--ink\);/);
});

test("references render as a numbered list in one warm card, with the source site after each title", async () => {
  const [response, generated, globals] = await Promise.all([
    render("/blog/markdown-lab"),
    readFile(new URL("../.garden/generated-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.equal(response.status, 200);
  const html = await response.text();
  const section = html.match(/<section class="article-references[^"]*"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.ok(section, "references section");
  // six entries: two columns on wide screens
  assert.match(section, /class="article-references is-split"/);
  assert.match(section, /<h2 id="article-references-heading">参考<\/h2>/);
  assert.match(section, /<ol>/);
  assert.doesNotMatch(section, /<table|<td|<tr/);
  assert.equal((section.match(/<li>/g) ?? []).length, 6);
  // the domain is worked out at build time and shown after the title
  assert.match(generated, /"domain":\s*"spec\.commonmark\.org"/);
  assert.match(section, /<a href="https:\/\/spec\.commonmark\.org\/" rel="noreferrer">CommonMark Spec<\/a> <span class="ref-domain">spec\.commonmark\.org<\/span>/);
  assert.match(section, /<span class="ref-domain">github\.github\.com<\/span>/);
  // an entry without a link shows the title only
  assert.match(section, /<li><span class="ref-title">《The Elements of Typographic Style》<\/span><\/li>/);

  const card = globals.match(/\.article-references \{[^}]*\}/)?.[0] ?? "";
  assert.match(card, /background: var\(--card-hover\);/);
  assert.match(card, /border: 1px solid var\(--rule\);/);
  assert.match(card, /border-radius: var\(--r\);/);
  assert.match(globals, /\.article-references > h2 \{[^}]*font: 600 17px \/ 1\.4 var\(--sans\);/);
  assert.match(globals, /@media \(min-width: 900px\) \{\s*\.article-references\.is-split ol \{\s*columns: 2;/);
  assert.match(globals, /\.article-references a \{[^}]*text-decoration-color: color-mix\(in srgb, var\(--ink\) 35%, transparent\);/);
  assert.doesNotMatch(globals, /\.article-references (table|td|tr)\b/);
});

test("callouts use the A2 demo colours, all five styled alike", async () => {
  const [a2, response] = await Promise.all([
    readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8"),
    render("/blog/markdown-lab"),
  ]);
  // Values from https://hedon-garden-demos.pages.dev/a2/callouts/
  const demo = {
    light: {
      note: ["#2c55b4", "#eef3fc", "rgba(44, 85, 180, 0.22)"],
      tip: ["#2d6a3e", "#edf5ef", "rgba(45, 106, 62, 0.22)"],
      important: ["#6a3fb5", "#f3effa", "rgba(106, 63, 181, 0.22)"],
      warning: ["#8a5300", "#fbf3e5", "rgba(176, 108, 0, 0.26)"],
      caution: ["#b4213a", "#fbeef0", "rgba(216, 45, 72, 0.28)"],
    },
    dark: {
      note: ["#93b2f4", "rgba(147, 178, 244, 0.09)", "rgba(147, 178, 244, 0.28)"],
      tip: ["#8fcb9f", "rgba(143, 203, 159, 0.08)", "rgba(143, 203, 159, 0.26)"],
      important: ["#bfa5f0", "rgba(191, 165, 240, 0.09)", "rgba(191, 165, 240, 0.28)"],
      warning: ["#e6b566", "rgba(230, 181, 102, 0.08)", "rgba(230, 181, 102, 0.28)"],
      caution: ["#f2909f", "rgba(242, 144, 159, 0.08)", "rgba(242, 144, 159, 0.28)"],
    },
  };
  const lightBlock = a2.slice(a2.indexOf(".markdown-body.prose {"), a2.indexOf(':root[data-theme="dark"] .markdown-body.prose'));
  const darkStart = a2.indexOf(':root[data-theme="dark"] .markdown-body.prose');
  const darkBlock = a2.slice(darkStart, a2.indexOf("}", darkStart));
  for (const [theme, block] of [["light", lightBlock], ["dark", darkBlock]]) {
    for (const [kind, [fg, bg, line]] of Object.entries(demo[theme])) {
      assert.ok(block.includes(`--al-${kind}: ${fg};`), `${theme} ${kind} colour`);
      assert.ok(block.includes(`--al-${kind}-bg: ${bg};`), `${theme} ${kind} background`);
      assert.ok(block.includes(`--al-${kind}-line: ${line};`), `${theme} ${kind} border`);
    }
  }
  // IMPORTANT differs only in colour: no bar of its own, no heavier title.
  assert.match(a2, /\.markdown-body \.markdown-alert-important \{\s*--al: var\(--al-important\);\s*--al-bg: var\(--al-important-bg\);\s*--al-line: var\(--al-important-line\);\s*\}/);
  assert.doesNotMatch(a2, /markdown-alert-important[^{]*\{[^}]*(border-left|padding-left|font-weight)/);
  assert.match(a2, /\.markdown-body \.markdown-alert \.markdown-alert-title \{[^}]*font-size: 14px;[^}]*font-weight: 600;/);
  assert.match(a2, /@media \(max-width: 640px\) \{\s*\.markdown-body \.markdown-alert \{\s*padding: 14px 16px 16px;/);

  const html = await response.text();
  for (const kind of ["note", "tip", "important", "warning", "caution"]) {
    assert.match(html, new RegExp(`markdown-alert markdown-alert-${kind}`));
  }
  // Icons are the demo's own drawings.
  const icons = await readFile(new URL("../app/lib/remark-a2.mjs", import.meta.url), "utf8");
  for (const path of [
    '<circle cx="8" cy="8" r="6.25"/><path d="M8 7.2v4"/>',
    '<path d="M8 1.75a4.25 4.25 0 0 0-2.5 7.7c.4.3.6.7.6 1.2v.6h3.8v-.6c0-.5.2-.9.6-1.2A4.25 4.25 0 0 0 8 1.75z"/><path d="M6.2 13.6h3.6"/>',
    '<path d="M2.25 3.25a1.5 1.5 0 0 1 1.5-1.5h8.5a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H7.5l-3 2.75v-2.75h-.75a1.5 1.5 0 0 1-1.5-1.5z"/>',
    '<path d="M7.13 2.4a1 1 0 0 1 1.74 0l5.6 9.9a1 1 0 0 1-.87 1.5H2.4a1 1 0 0 1-.87-1.5z"/>',
    '<path d="M5.3 1.75h5.4l3.55 3.55v5.4l-3.55 3.55H5.3L1.75 10.7V5.3z"/>',
  ]) assert.ok(icons.includes(path), path);
});

test("underline, mark and .hl share the demo's highlighter stroke", async () => {
  const [globals, tokens] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/tokens.css", import.meta.url), "utf8"),
  ]);
  const rule = globals.match(/\.markdown-body u,\s*\.markdown-body mark,\s*\.markdown-body \.hl \{([^}]*)\}/)?.[1] ?? "";
  assert.ok(rule, "highlighter rule");
  assert.match(rule, /background: linear-gradient\(to bottom, transparent 58%, var\(--hl\) 58%, var\(--hl\) 92%, transparent 92%\);/);
  assert.match(rule, /font-weight: 500;/);
  assert.match(rule, /padding: 0 0\.08em;/);
  assert.match(rule, /-webkit-box-decoration-break: clone;\s*box-decoration-break: clone;/);
  assert.match(rule, /text-decoration: none;/);
  assert.match(rule, /border-bottom: 0;/);
  assert.match(globals, /\.markdown-body u strong,[^{]*\{[^}]*font-weight: 600;[^}]*text-decoration: none;/);
  assert.doesNotMatch(globals, /\.markdown-body u \{[^}]*border-bottom: 1px/);
  assert.match(tokens, /--hl: #ffe58f;/);
  assert.match(tokens, /--hl: #5e4e17;/);
});

test("link cards: inline links keep the text and get a preview card, standalone links become the card", async () => {
  const html = await (await render("/blog/markdown-lab")).text();
  const section = html.slice(html.indexOf('id="链接卡片"'), html.indexOf('id="数学公式"'));
  // Inline: the link stays in the sentence, with its favicon, and the card follows the paragraph.
  assert.match(section, /<p>[^]*?<a href="https:\/\/github\.com\/remarkjs\/remark-gfm" class="ext"[^>]*>(<span class="fav-keep"><img class="fav"[^>]*>remark-gfm<\/span>|remark-gfm)<\/a>[^]*?<\/p>\s*<div class="link-cards" data-card-url="https:\/\/github\.com\/remarkjs\/remark-gfm">/u);
  const preview = section.match(/<div class="link-cards" data-card-url="https:\/\/github\.com\/remarkjs\/remark-gfm">[^]*?<\/div>/u)?.[0] ?? "";
  assert.match(preview, /<a class="link-card"[^>]*tabindex="-1"[^>]*aria-hidden="true"/u);
  // Standalone: no paragraph and no inline link; the card itself is the link and stays focusable.
  assert.doesNotMatch(section, /<p>\s*<a href="https:\/\/katex\.org\/docs\/supported\.html"/u);
  const standalone = section.match(/<div class="link-cards" data-card-url="https:\/\/katex\.org\/docs\/supported\.html">[^]*?<\/div>/u)?.[0] ?? "";
  assert.ok(standalone, "standalone card rendered");
  assert.doesNotMatch(standalone, /tabindex|aria-hidden="true"[^>]*class="link-card"|class="link-card"[^>]*aria-hidden/u);
  assert.equal((section.match(/https:\/\/katex\.org\/docs\/supported\.html"/gu) ?? []).length, 2); // data-card-url + the card's href
  // Card text comes from the build; pictures are local files with a fixed ratio.
  assert.match(standalone, /<span class="lc-title" data-field="title">[^<]+<\/span>/u);
  assert.doesNotMatch(section, /<img class="lc-thumb" src="https?:/u);
  // The marker never shows, except inside code.
  assert.match(section, /<code>\[文字\]\(https:\/\/example\.com\)\{card\}<\/code>/u);
  assert.doesNotMatch(section.replace(/<code>[^<]*<\/code>/gu, ""), /\{card\}/u);
  const feed = await readFile(new URL("../public/posts.xml", import.meta.url), "utf8");
  assert.doesNotMatch(feed.replace(/<code>[^<]*<\/code>/gu, ""), /\)\{card\}/u);
  const css = await readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.match(css, /\.markdown-body img\.lc-thumb \{[^}]*aspect-ratio: 1\.91 \/ 1;/u);
  assert.match(css, /\.link-card:focus-visible \{/u);
});

test("list pages: images below the fold are lazy, at most one cover loads early", async () => {
  for (const pathname of ["/", "/blog", "/columns"]) {
    const html = await (await render(pathname)).text();
    const images = html.match(/<img\b[^>]*>/gu) ?? [];
    const early = images.filter((tag) => /fetchPriority="high"|fetchpriority="high"/u.test(tag));
    assert.ok(early.length <= 1, `${pathname}: ${early.length} early images`);
    for (const tag of images) {
      if (early.includes(tag)) continue;
      assert.match(tag, /loading="lazy"/u, `${pathname}: ${tag}`);
    }
  }
});

test("no web font is preloaded: the page never uses one outside KaTeX", async () => {
  const html = await (await render("/")).text();
  assert.doesNotMatch(html, /rel="preload"[^>]*as="font"/u);
});

test("the header carries the brand logo, and the page links the configured icons", async () => {
  const html = await (await render("/")).text();
  assert.match(html, /<a href="\/" class="sh-word"><span class="sh-mark" aria-hidden="true"><svg [^>]*viewBox="6 2 18 27"[^>]*stroke="currentColor"/u);
  assert.match(html, /<link rel="icon" href="[^"]*\/favicon\.svg" type="image\/svg\+xml"\/>/u);
  assert.match(html, /<link rel="apple-touch-icon" href="[^"]*\/apple-touch-icon\.png" sizes="180x180"\/>/u);
  assert.match(html, /<span class="lbl">搜索<\/span>/u);
});
