import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { remarkLinkCard } from "../app/lib/remark-link-card.mjs";
import { CATALOG, GARDEN_NAMES } from "../ui/garden/catalog.mjs";
import { checkGardenMarkdown } from "../ui/garden/check.mjs";
import { cardUrls, stripCardMarkers } from "../ui/garden/markdown-links.mjs";
import { parseGardenBlock, scanFences } from "../ui/garden/parse.mjs";

const parse = (info, body) => parseGardenBlock(info, body);

test("cycle, list and choice are catalog blocks with English names", () => {
  for (const name of ["cycle", "list", "choice"]) {
    assert.ok(GARDEN_NAMES.includes(name), name);
    assert.ok(CATALOG[name].example.startsWith(`\`\`\`garden ${name}`), `${name} example`);
    const [fence] = scanFences(CATALOG[name].example);
    const block = parse(`garden ${name}`, fence.body);
    assert.equal(block.error, undefined, `${name}: ${block.error?.message}`);
  }
});

test("cycle keeps items, accent and dashed links", () => {
  const block = parse("garden cycle", "items:\n  - title: A\n    text: a\n  - title: B\n    accent: true\nlinks:\n  - from: 2\n    to: 1\ncaption: loop");
  assert.equal(block.error, undefined);
  assert.equal(block.props.items[1].accent, true);
  assert.deepEqual(block.props.links, [{ from: 2, to: 1 }]);
  assert.match(parse("garden cycle", "items: []\narrows: 1").error.message, /arrows/u);
});

test("list rows and list steps share one block", () => {
  assert.equal(parse("garden list", "items:\n  - icon: search\n    text: 搜索").error, undefined);
  const steps = parse("garden list", "items:\n  - icon: flask\n    title: 实验一\n    text:\n      - 第一段\n      - 第二段");
  assert.equal(steps.error, undefined);
  assert.equal(steps.props.items[0].text.length, 2);
});

test("choice options carry icon, value, text, label and reply", () => {
  const block = parse("garden choice", "title: 选哪个？\nitems:\n  - icon: shield\n    value: ¥1\n    text: a\n    label: 可靠\n    reply: 好\ncaption: 示意");
  assert.equal(block.error, undefined);
  assert.equal(block.props.items[0].reply, "好");
});

test("compare accepts a good/bad verdict per item; card accepts a list of cards with takeaways", () => {
  assert.ok(CATALOG.compare.itemKeys.includes("verdict"));
  const verdicts = parse("garden compare", "items:\n  - title: 不好\n    verdict: bad\n    text: x\n  - title: 更好\n    verdict: good\n    text: y");
  assert.equal(verdicts.error, undefined);
  const cards = parse("garden card", "cards:\n  - url: https://example.com/\n    title: Example\n    takeaway: \"**可借鉴：** y\"\n    source:\n      - https://example.com/\n      - https://example.org/");
  assert.equal(cards.error, undefined);
  assert.equal(cards.props.cards[0].source.length, 2);
});

test("the checker accepts the showcase post as written", () => {
  for (const file of ["../content/posts/interface-patterns.md", "../content/posts/interface-patterns-en.md"]) {
    const markdown = readFileSync(new URL(file, import.meta.url), "utf8");
    const problems = checkGardenMarkdown(markdown);
    const list = Array.isArray(problems) ? problems : problems?.problems ?? problems?.issues ?? [];
    assert.deepEqual(list.filter((item) => item.level !== "warning"), [], file);
  }
});

function chips(markdown) {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkLinkCard);
  const tree = processor.runSync(processor.parse(markdown), { value: markdown });
  const found = [];
  const walk = (node) => {
    if (node.type === "link") found.push({ url: node.url, chip: node.data?.hProperties?.dataSource === "true" });
    if (node.type === "text" && node.value.includes("{source}")) found.push({ leftover: node.value });
    (node.children ?? []).forEach(walk);
  };
  walk(tree);
  return found;
}

test("[site](url){source} draws an inline source chip and leaves no marker behind", () => {
  assert.deepEqual(chips("研究指出。[research.google](https://research.google/pubs/x){source} 后面"), [{ url: "https://research.google/pubs/x", chip: true }]);
  assert.deepEqual(chips("普通 [链接](https://example.com/) 不变"), [{ url: "https://example.com/", chip: false }]);
  assert.deepEqual(chips("`[a](https://e.com/){source}`"), []);
  assert.equal(stripCardMarkers("见 [e.com](https://e.com/){source}。"), "见 [e.com](https://e.com/)。");
  assert.deepEqual(cardUrls("[e.com](https://e.com/){source}"), []);
});

test("verdict compares stack, so the side-by-side length limit does not apply", () => {
  const long = "x".repeat(90);
  const verdict = checkGardenMarkdown(`\`\`\`garden compare\nitems:\n  - title: a\n    verdict: bad\n    text: ${long}\n\`\`\`\n`);
  assert.equal(verdict.filter((item) => item.code === "compare-long").length, 0);
  const plain = checkGardenMarkdown(`\`\`\`garden compare\nitems:\n  - title: a\n    text: ${long}\n\`\`\`\n`);
  assert.equal(plain.filter((item) => item.code === "compare-long").length, 1);
});
