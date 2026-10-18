import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { remarkLinkCard } from "../app/lib/remark-link-card.mjs";
import { collectSiteLinks } from "../scripts/link-assets.mjs";
import { articleLink, configuredSiteAddress, sameSiteMatcher } from "../ui/garden/same-site.mjs";

const projectRoot = path.resolve(new URL("../", import.meta.url).pathname);
const site = sameSiteMatcher("https://blog.example.org");

test("site address comes from site.config url, then SITE_URL", () => {
  assert.equal(configuredSiteAddress({ url: "https://blog.example.org" }, { SITE_URL: "https://other.test" }), "https://blog.example.org");
  assert.equal(configuredSiteAddress({}, { SITE_URL: "https://other.test" }), "https://other.test");
  assert.equal(configuredSiteAddress({}, {}), "");
  // No address configured: nothing counts as the site, every full URL stays external.
  assert.equal(sameSiteMatcher("")("https://blog.example.org/blog/a/"), null);
});

test("a full URL to the site becomes its path", () => {
  assert.equal(site("https://blog.example.org/blog/llm-kv-cache/"), "/blog/llm-kv-cache/");
  assert.equal(site("//blog.example.org/blog/a/"), "/blog/a/");
  assert.equal(site("HTTPS://Blog.Example.org/blog/a/"), "/blog/a/");
});

test("http and https both count as the site", () => {
  assert.equal(site("http://blog.example.org/blog/a/"), "/blog/a/");
  assert.equal(sameSiteMatcher("http://blog.example.org")("https://blog.example.org/x"), "/x");
});

test("the host with and without www both count as the site", () => {
  assert.equal(site("https://www.blog.example.org/blog/a/"), "/blog/a/");
  const www = sameSiteMatcher("https://www.example.org");
  assert.equal(www("https://example.org/blog/a/"), "/blog/a/");
  assert.equal(www("http://www.example.org/blog/a/"), "/blog/a/");
});

test("trailing slashes on the link and on the configured address", () => {
  assert.equal(site("https://blog.example.org"), "/");
  assert.equal(site("https://blog.example.org/"), "/");
  assert.equal(site("https://blog.example.org/blog/a"), "/blog/a");
  assert.equal(site("https://blog.example.org/blog/a/"), "/blog/a/");
  const slashed = sameSiteMatcher("https://blog.example.org/");
  assert.equal(slashed("https://blog.example.org/blog/a/"), "/blog/a/");
  assert.equal(slashed("https://blog.example.org"), "/");
});

test("query and hash are kept", () => {
  assert.equal(site("https://blog.example.org/blog/a/?ref=x#mqa"), "/blog/a/?ref=x#mqa");
  assert.equal(site("https://blog.example.org/#top"), "/#top");
  assert.equal(site("https://blog.example.org/search?q=kv%20cache"), "/search?q=kv%20cache");
});

test("other subdomains, hosts, ports and schemes stay external", () => {
  assert.equal(site("https://docs.blog.example.org/a/"), null);
  assert.equal(site("https://example.org/a/"), null);
  assert.equal(site("https://www2.blog.example.org/a/"), null);
  assert.equal(site("https://blog.example.org.evil.test/a/"), null);
  assert.equal(site("https://blog.example.org:8443/a/"), null);
  assert.equal(site("https://user@blog.example.org/a/"), null);
  assert.equal(site("ftp://blog.example.org/a/"), null);
  assert.equal(site("/blog/a/"), null, "relative links are already internal and are left alone");
  assert.equal(sameSiteMatcher("https://example.org")("https://blog.example.org/a/"), null);
});

test("a base path is kept and links outside it stay external", () => {
  const based = sameSiteMatcher("https://owner.github.io", "/garden/");
  assert.equal(based("https://owner.github.io/garden/blog/a/?x=1#y"), "/garden/blog/a/?x=1#y");
  assert.equal(based("https://owner.github.io/garden"), "/garden");
  assert.equal(based("https://owner.github.io/other-project/"), null);
  assert.equal(based("https://owner.github.io/gardening/"), null);
  // The base path may also be written into the address itself.
  assert.equal(sameSiteMatcher("https://owner.github.io/garden")("https://owner.github.io/garden/a/"), "/garden/a/");
});

test("article links: same-site links open in place, others are external", () => {
  assert.deepEqual(articleLink("https://blog.example.org/blog/a/#h", site), { href: "/blog/a/#h", external: false });
  assert.deepEqual(articleLink("http://www.blog.example.org/", site), { href: "/", external: false });
  assert.deepEqual(articleLink("https://docs.blog.example.org/a/", site), { href: "https://docs.blog.example.org/a/", external: true });
  assert.deepEqual(articleLink("/blog/a/", site), { href: "/blog/a/", external: false });
  assert.deepEqual(articleLink("#top", site), { href: "#top", external: false });
});

