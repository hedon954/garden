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
import { crossing, placeLabels, relationEdges, relationHeights, relationLayout, relationLines } from "../ui/garden/relations.mjs";

const parse = (info, body) => parseGardenBlock(info, body);

test("relations, list and choice are catalog blocks with English names; cycle is gone", () => {
  assert.equal(GARDEN_NAMES.includes("cycle"), false);
  assert.equal(CATALOG.cycle, undefined);
  for (const name of ["relations", "list", "choice"]) {
    assert.ok(GARDEN_NAMES.includes(name), name);
    assert.ok(CATALOG[name].example.startsWith(`\`\`\`garden ${name}`), `${name} example`);
    const [fence] = scanFences(CATALOG[name].example);
    const block = parse(`garden ${name}`, fence.body);
    assert.equal(block.error, undefined, `${name}: ${block.error?.message}`);
  }
});

test("relations keep items and links; nodes have no emphasis", () => {
  const block = parse("garden relations", "items:\n  - title: A\n    text: a\n  - title: B\n  - title: C\nlinks:\n  - from: 2\n    to: 1\n    style: dashed\n    direction: both\n    label: feeds\ncaption: c");
  assert.equal(block.error, undefined);
  assert.deepEqual(block.props.links, [{ from: 2, to: 1, style: "dashed", direction: "both", label: "feeds" }]);
  assert.deepEqual(CATALOG.relations.itemKeys, ["title", "text"]);
  assert.deepEqual(CATALOG.relations.linkKeys, ["from", "to", "style", "direction", "label"]);
  assert.equal(CATALOG.relations.keys.includes("loop"), false);
  assert.match(parse("garden relations", "items: []\nloop: true").error.message, /loop/u);
  const css = readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /is-accent|g-cycle/u);
});

test("relations links are checked: targets, style, direction, keys", () => {
  const three = "items:\n  - title: A\n  - title: B\n  - title: C\nlinks:\n";
  const bad = {
    "  - from: 1\n    to: 9": /from\/to/u,
    "  - from: 1\n    to: 1": /同一个/u,
    "  - from: 1\n    to: 2\n    style: dotted": /style/u,
    "  - from: 1\n    to: 2\n    direction: back": /direction/u,
    "  - from: 1\n    to: 2\n    weight: 2": /weight/u,
  };
  for (const [links, message] of Object.entries(bad)) {
    const block = parse("garden relations", three + links);
    assert.equal(block.error?.code, "garden-relations", links);
    assert.match(block.error.message, message);
  }
  assert.equal(parse("garden relations", `${three}  - from: A\n    to: C`).error, undefined, "titles work as ends");
});

test("relations: spots sit on a circle, edges resolve, narrow lines list outgoing edges", () => {
  for (const n of [3, 4, 5, 6]) {
    const { spots, ring } = relationLayout(n);
    assert.equal(spots.length, n);
    assert.deepEqual(ring, [...Array(n).keys()], "author order around the ring");
    assert.ok(Math.abs(spots[0].x - 50) < 1e-9 && spots[0].s === -1, "first node on top");
    for (const spot of spots) {
      const rx = 50 - spot.w / 2 - 1;
      const c = (spot.x - 50) / rx;
      assert.ok(Math.abs(c * c + spot.s * spot.s - 1) < 1e-9, "on the ellipse");
      assert.ok(spot.x - spot.w / 2 >= 0 && spot.x + spot.w / 2 <= 100, "inside the ring");
    }
  }
  const titles = ["选书", "共读", "讨论", "复盘"];
  const edges = relationEdges({ links: [{ from: 1, to: 2 }, { from: 1, to: "复盘", style: "dashed" }, { from: 3, to: 2, direction: "both", label: "影响" }, { from: 9, to: 1 }] }, titles);
  assert.equal(edges.length, 3);
  const lines = relationLines(edges, titles);
  assert.deepEqual(lines[0].map((l) => `${l.mark} ${l.to}`), ["→ 共读", "⇢ 复盘"]);
  assert.deepEqual(lines[1].map((l) => `${l.mark} ${l.to} ${l.label}`), ["↔ 讨论 影响"]);
  assert.deepEqual(lines[2].map((l) => `${l.mark} ${l.to}`), ["↔ 共读"]);
  assert.deepEqual(lines[3], []);
});

