import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { remarkLinkCard } from "../app/lib/remark-link-card.mjs";
import { FEATURE_FIELDS } from "../ui/compose/features.mjs";
import { CATALOG, GARDEN_NAMES } from "../ui/garden/catalog.mjs";
import { checkGardenMarkdown } from "../ui/garden/check.mjs";
import { cardUrls, stripCardMarkers } from "../ui/garden/markdown-links.mjs";
import { parseGardenBlock, scanFences } from "../ui/garden/parse.mjs";
import { circled, crossing, labelFits, legendLine, placeLabels, RELATION_COMPACT_WIDTH, RELATION_LABEL_FONT_MIN, RELATION_NODE_FONT_MIN, relationEdges, relationHeights, relationLayout, relationLines } from "../ui/garden/relations.mjs";

const scene = body => {
  const block = parseGardenBlock("garden compose", body);
  const node = block.props?.nodes?.find(node => node.type === "feature");
  return node ? {...block, props:node.props} : block;
};
const entities = n => Array.from({length:n}, (_,i)=>`<entity title="S${i+1}"/>`).join("");

test("Compose alone is public; semantic families are first-class children", () => {
  assert.deepEqual(GARDEN_NAMES, ["compose"]);
  assert.deepEqual(Object.keys(CATALOG), ["compose"]);
  for (const body of ['<relations><entity title="A"/><entity title="B"/><entity title="C"/></relations>', '<icon-list><entry icon="book" title="A"/></icon-list>', '<choices><choice-option label="A"/></choices>']) assert.equal(scene(body).error, undefined);
  const css = readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.g-figure|\.g-explore|data-name="figure"/u);
});

test("relations keep items and links; nodes have no emphasis", () => {
  const body = '<entity title="A"><text>a</text></entity><entity title="B"/><entity title="C"/>';
  const block = scene(`<relations caption="c">${body}<edge from={2} to={1} style="dashed" direction="both" label="feeds"/></relations>`);
  assert.equal(block.error, undefined);
  assert.deepEqual(block.props.links, [{from:2,to:1,style:"dashed",direction:"both",label:"feeds"}]);
  assert.deepEqual(FEATURE_FIELDS.entity, ["id","title","text"]);
  assert.deepEqual(FEATURE_FIELDS.edge, ["from","to","style","direction","label"]);
  assert.match(scene(`<relations loop="true">${body}</relations>`).error.message, /loop/u);
  const css = readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /is-accent|g-cycle/u);
});

test("relations links are checked: targets, style, direction, keys", () => {
  const body='<entity title="A"/><entity title="B"/><entity title="C"/>';
  const bad={'from={1} to={9}':/from\/to/u,'from={1} to={1}':/不同/u,'from={1} to={2} style="dotted"':/style/u,'from={1} to={2} direction="back"':/direction/u,'from={1} to={2} weight={2}':/weight/u};
  for(const [attrs,message] of Object.entries(bad)) {
    const block=scene(`<relations>${body}<edge ${attrs}/></relations>`);
    assert.equal(block.error?.code,"compose-invalid", attrs);
    assert.match(block.error.message,message);
  }
  assert.equal(scene(`<relations>${body}<edge from="A" to="C"/></relations>`).error, undefined);
});

