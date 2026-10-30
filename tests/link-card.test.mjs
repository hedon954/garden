import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { remarkLinkCard } from "../app/lib/remark-link-card.mjs";
import { cardUrls, markdownLinks, stripCardMarkers } from "../ui/garden/markdown-links.mjs";
import { contentForDistribution, contentForFeed, contentToSearchText } from "../ui/core/transform.mjs";
import { linkAssetsForRender, readLinkCache, refreshLinkAssets } from "../scripts/link-assets.mjs";

/** Run the card plugin and return the tree as a compact outline. */
function outline(markdown) {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkLinkCard);
  const file = { value: markdown };
  const tree = processor.runSync(processor.parse(markdown), file);
  const show = (node) => {
    if (node.type === "linkCard") {
      const p = node.data.hProperties;
      return `card(${p.dataUrl}${p.dataStandalone ? ",standalone" : ""}|${p.dataText})`;
    }
    if (node.type === "text") return JSON.stringify(node.value);
    if (node.type === "inlineCode") return `code(${node.value})`;
    if (node.type === "link") return `link(${node.url})`;
    return `${node.type}[${(node.children ?? []).map(show).join(" ")}]`;
  };
  return tree.children.map(show);
}

test("a link alone on its line becomes the card, in that spot, with no inline link", () => {
  assert.deepEqual(outline("Before.\n\n[KaTeX 支持的函数](https://katex.org/docs/supported.html){card}\n\nAfter."), [
    'paragraph["Before."]',
    "card(https://katex.org/docs/supported.html,standalone|KaTeX 支持的函数)",
    'paragraph["After."]',
  ]);
  // Trailing spaces around the line do not matter.
  assert.deepEqual(outline("  [x](https://x.dev/){card}  "), ["card(https://x.dev/,standalone|x)"]);
});

test("a link inside a sentence stays, and its card follows the paragraph", () => {
  assert.deepEqual(outline("See [remark-gfm](https://github.com/remarkjs/remark-gfm){card} for tables.\n\nNext."), [
    'paragraph["See " link(https://github.com/remarkjs/remark-gfm) " for tables."]',
    "card(https://github.com/remarkjs/remark-gfm|remark-gfm)",
    'paragraph["Next."]',
  ]);
  // Two marked links: both stay, both cards follow in order.
  assert.deepEqual(outline("[a](https://a.dev/){card} and [b](https://b.dev/){card}"), [
    'paragraph[link(https://a.dev/) " and " link(https://b.dev/)]',
    "card(https://a.dev/|a)",
    "card(https://b.dev/|b)",
  ]);
});

test("inside a list item the card stays in that item", () => {
  assert.deepEqual(outline("- read [a](https://a.dev/){card} first\n- [b](https://b.dev/){card}\n- plain"), [
    'list[listItem[paragraph["read " link(https://a.dev/) " first"] card(https://a.dev/|a)] listItem[card(https://b.dev/,standalone|b)] listItem[paragraph["plain"]]]',
  ]);
});

test("{card} only counts straight after the link's closing parenthesis", () => {
  assert.deepEqual(outline("[a](https://a.dev/) {card}"), ['paragraph[link(https://a.dev/) " {card}"]']);
  assert.deepEqual(outline("{card} [a](https://a.dev/)"), ['paragraph["{card} " link(https://a.dev/)]']);
  assert.deepEqual(outline("<https://a.dev/>{card}"), ['paragraph[link(https://a.dev/) "{card}"]']);
  assert.deepEqual(outline("[local](/blog/x){card}"), ['paragraph[link(/blog/x) "{card}"]']);
});

test("{card} in code stays literal", () => {
  assert.deepEqual(outline("Write `[a](https://a.dev/){card}` like this."), [
    'paragraph["Write " code([a](https://a.dev/){card}) " like this."]',
  ]);
  assert.deepEqual(outline("```md\n[a](https://a.dev/){card}\n```"), ["code[]"]);
});