test("showcase posts use relations with an explicit loop and a hub", () => {
  for (const file of ["interface-patterns.md", "interface-patterns-en.md"]) {
    const md = readFileSync(new URL(`../content/posts/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(md, /garden cycle/u);
    assert.equal(md.match(/```garden relations/gu).length, 2);
    assert.match(md, /  - from: 4\n    to: 1\n/u);
    assert.match(md, /direction: both/u);
  }
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

test("choice takes an optional none option with label and reply", () => {
  const block = parse("garden choice", "items:\n  - value: A\n  - value: B\nnone:\n  label: 都不合适\n  reply: 好的");
  assert.equal(block.error, undefined);
  assert.deepEqual(block.props.none, { label: "都不合适", reply: "好的" });
  for (const file of ["interface-patterns.md", "interface-patterns-en.md"]) {
    assert.match(readFileSync(new URL(`../content/posts/${file}`, import.meta.url), "utf8"), /\nnone:\n  label: /u);
  }
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

test("relations accept 3 to 6 elements and point to mermaid outside that", () => {
  const items = (n) => `items:\n${Array.from({ length: n }, (_, i) => `  - title: S${i + 1}`).join("\n")}`;
  for (const n of [3, 4, 5, 6]) {
    const block = parse("garden relations", `${items(n)}\nlinks:\n  - from: 1\n    to: ${n}`);
    assert.equal(block.error, undefined, `n=${n}`);
    assert.equal(block.props.items.length, n);
  }
  for (const n of [0, 1, 2, 7, 8]) {
    const block = parse("garden relations", items(n) || "items: []");
    assert.equal(block.error?.code, "garden-relations", `n=${n}`);
    assert.match(block.error.message, /mermaid/u);
  }
  const diagnostics = checkGardenMarkdown(`\`\`\`garden relations\n${items(8)}\n\`\`\`\n`);
  assert.equal(diagnostics.find((d) => d.code === "garden-relations")?.severity, "error");
  assert.equal(checkGardenMarkdown("```garden cycle\nitems: []\n```\n")[0]?.code, "garden-name");
});

test("relations center: that node in the middle, the rest evenly on the ring", () => {
  const { spots, ring, outer, centre } = relationLayout(5, 0);
  assert.equal(centre, 0);
  assert.deepEqual(spots[0], { x: 50, s: 0, w: 22, ring: -1 });
  assert.deepEqual(ring, [1, 2, 3, 4]);
  assert.equal(outer, 4);
  assert.equal(spots[1].s, -1, "first outer node on top");
  assert.equal(parse("garden relations", "items:\n  - title: A\n  - title: B\n  - title: C\ncenter: B").error, undefined);
  assert.equal(parse("garden relations", "items:\n  - title: A\n  - title: B\n  - title: C\ncenter: 2").error, undefined);
  assert.match(parse("garden relations", "items:\n  - title: A\n  - title: B\n  - title: C\ncenter: Z").error.message, /center/u);
  assert.equal(relationLayout(3, -1).centre, -1, "no auto-detect");
  for (const file of ["interface-patterns.md", "interface-patterns-en.md"]) {
    const md = readFileSync(new URL(`../content/posts/${file}`, import.meta.url), "utf8");
    assert.match(md, /\ncenter: (组织者|Organiser)\n/u);
  }
});

test("relations canvas height follows the nodes; columns keep apart", () => {
  const three = relationLayout(3).spots;
  const { ys, height } = relationHeights(three, [80, 80, 80], 48);
  assert.ok(Math.abs(ys[0] - 40) < 1e-9, "top node touches the top");
  assert.ok(Math.abs(height - Math.max(...ys.map((y) => y + 40))) < 1e-9, "no slack below the lowest node");
  assert.ok(height < 360, `3 nodes need less than the old fixed 360px (got ${height})`);
  const six = relationLayout(6).spots;
  const laid = relationHeights(six, Array(6).fill(90), 48);
  for (let i = 0; i < 6; i += 1) for (let j = i + 1; j < 6; j += 1) {
    const sameColumn = Math.abs(six[i].x - six[j].x) < six[i].w;
    if (sameColumn) assert.ok(Math.abs(laid.ys[i] - laid.ys[j]) >= 90 + 48 - 1e-6, `${i} ${j}`);
  }
  const hub = relationLayout(5, 0).spots;
  const hubLaid = relationHeights(hub, Array(5).fill(90), 48);
  assert.ok(Math.abs(hubLaid.ys[0] - hubLaid.ys[1]) >= 138 - 1e-6, "centre clears the top node");
});

test("relations labels sit at the midpoint unless a crossing is near, then slide away", () => {
  const line = (a, b, label) => ({ a, b, label, at: (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }) });
  assert.deepEqual(crossing({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }), { x: 5, y: 5 });
  assert.equal(crossing({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }), null);
  const alone = placeLabels([line({ x: 0, y: 0 }, { x: 200, y: 0 }, "a")]);
  assert.deepEqual(alone[0], { x: 100, y: 0 });
  const crossed = placeLabels([line({ x: 0, y: 100 }, { x: 400, y: 100 }, "h"), line({ x: 200, y: 0 }, { x: 200, y: 200 }, "v")]);
  for (const p of crossed) assert.ok(Math.hypot(p.x - 200, p.y - 100) >= 34, JSON.stringify(p));
  assert.ok(Math.hypot(crossed[0].x - crossed[1].x, crossed[0].y - crossed[1].y) >= 34, "labels keep apart");
  assert.equal(placeLabels([line({ x: 0, y: 0 }, { x: 1, y: 1 }, "")])[0], null);
});