test("relations: spots sit on a circle, edges resolve, screen-reader lines list outgoing edges", () => {
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

test("showcase posts preserve the explicit relation loop and hub", () => {
  for (const file of ["interface-patterns.md", "interface-patterns-en.md"]) {
    const md=readFileSync(new URL(`../content/posts/${file}`,import.meta.url),"utf8");
    assert.equal((md.match(/<relations[ >]/gu)??[]).length,2);
    assert.match(md, /<edge from=\{4\} to=\{1\}/u);
    assert.match(md, /direction="both"/u);
  }
});

test("icon-list preserves simple rows and full multi-paragraph entries", () => {
  assert.equal(scene('<icon-list><entry icon="search"><text>搜索</text></entry></icon-list>').error,undefined);
  const block=scene('<icon-list><entry icon="flask" title="实验一"><text>第一段</text><text>第二段</text></entry></icon-list>');
  assert.equal(block.error,undefined);
  assert.deepEqual(block.props.items[0].text,["第一段","第二段"]);
});

test("choice options carry icon, value, text, label and reply", () => {
  const block=scene('<choices title="选哪个？" caption="示意"><choice-option icon="shield" value="¥1" label="可靠" reply="好"><text>a</text></choice-option></choices>');
  assert.equal(block.error,undefined);
  assert.deepEqual(block.props.items[0],{icon:"shield",value:"¥1",label:"可靠",reply:"好",text:"a"});
});

test("choice takes an optional none option with label and reply", () => {
  const block=scene('<choices><choice-option value="A"/><choice-option value="B"/><choice-option none label="都不合适" reply="好的"/></choices>');
  assert.equal(block.error,undefined);
  assert.deepEqual(block.props.none,{label:"都不合适",reply:"好的"});
  for(const file of ["interface-patterns.md","interface-patterns-en.md"]) assert.match(readFileSync(new URL(`../content/posts/${file}`,import.meta.url),"utf8"), /<choice-option none label=/u);
});

test("compare preserves good/bad verdicts; resource groups preserve takeaways and sources", () => {
  const verdicts=scene('<compare><item verdict="bad"><title>不好</title><text>x</text></item><item verdict="good"><title>更好</title><text>y</text></item></compare>');
  assert.equal(verdicts.error,undefined);
  assert.deepEqual(verdicts.props.items.map(i=>i.verdict),["bad","good"]);
  const cards=scene('<resources><resource href="https://example.com/" title="Example" takeaway="**可借鉴：** y"><reference href="https://example.com/"/><reference href="https://example.org/"/></resource></resources>');
  assert.equal(cards.error,undefined);
  assert.equal(cards.props.cards[0].source.length,2);
  assert.equal(cards.props.cards[0].takeaway,"**可借鉴：** y");
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

test("verdict compares stack, while long side-by-side comparisons keep the prose warning", () => {
  const long="x".repeat(90);
  const check=body=>checkGardenMarkdown('```garden compose\n'+body+'\n```\n');
  const verdict=check(`<compare><item verdict="bad"><title>a</title><text>${long}</text></item><item verdict="good"><title>b</title><text>Short</text></item></compare>`);
  assert.equal(verdict.filter(i=>i.code==="compare-long").length,0);
  const plain=check(`<compare><item><title>a</title><text>${long}</text></item><item><title>b</title><text>Short</text></item></compare>`);
  assert.equal(plain.filter(i=>i.code==="compare-long").length,1);
  const other=scene(`<compare><item verdict="maybe"><text>${long}</text></item><item><text>Short</text></item></compare>`);
  assert.equal(other.error?.code,"compose-invalid");
  assert.match(other.error.message,/verdict/u);
});

test("relations accept 3 to 6 elements and point to mermaid outside that", () => {
  for(const n of [3,4,5,6]) {
    const block=scene(`<relations>${entities(n)}<edge from={1} to={${n}}/></relations>`);
    assert.equal(block.error,undefined,`n=${n}`);
    assert.equal(block.props.items.length,n);
  }
  for(const n of [0,1,2,7,8]) {
    const body=`<relations>${entities(n)}</relations>`;
    const block=scene(body);
    assert.equal(block.error?.code,"compose-invalid",`n=${n}`);
    assert.match(block.error.message,/mermaid/u);
    assert.equal(checkGardenMarkdown('```garden compose\n'+body+'\n```\n')[0]?.severity,"error");
  }
});

test("relations center: that node in the middle, the rest evenly on the ring", () => {
  const { spots, ring, outer, centre } = relationLayout(5, 0);
  assert.equal(centre, 0);
  assert.deepEqual(spots[0], { x: 50, s: 0, w: 24, ring: -1 });
  assert.equal(relationLayout(5, 0, true).spots[0].w, 22, "narrow hub: a narrower middle node keeps every spoke visible");
  assert.deepEqual(ring, [1, 2, 3, 4]);
  assert.equal(outer, 4);
  assert.equal(spots[1].s, -1, "first outer node on top");
  assert.equal(scene(`<relations center="S2">${entities(3)}</relations>`).error, undefined);
  assert.equal(scene(`<relations center={2}>${entities(3)}</relations>`).error, undefined);
  assert.match(scene(`<relations center="Z">${entities(3)}</relations>`).error.message, /center/u);
  assert.equal(relationLayout(3, -1).centre, -1, "no auto-detect");
  for (const file of ["interface-patterns.md", "interface-patterns-en.md"]) {
    const md = readFileSync(new URL(`../content/posts/${file}`, import.meta.url), "utf8");
    assert.match(md, /center="(组织者|Organiser)"/u);
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

test("relations narrow screens keep the graph: same layout scaled, no card-list fallback", () => {
  const css = readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  const rel = css.slice(css.indexOf("/* relations:"), css.indexOf("/* list: compact icon rows"));
  assert.doesNotMatch(rel, /@container[^{]*\{[^}]*\.g-rel/u, "no container query that swaps the layout");
  assert.doesNotMatch(rel, /\.g-rel-node \{[^}]*position: static/u, "nodes never fall back to a static list");
  assert.doesNotMatch(rel, /overflow-x: (auto|scroll)/u, "never scroll sideways");
  assert.match(rel, /-webkit-line-clamp: 2/u, "titles clamp to two lines");
  const px = (re) => Number(re.exec(rel)?.[1]);
  assert.ok(px(/\.g-rel\[data-compact\] \.g-rel-t \{[^}]*font-size: ([\d.]+)px/u) >= RELATION_NODE_FONT_MIN, "node text >= 13px");
  assert.ok(px(/\.g-rel-label \{[^}]*font: 500 ([\d.]+)px/u) >= RELATION_LABEL_FONT_MIN, "edge labels >= 12px");
  assert.ok(RELATION_NODE_FONT_MIN >= 13 && RELATION_LABEL_FONT_MIN >= 12);
  // Six nodes fit across ~350px: every compact spot stays inside the ring, columns keep apart.
  for (const n of [3, 4, 5, 6]) for (const centre of [-1, 0]) {
    const { spots } = relationLayout(n, centre, true);
    for (const spot of spots) assert.ok(spot.x - spot.w / 2 >= 0 && spot.x + spot.w / 2 <= 100, `n=${n} c=${centre}`);
    const width = 326;
    const outer = spots.filter((s) => s.ring >= 0);
    for (const spot of outer) assert.ok((spot.w / 100) * width >= 80, "a node keeps room for a two-line title");
  }
  assert.equal(RELATION_COMPACT_WIDTH, 560);
  const docs = ["docs/handbook/reference/compose.md", "docs/handbook/en/reference/compose.md", "ui/prompt/rules.md"].map((f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8"));
  for (const doc of docs) assert.doesNotMatch(doc, /单列卡片|卡片下方的关系行|cards stack|card's relation line/u);
});

test("relations labels that do not fit become circled numbers with a legend", () => {
  assert.equal(circled(0), "①");
  assert.equal(circled(2), "③");
  const a = { x: 0, y: 100 };
  const b = { x: 300, y: 100 };
  const mid = { x: 150, y: 100 };
  assert.equal(labelFits({ width: 60, height: 20 }, a, b, mid, []), true);
  assert.equal(labelFits({ width: 290, height: 20 }, a, b, mid, []), false, "too long for the line");
  assert.equal(labelFits({ width: 60, height: 20 }, a, b, mid, [{ x: 140, y: 95, w: 40, h: 40 }]), false, "would sit on a node");
  const vertical = labelFits({ width: 120, height: 20 }, { x: 0, y: 0 }, { x: 0, y: 70 }, { x: 0, y: 35 }, []);
  assert.equal(vertical, true, "a vertical line only needs the label's height");
  const titles = ["预算", "场地", "人数"];
  assert.equal(legendLine(0, { from: 0, to: 1, both: false, label: "限制" }, titles, "zh"), "① 限制：预算 → 场地");
  assert.equal(legendLine(1, { from: 2, to: 1, both: true, label: "constrain each other" }, ["Budget", "Venue", "Headcount"], "en"), "② constrain each other: Headcount ↔ Venue");
});

test("relations: Esc closes the details panel and returns focus to the node that opened it", async () => {
  const { relationKeyAction } = await import("../ui/garden/relations.mjs");
  assert.deepEqual(relationKeyAction("Escape", 2), { close: true, focus: 2 });
  assert.deepEqual(relationKeyAction("Escape", 0), { close: true, focus: 0 });
  assert.deepEqual(relationKeyAction("Escape", null), { close: false, focus: null }, "nothing open: Esc is left alone");
  assert.deepEqual(relationKeyAction("Enter", 1), { close: false, focus: null });
  const src = readFileSync(new URL("../app/components/garden/patterns.tsx", import.meta.url), "utf8");
  const fig = src.slice(src.indexOf('className="g-rel"'), src.indexOf('className="g-rel-ring"'));
  assert.match(fig, /onKeyDown=/u, "the graph listens for keys");
  assert.match(fig, /relationKeyAction\(event\.key, open\)/u);
  assert.match(fig, /setOpen\(null\)/u);
  assert.match(fig, /\.g-rel-node"\)\[action\.focus\]\?\.focus\(\)/u, "focus goes back to the opener node");
});

{
  const { relationLayout: layout, relationHeights: heights, edgePoint, placeMarks, BADGE_SIZE } = await import("../ui/garden/relations.mjs");
  // FD's long-title matrix: 3..6 nodes, ring and centre, at 390 (ring 324px) and 1440 (ring 690px).
  const cases = [];
  for (const centre of [-1, 0]) for (const n of [3, 4, 5, 6]) for (const [screen, width, nodeH] of [[390, 324, 54], [1440, 690, 120]]) cases.push({ centre, n, screen, width, nodeH });
  const overlap = (r, s) => r.x < s.x + s.w && r.x + r.w > s.x && r.y < s.y + s.h && r.y + r.h > s.y;
  for (const { centre, n, screen, width, nodeH } of cases) {
    test(`relations marks never overlap a node or each other: ${n} nodes, ${centre >= 0 ? "centre" : "ring"}, ${screen}px, long titles`, () => {
      const compact = screen < 560;
      const { spots } = layout(n, centre, compact);
      const minRy = compact ? Math.max(90, width * 0.26) : Math.min(200, Math.max(120, width * 0.2)) * (centre >= 0 ? 1.25 : 1);
      const { ys, height } = heights(spots, spots.map(() => nodeH), compact ? 40 : 48, minRy);
      const boxes = spots.map((s, i) => ({ x: (s.x / 100) * width - (s.w / 200) * width, y: ys[i] - nodeH / 2, w: (s.w / 100) * width, h: nodeH }));
      const mid = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
      // Same links as FD's sheet: ring neighbours or spokes, plus one dashed both-way extra (a repeated pair when n = 3).
      const pairs = centre < 0 ? Array.from({ length: n }, (_, i) => [i, (i + 1) % n]) : Array.from({ length: n - 1 }, (_, i) => [0, i + 1]);
      pairs.push(n > 3 ? [1, n - 1] : [2, 0]);
      const marks = pairs.map(([f, t]) => {
        const a = edgePoint(boxes[f], mid(boxes[t]), 6);
        const b = edgePoint(boxes[t], mid(boxes[f]), 10);
        // Long labels: all become numbers.
        return { a, b, at: (k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }), w: 220, h: 20, badge: true };
      });
      const placed = placeMarks(marks, boxes, { w: width, h: height });
      const rects = placed.map((p) => ({ x: p.x - BADGE_SIZE / 2, y: p.y - BADGE_SIZE / 2, w: BADGE_SIZE, h: BADGE_SIZE }));
      rects.forEach((r, i) => {
        boxes.forEach((b, k) => assert.equal(overlap(r, b), false, `number ${i + 1} overlaps node ${k + 1}`));
        rects.forEach((s, j) => { if (j > i) assert.equal(overlap(r, s), false, `numbers ${i + 1} and ${j + 1} overlap`); });
        assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= width && r.y + r.h <= height, "inside the graph");
      });
    });
  }
}

test("relations: two links between the same pair keep their labels apart", async () => {
  const { placeMarks } = await import("../ui/garden/relations.mjs");
  const boxes = [{ x: 0, y: 80, w: 100, h: 40 }, { x: 400, y: 80, w: 100, h: 40 }];
  const line = (a, b) => ({ a, b, at: (k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }), w: 60, h: 20 });
  const [p, q] = placeMarks([line({ x: 106, y: 100 }, { x: 390, y: 100 }), line({ x: 394, y: 100 }, { x: 110, y: 100 })], boxes, { w: 500, h: 200 });
  assert.ok(Math.abs(p.x - q.x) >= 60 || Math.abs(p.y - q.y) >= 20, "labels do not sit on top of each other");
  assert.equal(p.badge || q.badge, false, "both still fit as text");
});
