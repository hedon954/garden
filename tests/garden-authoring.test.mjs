import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkGardenMarkdown } from "../ui/garden/check.mjs";
import { diffToNewCode, protectMathIdentifiers, tableBreakout, tocShift } from "../ui/garden/enhance.mjs";
import { parseGardenBlock, scanFences } from "../ui/garden/parse.mjs";
import { gardenBlocksMarkdown, textReplacementPlist, vscodeSnippets } from "../ui/garden/snippets.mjs";
import { splitTitle, titleLineScale, titleWidthUnits } from "../ui/garden/title.mjs";

test("a title splits into two equal lines at one separator", () => {
  const split = splitTitle("Rust 实战丨手写一个 SpinLock");
  assert.equal(split.split, true);
  assert.deepEqual(split.lines, ["Rust 实战", "手写一个 SpinLock"]);
  assert.equal(split.separator, "丨");
  assert.equal(splitTitle("没有分隔").split, false);
  assert.equal(splitTitle("只有左边丨").issue, "empty");
  assert.equal(splitTitle("丨只有右边").issue, "empty");
  assert.equal(splitTitle("Full | width title").separator, " | ");
  const several = splitTitle("FOSA丨01丨xxx");
  assert.equal(several.split, true);
  assert.equal(several.issue, null);
  assert.deepEqual(several.lines, ["FOSA", "01丨xxx"]);
  assert.deepEqual(splitTitle("甲丨乙｜丙").lines, ["甲", "乙｜丙"]);
});

test("a title with an empty side warns and stays one line", () => {
  const several = checkGardenMarkdown("", { title: "FOSA丨01丨xxx", titleLine: 2 });
  assert.equal(several.some((item) => item.code === "title-split"), false);
  const empty = checkGardenMarkdown("", { title: "只有左边丨", titleLine: 3 });
  assert.deepEqual(empty.map((item) => [item.code, item.severity, item.line]), [["title-split", "warning", 3]]);
  const clean = checkGardenMarkdown("", { title: "Rust 实战丨手写一个 SpinLock" });
  assert.equal(clean.some((item) => item.code === "title-split"), false);
});

test("title width counts CJK as 1 and capitals as 0.68", () => {
  assert.equal(titleWidthUnits("AB"), 1.36);
  assert.equal(titleWidthUnits("甲"), 1);
  assert.equal(Number(titleWidthUnits("a ").toFixed(2)), 0.88);
  const scale = titleLineScale(["Rust 实战", "手写一个 SpinLock"]);
  const widest = Math.max(titleWidthUnits("Rust 实战"), titleWidthUnits("手写一个 SpinLock"));
  assert.equal(scale, Number(widest.toFixed(2)));
});

test("garden fences parse to one node and legacy fences stay errors", () => {
  const markdown = "```garden stat\nlabel: 显存\nvalue: 3.2\n```\n\n```ui\n```\n";
  const fences = scanFences(markdown);
  assert.equal(fences.length, 2);
  const block = parseGardenBlock(fences[0].info, fences[0].body);
  assert.equal(block.name, "stat");
  assert.equal(block.props.value, 3.2);
  const legacy = checkGardenMarkdown(markdown);
  assert.equal(legacy.some((item) => item.code === "legacy-fence"), true);
  assert.match(legacy.find((item) => item.code === "legacy-fence").suggestion, /garden interactive/);
});

test("check reports long compare cells, trivial interactive, orphan diffs and bad names", () => {
  const markdown = [
    "```garden compare",
    "items:",
    "  - title: 甲",
    `    text: ${"字".repeat(61)}`,
    "```",
    "",
    "```diff",
    "-old",
    "+new",
    "```",
    "",
    "```garden car",
    "```",
    "",
    "```garden interactive",
    "---",
    "id: mul",
    "caption: 一次乘法",
    "---",
    "<Let mem={a * b} />",
    "```",
  ].join("\n");
  const codes = checkGardenMarkdown(markdown).map((item) => item.code);
  assert.ok(codes.includes("compare-long"));
  assert.ok(codes.includes("diff-orphan"));
  assert.ok(codes.includes("garden-name"));
  assert.ok(codes.includes("interactive-trivial"));
  const named = checkGardenMarkdown(markdown).find((item) => item.code === "garden-name");
  assert.equal(named.severity, "error");
  assert.match(named.suggestion, /card/);
});

test("multi-letter math identifiers stay whole and real subscripts stay", () => {
  assert.equal(protectMathIdentifiers("group_num + W_q + H_kv"), "\\mathrm{group\\_num} + W_q + H_kv");
});

test("a diff tab copies the new file without markers", () => {
  assert.equal(diffToNewCode(" keep\n-old\n+new\n"), "keep\nnew");
});

test("tables break out only as far as they need, and the TOC slides or hides", () => {
  assert.deepEqual(tableBreakout({
    viewport: 800,
    articleLeft: 200,
    articleRight: 900,
    tableClient: 700,
    tableScroll: 1200,
  }), { left: 0, right: 0 });
  const wide = tableBreakout({
    viewport: 1440,
    articleLeft: 370,
    articleRight: 1070,
    tableClient: 700,
    tableScroll: 900,
  });
  assert.ok(wide.left > 0 && wide.left === wide.right && wide.left <= 300);
  assert.deepEqual(tocShift({ tocLeft: 40, tocWidth: 200, viewport: 1440, overlapRights: [80] }), { shift: 56, hide: false });
  const hidden = tocShift({ tocLeft: 40, tocWidth: 200, viewport: 300, overlapRights: [280] });
  assert.equal(hidden.hide, true);
});

test("editor snippets, Typora templates and text replacements come from one catalog", () => {
  const snippets = vscodeSnippets();
  assert.equal(snippets["Garden 块"].prefix, "garden");
  assert.match(snippets["Garden 块"].body[0], /card,stat,compare,timeline,chart,figure,html,interactive/);
  assert.ok(snippets.gcard || snippets["Garden 资源卡 gcard"]);
  const markdown = gardenBlocksMarkdown();
  assert.match(markdown, /```garden card/);
  assert.match(markdown, /```garden timeline/);
  const plist = textReplacementPlist();
  assert.match(plist, /<key>shortcut<\/key>\s*<string>;gcard<\/string>/);
  const onDisk = readFileSync(new URL("../editors/vscode/snippets/markdown.json", import.meta.url), "utf8");
  assert.equal(JSON.parse(onDisk)["Garden 块"].prefix, snippets["Garden 块"].prefix);
  const template = readFileSync(new URL("../templates/garden-blocks.md", import.meta.url), "utf8");
  assert.equal(template, markdown);
  const chartSkill = readFileSync(new URL("../.agents/skills/garden-interactive-chart/SKILL.md", import.meta.url), "utf8");
  assert.match(chartSkill, /```garden html\nsrc: \.\/windowsill-herbs\/layers\.html/);
  assert.doesNotMatch(chartSkill, /```widget/);
  const shipped = ["../.agents/skills/garden-interactive-chart/SKILL.md", "../.agents/skills/garden-post-review/SKILL.md", "../.agents/skills/garden-ui/SKILL.md", "../templates/garden-blocks.md"]
    .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
    .join("\n");
  assert.doesNotMatch(shipped, /```(?:widget|embed|intent)\b/);
});