function cards(markdown) {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkLinkCard, { sameSite: site });
  const tree = processor.runSync(processor.parse(markdown), { value: markdown });
  const found = [];
  const walk = (node) => {
    if (node.type === "linkCard") found.push(node.data.hProperties.dataUrl);
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);
  return { found, text: JSON.stringify(tree) };
}

test("same-site links never get a link card; the marker is dropped", () => {
  const { found, text } = cards(
    "见 [上一篇](https://blog.example.org/blog/a/){card} 和 [外站](https://docs.blog.example.org/a/){card}。\n\n[独立](http://www.blog.example.org/blog/b/?x=1#y){card}\n",
  );
  assert.deepEqual(found, ["https://docs.blog.example.org/a/"]);
  assert.doesNotMatch(text, /\{card\}/u);
});

test("same-site links are left out of favicons, cards and the allowlist", async () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "garden-same-site-"));
  try {
    fs.mkdirSync(path.join(fixture, "content", "posts"), { recursive: true });
    fs.mkdirSync(path.join(fixture, "public"), { recursive: true });
    const config = fs.readFileSync(path.join(projectRoot, "site.config.yaml"), "utf8");
    fs.writeFileSync(path.join(fixture, "site.config.yaml"), `url: https://blog.example.org/\n${config}`);
    fs.writeFileSync(
      path.join(fixture, "content", "posts", "links.md"),
      `---
title: Links
date: 2026-10-18
description: 站内链接
draft: false
---

见 [上一篇](https://blog.example.org/blog/a/){card}、[旧地址](http://www.blog.example.org/blog/b/#h){card} 和 [外站](https://docs.blog.example.org/a/){card}。
`,
    );
    const links = collectSiteLinks(fixture, {});
    assert.deepEqual([...links.cards], ["https://docs.blog.example.org/a/"]);
    assert.deepEqual([...links.hosts.keys()], ["docs.blog.example.org"]);

    await promisify(execFile)(process.execPath, [path.join(projectRoot, "scripts", "build-content.mjs")], {
      cwd: projectRoot,
      env: { ...process.env, GARDEN_SITE: fixture, CONTENT_INCLUDE_DRAFTS: "0", SITE_URL: "https://ignored.test" },
    });
    const allowlist = JSON.parse(fs.readFileSync(path.join(fixture, "public", "link-allowlist.json"), "utf8"));
    assert.deepEqual(allowlist.urls, ["https://docs.blog.example.org/a/"]);
    const siteConfig = fs.readFileSync(path.join(fixture, ".garden", "site-config.ts"), "utf8");
    assert.match(siteConfig, /export const siteLinks = \{"address":"https:\/\/blog\.example\.org\/","basePath":""\}/u);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("in-article links to other pages of the site go through the framework Link", async () => {
  const { clientRoute } = await import("../ui/garden/same-site.mjs");
  assert.equal(clientRoute("/blog/ai-agent/ai-agent-react-vs-workflow/"), "/blog/ai-agent/ai-agent-react-vs-workflow/");
  assert.equal(clientRoute("/blog/claude-code-source/#2-prompt"), "/blog/claude-code-source/#2-prompt");
  assert.equal(clientRoute("/blog/?t=Prompt"), "/blog/?t=Prompt");
  assert.equal(clientRoute("/"), "/");
  // Files, folders of static files, hashes, other hosts: plain anchors.
  for (const href of ["/posts.xml", "/files/report.pdf", "/images/a.png", "/media/clip", "/assets/x", "/api/admin", "#section", "//cdn.example.com/x", "https://example.com/", "mailto:a@b.c", "notes/x", "", undefined]) {
    assert.equal(clientRoute(href), null, String(href));
  }
  // Link adds the base path itself.
  assert.equal(clientRoute("/garden/blog/x/", "/garden"), "/blog/x/");
  assert.equal(clientRoute("/garden", "/garden/"), "/");
  assert.equal(clientRoute("/other/x/", "/garden"), null);
  const fs = await import("node:fs");
  const source = fs.readFileSync(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
  assert.match(source, /^import Link from "next\/link";/mu);
  assert.match(source, /const route = external \|\| domProps\.target \|\| domProps\.download !== undefined \? null : internalRoute\(href\);/u);
  assert.match(source, /<Link href=\{route\} prefetch=\{false\} \{\.\.\.domProps\}>/u);
});
