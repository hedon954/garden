import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DIAGRAM_RECIPES } from "../ui/garden/diagram-recipes.mjs";
import { HANDBOOK_SECTIONS, groupHandbookDocs, orderedHandbookDocs } from "../app/lib/garden-docs-meta.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const docsClient = path.join(root, "dist", "docs-client");
const docsBuilt = fs.existsSync(path.join(docsClient, "index.html"));

function readHtml(relRoute) {
  const file = relRoute === "/"
    ? path.join(docsClient, "index.html")
    : path.join(docsClient, relRoute.replace(/^\/+|\/+$/gu, ""), "index.html");
  assert.ok(fs.existsSync(file), `Missing built docs HTML page: ${file}`);
  return fs.readFileSync(file, "utf8");
}

/** Strip <script>, <style>, and <pre> code blocks so assertions check actual rendered DOM, never source snippets. */
function renderedProseDom(html) {
  const articleStart = html.indexOf('<div class="e-content">');
  const articleEnd = html.indexOf('<nav class="gdoc-pager"', articleStart >= 0 ? articleStart : 0);
  const slice = articleStart >= 0 && articleEnd > articleStart
    ? html.slice(articleStart, articleEnd)
    : html;
  return slice
    .replace(/<script[\s\S]*?<\/script>/giu, "")
    .replace(/<style[\s\S]*?<\/style>/giu, "")
    .replace(/<pre\b[\s\S]*?<\/pre>/giu, "");
}

