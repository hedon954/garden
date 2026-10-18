import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const SECTION_PAGES = {
  "app/page.tsx": "/",
  "app/blog/page.tsx": "/blog",
  "app/columns/page.tsx": "/columns",
  "app/thoughts/page.tsx": "/thoughts",
  "app/about/page.tsx": "/about",
  "app/tags/page.tsx": "/tags",
  "app/garden/page.tsx": "/garden",
};

test("section pages declare their canonical address and keep the feed link", () => {
  for (const [file, pathname] of Object.entries(SECTION_PAGES)) {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(`alternates: pageAlternates("${pathname}")`), `${file} should set canonical ${pathname}`);
  }
  const helper = fs.readFileSync(new URL("../app/lib/page-alternates.ts", import.meta.url), "utf8");
  assert.match(helper, /canonical: siteHref\(pathname\), types: FEED_ALTERNATES/u);
  // /ui-parity is an internal comparison page: noindex, no canonical.
  const parity = fs.readFileSync(new URL("../app/ui-parity/page.tsx", import.meta.url), "utf8");
  assert.match(parity, /robots: \{ index: false, follow: false \}/u);
  assert.doesNotMatch(parity, /alternates|pageAlternates/u);
  const layout = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /alternates: \{ types: FEED_ALTERNATES \}/u);
});

test("every page that sets its own alternates keeps the feed link (a page's alternates replace the layout's)", () => {
  const files = fs.readdirSync(new URL("../app/", import.meta.url), { recursive: true }).filter((name) => /page\.tsx$/u.test(name));
  const setting = [];
  for (const file of files) {
    const source = fs.readFileSync(new URL(`../app/${file}`, import.meta.url), "utf8");
    for (const [line] of source.matchAll(/alternates:[^\n]*/gu)) {
      setting.push(file);
      assert.ok(/pageAlternates\(|types: FEED_ALTERNATES/u.test(line), `${file}: ${line.trim()} drops the RSS link`);
    }
  }
  // Articles, column articles and thoughts included.
  for (const page of ["blog/[...path]/page.tsx", "columns/[column]/[...path]/page.tsx", "thoughts/[slug]/page.tsx"]) {
    assert.ok(setting.includes(page.split("/").join(path.sep)), `${page} should set alternates`);
  }
});

const outDir = new URL("../dist/client/", import.meta.url).pathname;
const exported = fs.existsSync(path.join(outDir, "index.html"));

/** The address a page in the export is served at: blog/index.html is /blog/. */
function pageAddress(file) {
  const dir = path.dirname(file).split(path.sep).join("/");
  return dir === "." ? "/" : `/${dir}/`;
}

// Runs on a static export (STATIC_EXPORT=1 npm run build, as CI's verify job does after npm test).
test("every page in the static export names itself as canonical, with the trailing slash, and links the feed", { skip: exported ? false : "needs a static export in dist/client" }, () => {
  // media/ holds files posts offer, not pages of the site.
  const files = fs.readdirSync(outDir, { recursive: true }).filter((name) => name.endsWith(".html") && !name.split(path.sep).includes("media"));
  const missing = [];
  const wrong = [];
  const noFeed = [];
  let checked = 0;
  for (const file of files) {
    const html = fs.readFileSync(path.join(outDir, file), "utf8");
    // Left out: redirect pages, pages kept out of search (noindex: drafts, admin, /ui-parity) and the 404 page.
    if (/<meta http-equiv="refresh"/u.test(html)) continue;
    if (/<meta name="robots" content="[^"]*noindex/u.test(html)) continue;
    if (file === "404.html" || file === "_not-found.html" || file.endsWith(`${path.sep}404.html`)) continue;
    checked += 1;
    const links = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/gu)].map((match) => match[1]);
    if (links.length !== 1) {
      missing.push(`${file}: ${links.length} canonical links`);
      continue;
    }
    if ((html.match(/<link rel="alternate" type="application\/rss\+xml" href="[^"]*\/rss\.xml"/gu) ?? []).length !== 1) noFeed.push(file);
    const href = new URL(links[0]);
    if (href.pathname !== pageAddress(file) || href.search || href.hash) wrong.push(`${file}: ${links[0]}`);
  }
  assert.ok(checked > 5, `only ${checked} pages checked`);
  // The internal comparison page is left out as noindex, and names no canonical address.
  const parity = path.join(outDir, "ui-parity", "index.html");
  if (fs.existsSync(parity)) {
    const html = fs.readFileSync(parity, "utf8");
    assert.match(html, /<meta name="robots" content="noindex, nofollow"/u);
    assert.doesNotMatch(html, /rel="canonical"/u);
  }
  assert.deepEqual(missing, [], `${missing.length} pages without exactly one canonical link`);
  assert.deepEqual(wrong, [], `${wrong.length} canonical links that do not point at the page itself`);
  assert.deepEqual(noFeed, [], `${noFeed.length} pages without exactly one RSS link in <head>`);
});
