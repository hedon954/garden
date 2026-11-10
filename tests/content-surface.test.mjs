import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { SITE_NAV } from "../ui/garden/site-nav.mjs";

const root = new URL("../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");
const removed = /(?:thoughts?|随想)/iu;

test("the supported content surface is posts and columns, with no removed feature modules", () => {
  assert.deepEqual(SITE_NAV.map(({ href }) => href), ["/blog/", "/columns/", "/about/"]);
  for (const dir of ["app/thoughts", "app/api/admin/thoughts", "content/thoughts", "templates/site/content/thoughts"]) assert.equal(fs.existsSync(new URL(dir, root)), false, dir);
  for (const file of ["app/lib/public-thoughts.ts", "app/components/ThoughtCard.tsx", "app/components/ThoughtFeed.tsx", "app/components/FeedMore.tsx", "ui/garden/paging.mjs"]) assert.equal(fs.existsSync(new URL(file, root)), false, file);
  for (const file of ["app/garden-modules.d.ts", "app/site.config.ts", "app/lib/content.ts", "app/lib/github-content.ts", "app/lib/repository-path.mjs", "app/components/AdminDashboard.tsx", "app/components/AdminUiPanels.tsx", "app/lib/i18n.ts", "app/rss.xml/route.ts", "app/sitemap.ts", "scripts/build-content.mjs", "ui/garden/search-index.mjs", "bin/garden.mjs", "app/globals.css", "app/styles/a2.css", "app/styles/shell.css"]) assert.doesNotMatch(read(file), removed, file);
});

test("new site templates and both handbooks expose only supported writing workflows", () => {
  const walk = (dir) => fs.readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
  for (const file of [...walk("templates/site"), ...walk("docs/handbook")]) if (/\.(?:md|yaml|json|mjs)$/u.test(file)) assert.doesNotMatch(read(file), removed, file);
});

test("generated discovery files and the content module do not publish the removed content family", () => {
  for (const file of ["public/rss.xml", "public/posts.xml", "public/sitemap.xml", "public/search-index.json", ".garden/generated-content.ts"]) assert.doesNotMatch(read(file), /(?:\/thoughts(?:\/|["<])|thoughts\s*[:=]|kind: "thought")/iu, file);
});
