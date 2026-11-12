import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {
  DIAGRAM_RECIPES,
  OTHER_RECIPE_NAME,
  INTERNAL_LAYOUT_TERMS_NOT_FOR_AUTHORS,
  COMPOSE_FENCE_NAME,
  composeFenceOpen,
  filterPickerItems,
  pickerSelectionResult,
} from "../ui/garden/diagram-recipes.mjs";
import {pickerItems, slashQuery, suggestHtml} from "../ui/garden/snippets.mjs";
import {parseCompose} from "../ui/compose/markup.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

function decodePreview(item) {
  assert.ok(item.preview.startsWith("data:image/svg+xml,"), item.name);
  return decodeURIComponent(item.preview.slice("data:image/svg+xml,".length));
}

test("picker uses author-facing graphic types plus 其他, with stable ids", () => {
  const items = pickerItems();
  const labels = items.map((item) => item.label);
  const expected = [
    "关联图",
    "发散图",
    "分层图",
    "并列图",
    "上下对照图",
    "图文列表",
    "流程图",
    "分步图",
    "对比图",
    "时间线图",
    "时序图",
    "选项卡",
    "数据图",
    "参数调节图",
    "换算图",
    "代码走查",
    "逐步演示",
    "路径标注图",
    "步骤清单",
    "格子图",
    "其他",
  ];
  assert.deepEqual(labels, expected);
  assert.equal(items.at(-1).name, OTHER_RECIPE_NAME);
  assert.equal(items.at(-1).open, true);
  assert.equal(new Set(items.map((item) => item.name)).size, items.length);
  for (const item of items) {
    assert.ok(item.hint);
    assert.ok(item.preview);
    assert.ok(item.prompt);
    assert.match(item.body, /^```garden compose\n[\s\S]+```$/);
    assert.equal(composeFenceOpen(), "garden compose");
    assert.doesNotMatch(item.body, new RegExp(`\`\`\`garden ${item.name}\\b`));
  }
  for (const term of INTERNAL_LAYOUT_TERMS_NOT_FOR_AUTHORS) {
    assert.equal(items.some((item) => item.name === term || item.label === term), false, term);
  }
  assert.equal(items.some((item) => item.name === "compose"), false);
  assert.equal(COMPOSE_FENCE_NAME, "compose");
});

test("every picker item is traceable to handbook, skills, or built-in recipes", () => {
  for (const item of pickerItems()) {
    assert.ok(item.sources?.length, item.name);
    for (const source of item.sources) {
      const text = fs.readFileSync(path.join(root, source.file), "utf8");
      assert.ok(text.includes(source.phrase), `${item.name} missing “${source.phrase}” in ${source.file}`);
    }
  }
  const handbook = fs.readFileSync(path.join(root, "docs/handbook/components/compose.md"), "utf8");
  for (const phrase of ["三列并排，中间接起来", "先到一处，再散开", "自上而下分层", "一件事的多个切面", "上下两行对比", "可调参数（play）", "图表示例（play）"]) {
    assert.ok(handbook.includes(phrase), phrase);
  }
  const selection = fs.readFileSync(path.join(root, ".agents/skills/garden-compose/references/visual-selection.md"), "utf8");
  assert.match(selection, /不是组件白名单/);
  assert.match(selection, /centered-chip/);
  assert.match(selection, /候选须浏览器验收/);
});

test("each preview is a distinct schematic, not a shared generic thumbnail", () => {
  const svgs = Object.fromEntries(pickerItems().map((item) => [item.name, decodePreview(item)]));
  assert.equal(new Set(Object.values(svgs)).size, pickerItems().length);
  assert.match(svgs.compare, /<rect /);
  assert.match(svgs.chart, /M12 8v32h48/);
  assert.match(svgs.other, /M8 10h28/);
});