test("excerpts, RSS and the search index never show the marker", () => {
  const body = [
    "Read [remark-gfm](https://github.com/remarkjs/remark-gfm){card} today.",
    "",
    "[KaTeX](https://katex.org/){card}",
    "",
    "Code: `[a](https://a.dev/){card}`",
    "",
    "```",
    "[b](https://b.dev/){card}",
    "```",
  ].join("\n");
  const stripped = stripCardMarkers(body);
  assert.match(stripped, /\[remark-gfm\]\(https:\/\/github\.com\/remarkjs\/remark-gfm\) today/u);
  assert.match(stripped, /^\[KaTeX\]\(https:\/\/katex\.org\/\)$/mu);
  assert.match(stripped, /`\[a\]\(https:\/\/a\.dev\/\)\{card\}`/u);
  assert.match(stripped, /^\[b\]\(https:\/\/b\.dev\/\)\{card\}$/mu);
  for (const output of [contentToSearchText(body), contentForFeed(body), contentForDistribution(body)]) {
    assert.doesNotMatch(output.replace(/`[^`]*`/gu, "").replace(/```[\s\S]*?```/gu, ""), /\{card\}/u);
  }
  assert.equal(stripCardMarkers("no markers"), "no markers");
  assert.deepEqual(cardUrls(body), ["https://github.com/remarkjs/remark-gfm", "https://katex.org/"]);
  assert.deepEqual(markdownLinks(body).map((link) => link.card), [true, true]);
});

test("standalone URL paragraphs count as cards for the shared OG path", () => {
  const body = [
    "Intro.",
    "",
    "https://bare.dev/alone",
    "",
    "[https://jump.dev/x](https://jump.dev/x)",
    "",
    "See https://inline.dev/nope in a sentence.",
    "",
    "[titled](https://titled.dev/){card}",
  ].join("\n");
  assert.deepEqual(cardUrls(body), [
    "https://jump.dev/x",
    "https://titled.dev/",
    "https://bare.dev/alone",
  ]);
  const links = markdownLinks(body);
  assert.equal(links.find((link) => link.url === "https://inline.dev/nope")?.card, false);
  assert.equal(links.find((link) => link.url === "https://jump.dev/x")?.card, true);
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 9, 9, 9]);

function fakeFetch(routes) {
  return async (url) => {
    const route = routes[url];
    if (!route) throw new TypeError(`fetch failed: ${url}`);
    return new Response(route.body, { status: route.status ?? 200, headers: { "content-type": route.type } });
  };
}

function site(body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "garden-cards-"));
  fs.mkdirSync(path.join(root, "content", "posts"), { recursive: true });
  fs.mkdirSync(path.join(root, "public"), { recursive: true });
  fs.writeFileSync(path.join(root, "content", "posts", "a.md"), `---\ntitle: t\n---\n${body}\n`);
  return root;
}

test("the build copies card details and the og:image into the site", async () => {
  const root = site("[KV](https://hf.co/blog/kv){card}\n\nplain [x](https://x.dev/)");
  const page = `<head><meta property="og:title" content="KV Caching"><meta property="og:description" content="Why it helps.">
<meta property="og:site_name" content="Hugging Face"><meta property="og:image" content="https://cdn.hf.co/kv.png">
<meta property="article:published_time" content="2025-01-30"><meta name="author" content="Not Lain"></head>`;
  const fetch = fakeFetch({
    "https://hf.co/blog/kv": { type: "text/html", body: page },
    "https://cdn.hf.co/kv.png": { type: "image/png", body: PNG },
  });
  const { cardStats } = await refreshLinkAssets({ siteRoot: root, fetch, dnsCheck: false });
  assert.deepEqual(cardStats, { fetched: 1, cached: 0, missing: 0 });
  const card = readLinkCache(root).cards["https://hf.co/blog/kv"];
  assert.equal(card.title, "KV Caching");
  assert.equal(card.siteName, "Hugging Face");
  assert.equal(card.author, "Not Lain");
  assert.equal(card.publishedTime, "2025-01-30");
  assert.match(card.image, /^\/link-assets\/og\/[0-9a-f]{10}-[0-9a-f]{10}\.(png|webp)$/u);
  assert.ok(fs.existsSync(path.join(root, "public", card.image)));
  // Only marked links get cards.
  assert.deepEqual(Object.keys(readLinkCache(root).cards), ["https://hf.co/blog/kv"]);
  // Readers get the local picture, never the remote one.
  const render = linkAssetsForRender(root);
  assert.equal(render.cards["https://hf.co/blog/kv"].image, card.image);
  assert.doesNotMatch(JSON.stringify(render), /cdn\.hf\.co/u);

  // Offline: the cached card and picture stay.
  const { cardStats: offline } = await refreshLinkAssets({ siteRoot: root, fetch: async () => { throw new Error("offline"); }, dnsCheck: false });
  assert.deepEqual(offline, { fetched: 0, cached: 1, missing: 0 });
  assert.deepEqual(readLinkCache(root).cards["https://hf.co/blog/kv"], card);
});

test("a card whose page cannot be read falls back to the link text and site", async () => {
  const root = site("[KV](https://down.dev/kv){card}");
  await refreshLinkAssets({ siteRoot: root, fetch: async () => { throw new Error("offline"); }, dnsCheck: false });
  assert.deepEqual(linkAssetsForRender(root).cards, {});
  const source = fs.readFileSync(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
  assert.match(source, /const title = meta\?\.title \|\| text \|\| href;/u);
  assert.match(source, /meta\?\.siteName \|\| host/u);
});

test("link addresses in angle brackets or with parentheses are read whole, for cards and the link list", () => {
  const md = "见 [Trie](<https://en.wikipedia.org/wiki/Trie_(data_structure)>){card}，[b](https://e.com/a_(b))，[空格](<https://e.com/a b>)，[本地](/blog/x){card}，![图](<https://o.com/a (1).png>)";
  assert.deepEqual(markdownLinks(md), [
    { url: "https://en.wikipedia.org/wiki/Trie_(data_structure)", card: true },
    { url: "https://e.com/a_(b)", card: false },
    { url: "https://e.com/a b", card: false },
  ]);
  assert.deepEqual(cardUrls(md), ["https://en.wikipedia.org/wiki/Trie_(data_structure)"]);
  // The marker goes, the brackets stay; a marker on a site link is not a card and is left alone.
  assert.equal(
    stripCardMarkers(md),
    "见 [Trie](<https://en.wikipedia.org/wiki/Trie_(data_structure)>)，[b](https://e.com/a_(b))，[空格](<https://e.com/a b>)，[本地](/blog/x){card}，![图](<https://o.com/a (1).png>)",
  );
});

test("site brand /og.png is omitted from card image assets", async () => {
  const root = site("[Synctest](https://hedon.top/blog/go/go-lib-synctest/){card}");
  const page = `<head><meta property="og:title" content="Go synctest">
<meta property="og:description" content="Concurrency testing.">
<meta property="og:site_name" content="Hedon Garden">
<meta name="twitter:image" content="https://hedon.top/og.png"></head>`;
  const fetch = fakeFetch({
    "https://hedon.top/blog/go/go-lib-synctest/": { type: "text/html", body: page },
    "https://hedon.top/og.png": { type: "image/png", body: PNG },
  });
  await refreshLinkAssets({ siteRoot: root, fetch, dnsCheck: false });
  const card = readLinkCache(root).cards["https://hedon.top/blog/go/go-lib-synctest/"];
  assert.equal(card.title, "Go synctest");
  assert.equal(card.description, "Concurrency testing.");
  assert.equal(card.image, undefined);
  assert.equal(fs.existsSync(path.join(root, "public", "link-assets", "og")), false);
});