test("HANDBOOK_SECTIONS keeps 5 stable clickable top-level sections and never reorders across routes", () => {
  assert.deepEqual(
    HANDBOOK_SECTIONS.map((s) => [s.id, s.overviewPath, s.title]),
    [
      ["guide", "guide", "使用指南"],
      ["design", "design", "框架设计"],
      ["components", "components", "内置组件"],
      ["scripts", "scripts", "常用脚本"],
      ["extensions", "extensions", "扩展插件"],
    ],
  );

  const sampleDocs = [
    { path: "guide", title: "使用指南", section: "guide", order: 10 },
    { path: "guide/quick-start", title: "快速上手", section: "guide", order: 11 },
    { path: "design", title: "框架设计", section: "design", order: 20 },
    { path: "components", title: "内置组件", section: "components", order: 30 },
    { path: "components/link-card", title: "链接卡片", section: "components", order: 31 },
    { path: "components/diagrams/columns-join", title: "关联图", section: "diagrams", order: 101 },
    { path: "scripts", title: "常用脚本", section: "scripts", order: 40 },
    { path: "extensions", title: "扩展插件", section: "extensions", order: 50 },
    { path: "extensions/typora", title: "typora", section: "extensions", order: 51, navIcon: "typora" },
    { path: "extensions/vscode", title: "vscode", section: "extensions", order: 52, navIcon: "vscode" },
  ];

  const grouped = groupHandbookDocs(sampleDocs);
  assert.deepEqual(grouped.map((g) => g.id), ["guide", "design", "components", "scripts", "extensions"]);
  for (const g of grouped) {
    assert.ok(g.overviewDoc, `${g.id} has overviewDoc`);
  }
  const components = grouped.find((g) => g.id === "components");
  assert.deepEqual(components?.items.map((i) => i.path), ["components/link-card"]);
  assert.deepEqual(components?.diagramSubpages.map((i) => i.path), ["components/diagrams/columns-join"]);
  assert.ok(orderedHandbookDocs(sampleDocs).some((d) => d.path === "components/diagrams/columns-join"));

  const navSrc = fs.readFileSync(path.join(root, "app/components/GardenDocsNav.tsx"), "utf8");
  assert.doesNotMatch(navSrc, /\.sort\(\(a,\s*b\)\s*=>\s*Number\(b\.id\s*===/u, "sidebar must never dynamically reorder groups");
  assert.match(navSrc, /gdoc-nav-sub/u, "diagram recipes must be nested under 智能 UI");
});

test("standalone docs export has handbook-only search index, clickable section overviews, Typora/VS Code icons, and 100% live renders across every built-in component and figure", { skip: docsBuilt ? false : "run npm run docs:build first" }, () => {
  // 1. Search index contains ONLY handbook pages (zero blog posts)
  const searchRecords = JSON.parse(fs.readFileSync(path.join(docsClient, "search-index.json"), "utf8"));
  assert.ok(searchRecords.length >= 45, `expected >= 45 handbook search records, got ${searchRecords.length}`);
  for (const rec of searchRecords) {
    assert.ok(!rec.path.startsWith("/blog/"), `blog post leaked into docs search index: ${rec.path}`);
    assert.ok(!rec.path.startsWith("/columns/"), `column leaked into docs search index: ${rec.path}`);
  }
  assert.ok(searchRecords.some((r) => r.path === "/guide/quick-start" && r.title.includes("快速上手")));
  assert.ok(searchRecords.some((r) => r.path === "/components/link-card" && r.title.includes("链接卡片")));

  // 2. All 5 section overview pages exist and sidebar group headings link to /garden/<section>/
  for (const sec of HANDBOOK_SECTIONS) {
    const overviewHtml = readHtml(`/${sec.overviewPath}`);
    assert.match(overviewHtml, /class="[^"]*gdoc-nav-group-link/u);
    assert.match(overviewHtml, new RegExp(`href="/garden/${sec.overviewPath}/"`, "u"));
    assert.match(overviewHtml, /class="gdoc-app-icon gdoc-app-icon--typora"/u);
    assert.match(overviewHtml, /class="gdoc-app-icon gdoc-app-icon--vscode"/u);
    // Standalone docs header: no blog nav links (/blog/, /columns/, /about/)
    const header = overviewHtml.match(/<header[\s\S]*?<\/header>/u)?.[0] ?? "";
    assert.doesNotMatch(header, /href="\/blog\/"|href="\/garden\/blog\/"/u);
    // Phase 1 Chinese-only: English switcher hidden while en/ is absent
    assert.doesNotMatch(header, /class="sh-lang/u);
  }

  // 3. Every built-in component page renders REAL DOM components (outside <pre> code blocks) + dual showcase + live playground
  const componentAssertions = [
    {
      route: "/components",
      checks: [/class="link-card"/u, /class="g-player g-player-bilibili"/u, /class="[^"]*g-src-chip/u, /data-garden-file=""/u, /class="garden-ui"/u],
    },
    {
      route: "/components/link-card",
      checks: [/class="ext"/u, /class="link-cards" data-card-url="https:\/\/github\.com\/remarkjs\/remark-gfm"/u, /class="link-cards" data-card-url="https:\/\/spec\.commonmark\.org\/"/u, /class="doc-showcase"/u, /class="doc-playground"/u],
    },
    {
      route: "/components/media",
      checks: [/<figure class="fig/u, /<audio controls/u, /<video controls/u, /class="g-player g-player-bilibili"/u, /player\.bilibili\.com\/player\.html/u, /class="g-player g-player-youtube"/u, /youtube-nocookie\.com\/embed\//u, /class="doc-showcase"/u, /class="doc-playground"/u],
    },
    {
      route: "/components/source",
      checks: [/class="[^"]*g-src-chip/u, /class="doc-showcase"/u, /class="doc-playground"/u],
    },
    {
      route: "/components/file-embed",
      checks: [/data-garden-file=""/u, /class="gf single"/u, /class="gf group"/u, /sill-planner\.html/u, /seed-guide\.pdf/u, /<svg[^>]*class="excalidraw"/u, /class="doc-showcase"/u, /class="doc-playground"/u],
    },
    {
      route: "/components/intelligent-ui",
      checks: [/class="[^"]*g-rel/u, /class="[^"]*g-choice/u, /class="garden-ui"/u, /class="doc-showcase"/u, /class="doc-playground"/u],
    },
    {
      route: "/components/diagrams",
      checks: [/class="g-compose"/u, /class="garden-ui"/u],
    },
  ];

  for (const { route, checks } of componentAssertions) {
    const dom = renderedProseDom(readHtml(route));
    for (const pattern of checks) {
      assert.match(dom, pattern, `${route} is missing live rendered DOM matching ${pattern}`);
    }
  }

  // 4. ALL 21 diagram recipe pages MUST have live rendered Compose / Play UI DOM + dual showcase + live playground
  for (const recipe of DIAGRAM_RECIPES) {
    const route = `/components/diagrams/${recipe.name}`;
    const dom = renderedProseDom(readHtml(route));
    assert.ok(
      /class="g-compose"|class="garden-ui"|class="gf |class="g-compare"|class="g-list"|class="g-timeline"/u.test(dom),
      `${route} must contain real rendered Compose/UI DOM, not just code blocks or static <img>`,
    );
    assert.match(dom, /class="doc-showcase"/u, `${route} missing dual Web/Mobile showcase`);
    assert.match(dom, /class="doc-playground"/u, `${route} missing live editable playground`);
  }
});