test("suggest rows show the name, schematic, and a short description", () => {
  const other = pickerItems().find((item) => item.name === "other");
  const html = suggestHtml(other);
  assert.match(html, /garden-suggest-thumb/);
  assert.match(html, /其他/);
  assert.match(html, /适合现成图形无法表达、需要自由组合图文的内容/);
  assert.ok(html.includes(other.preview));
});

test("name and purpose queries keep 其他 searchable and selectable", () => {
  assert.deepEqual(filterPickerItems("").map((item) => item.label), pickerItems().map((item) => item.label));
  assert.deepEqual(filterPickerItems("对比图").map((item) => item.label), ["对比图"]);
  assert.ok(filterPickerItems("对照").some((item) => item.name === "compare"));
  assert.deepEqual(filterPickerItems("上下对照").map((item) => item.label), ["上下对照图"]);
  assert.deepEqual(filterPickerItems("上下两行").map((item) => item.label), ["上下对照图"]);
  assert.deepEqual(filterPickerItems("图标窄栏").map((item) => item.name), ["icon-rail"]);
  assert.ok(filterPickerItems("代码").some((item) => item.label === "代码走查"));
  assert.ok(filterPickerItems("数据图").some((item) => item.name === "chart"));
  assert.ok(filterPickerItems("流程图").some((item) => item.name === "sequence"));
  for (const query of ["其他", "other", "任意", "灵活", "开放", "自由组合", "无现成", "html"]) {
    const found = filterPickerItems(query);
    assert.ok(found.some((item) => item.name === "other"), query);
  }
  const parsed = slashQuery("/garden 其他");
  assert.equal(parsed.phase, "components");
  assert.equal(parsed.query, "其他");
  assert.ok(filterPickerItems(parsed.query).some((item) => item.name === "other"));
});

test("recommended 其他 prompt is open composition, not a built-in template", () => {
  const prompt = pickerItems().find((item) => item.name === "other").prompt;
  assert.match(prompt, /我的材料：/);
  assert.match(prompt, /我的表达目标：/);
  assert.match(prompt, /自由组合图文/);
  assert.match(prompt, /不是合法白名单/);
  assert.match(prompt, /不要把结果限制为某一个现成模板/);
  assert.match(prompt, /不要让我学习新语法/);
  assert.doesNotMatch(prompt, /只能使用现成配方/);
});

test("named prompts ask for materials and goals, and stay inside garden compose", () => {
  for (const item of pickerItems().filter((entry) => !entry.open)) {
    assert.match(item.prompt, new RegExp(`「${item.label}」`));
    assert.match(item.prompt, /我的材料：/);
    assert.match(item.prompt, /我的表达目标：/);
    assert.match(item.prompt, /推荐起点/);
    assert.match(item.prompt, /不是唯一合法写法/);
    assert.match(item.prompt, /只使用 garden compose/);
  }
});

function fenceInner(body) {
  const open = "```garden compose\n";
  const close = "\n```";
  assert.ok(body.startsWith(open), body.slice(0, 40));
  assert.ok(body.endsWith(close), body.slice(-20));
  return body.slice(open.length, body.length - close.length);
}

test("selecting a recipe inserts a compose fence that already holds the recommended prompt", () => {
  for (const item of pickerItems()) {
    const result = pickerSelectionResult(item, "/garden 分层");
    assert.equal(result.insertText, item.body);
    assert.equal(result.prompt, item.prompt);
    assert.doesNotMatch(result.insertText, /^\/garden/u);
    assert.equal(fenceInner(item.body), item.prompt);
    assert.doesNotMatch(item.prompt, /```/);
    const parsed = parseCompose(item.prompt);
    assert.equal(parsed.uncompiled, true, item.name);
    assert.notEqual(parsed.error?.code, "compose-invalid", item.name);
  }

  const layers = pickerItems().find((item) => item.name === "layers");
  assert.match(layers.prompt, /「分层图」/);
  assert.match(layers.prompt, /我的材料：/);
  assert.match(layers.body, /「分层图」/);

  const other = pickerItems().find((item) => item.name === "other");
  assert.match(other.prompt, /自由组合图文/);
  assert.match(other.prompt, /不要把结果限制为某一个现成模板/);
  assert.ok(other.body.includes(other.prompt));
});

const STABLE_IDS = [
  "columns-join", "fan-out", "layers", "facets", "two-row", "icon-rail",
  "sequence", "steps", "compare", "timeline", "lanes", "tabs", "chart",
  "tunable", "converter", "code-walkthrough", "stepper", "trace", "plan",
  "inspect-grid", "other",
];

test("labels stay recognizable graphic types, and hints say when an author would use them", () => {
  const items = pickerItems();
  assert.deepEqual(items.map((item) => item.name), STABLE_IDS);
  const hints = items.map((item) => item.hint);
  assert.equal(new Set(hints).size, hints.length, "scenarios must be distinguishable");
  const hidden = [
    ...INTERNAL_LAYOUT_TERMS_NOT_FOR_AUTHORS,
    "Play", "DIL", "icon-rail", "flow-row", "flow-stack", "param-bench",
    "inspect-grid", "stepper", "步进器", "检视格", "图标窄栏", "参数台",
    "JavaScript", "UML",
  ];
  for (const item of items) {
    assert.match(item.hint, /^适合/, item.name);
    assert.ok(item.hint !== `适合画${item.label}`, item.name);
    assert.ok(!item.hint.includes(item.label), `${item.name} hint should not just restate the name`);
    const shown = `${item.label}\n${item.hint}\n${item.prompt}`;
    for (const term of hidden) {
      assert.doesNotMatch(shown, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${item.name} shows ${term}`);
    }
  }
});

test("names, scenarios, prompts, and previews stay matched to real capabilities", () => {
  const byName = Object.fromEntries(pickerItems().map((item) => [item.name, item]));
  const svg = (name) => decodePreview(byName[name]);

  assert.equal(byName["columns-join"].label, "关联图");
  assert.match(byName["columns-join"].hint, /中间一项关联/);
  assert.doesNotMatch(byName["columns-join"].label, /饼图|对比图|并列图/);
  assert.equal((svg("columns-join").match(/<rect /g) || []).length, 3);
  assert.match(svg("columns-join"), /M20 24h8M44 24h8/);

  assert.equal(byName.facets.label, "并列图");
  assert.match(byName.facets.hint, /几个方面.*没有先后/);
  assert.doesNotMatch(byName.facets.label, /饼图|对比图|关联图/);
  assert.equal((svg("facets").match(/<rect /g) || []).length, 4);
  assert.doesNotMatch(svg("facets"), /M20 24h8|L48 9/);

  assert.equal(byName.compare.label, "对比图");
  assert.match(byName.compare.hint, /同一条件/);
  assert.equal((svg("compare").match(/<rect /g) || []).length, 2);

  assert.equal(byName["two-row"].label, "上下对照图");
  assert.match(byName["two-row"].hint, /背景过程.*重点过程/);
  assert.equal((svg("two-row").match(/<rect /g) || []).length, 6);

  assert.equal(byName.chart.label, "数据图");
  assert.match(byName.chart.hint, /柱状、折线或占比/);
  assert.doesNotMatch(byName.chart.label, /饼图/);
  assert.match(svg("chart"), /M12 8v32h48/);

  assert.equal(byName.stepper.label, "逐步演示");
  assert.match(byName.stepper.hint, /停在某一步/);
  assert.equal(byName.trace.label, "路径标注图");
  assert.match(byName.trace.hint, /已有流程或状态图/);
  assert.equal(byName["inspect-grid"].label, "格子图");
  assert.match(byName["inspect-grid"].hint, /哪几格特别/);

  assert.equal(byName.other.label, "其他");
  assert.match(byName.other.hint, /现成图形无法表达/);
  assert.match(byName.other.prompt, /自由组合图文/);
  assert.match(byName.other.prompt, /任意 Markdown \/ HTML/);
});
