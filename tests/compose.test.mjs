import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { remarkGarden } from "../app/lib/remark-garden.mjs";
import { COMPOSE_EXAMPLE_BODY, COMPOSE_INTENT } from "../ui/compose/examples.mjs";
import { parseCompose } from "../ui/compose/parse.mjs";
import { composeText, renderCompose } from "../ui/compose/render.mjs";
import { applyBlock, ApplyError } from "../ui/core/apply.mjs";
import { scanMarkdown } from "../ui/core/scan.mjs";
import { checkGardenMarkdown } from "../ui/garden/check.mjs";
import { RECIPE_FILES } from "../ui/prompt/build.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fence = (body) => `\`\`\`garden compose\n${body}\n\`\`\`\n`;

test("plain intent is uncompiled, and a YAML tree is not", () => {
  const prose = parseCompose(COMPOSE_INTENT);
  assert.equal(prose.uncompiled, true);
  assert.equal(prose.error.code, "compose-uncompiled");
  assert.equal(parseCompose("title: 只有标题").uncompiled, true);
  assert.equal(parseCompose("").uncompiled, true);

  const compiled = parseCompose(COMPOSE_EXAMPLE_BODY);
  assert.equal(compiled.ok, true);
  assert.equal(compiled.doc.intent, COMPOSE_INTENT);
  assert.equal(compiled.doc.nodes[0].type, "steps");
  assert.deepEqual(compiled.doc.nodes[0].items.map((item) => item.id), ["sync", "build", "validate"]);
});

test("a broken tree is invalid rather than left as an idea", () => {
  const broken = parseCompose("steps:\n  - [");
  assert.equal(broken.uncompiled, false);
  assert.equal(broken.error.code, "compose-invalid");

  const missing = parseCompose("steps:\n  - id: sync\n    title: sync\nnotes:\n  - for: build\n    text: 没有这一步\n");
  assert.equal(missing.error.code, "compose-invalid");
  assert.match(missing.error.message, /build/);

  const unknown = parseCompose("tree:\n  - type: diagram\n    text: 不行\n");
  assert.equal(unknown.error.code, "compose-invalid");
});

test("steps and notes render a static diagram that opens a note", () => {
  const { doc } = parseCompose(COMPOSE_EXAMPLE_BODY);
  const html = renderCompose(doc, { scope: "demo" });
  const expected = fs.readFileSync(path.join(root, "tests/fixtures/compose-steps.html"), "utf8");
  assert.equal(`${html}\n`, expected);
  assert.match(html, /<details class="g-compose-disclosure" name="demo" id="demo-sync" open><summary class="g-compose-step"/u);
  assert.match(html, /<summary class="g-compose-step"[^>]*>[\s\S]*同步内容与配置/u);
  assert.match(html, /先对齐远程与本地材料/u);
  assert.match(html, /class="g-compose-arrow"[^>]*data-dir="down"/u);
  assert.doesNotMatch(html, /<script/u);
  assert.equal(html.includes(COMPOSE_INTENT), false);
  assert.match(composeText(doc), /同步内容与配置/);
  assert.doesNotMatch(composeText(doc), /向下箭头/);
});

test("nested cards keep badge, kpi, and arrow text as DOM, and escape HTML", () => {
  const body = `tree:
  - row:
      - card:
          id: sync
          tone: accent
          title: "<script>alert(1)</script>"
          badge: "1"
          kpi:
            value: 12
            unit: ms
            label: 对齐
          children:
            - type: text
              text: 同步内容
      - arrow: right
      - card:
          id: build
          title: build
          text: 生成
  - notes:
      - for: sync
        text: 先对齐
      - for: build
        text: 构建
`;
  const result = parseCompose(body);
  assert.equal(result.ok, true);
  const html = renderCompose(result.doc, { scope: "nest" });
  assert.match(html, /data-tone="accent"/u);
  assert.match(html, /class="g-compose-badge"/u);
  assert.match(html, /class="g-compose-kpi-value">12</u);
  assert.match(html, /data-dir="right"/u);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.doesNotMatch(html, /<script/u);
  assert.match(html, /<details class="g-compose-disclosure" name="nest" id="nest-sync" open><summary class="g-compose-card"/u);
});

test("compose css follows theme tokens and stacks on a narrow screen", () => {
  const css = fs.readFileSync(path.join(root, "ui/compose/compose.css"), "utf8");
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/u);
  for (const token of ["--ink", "--card", "--muted", "--paper", "--well", "--rule"]) {
    assert.match(css, new RegExp(`var\\(${token}\\)`));
  }
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*grid-template-columns:\s*1fr/u);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*flex-direction:\s*column/u);
  assert.match(css, /details\[open\] > summary|\.g-compose-disclosure\[open\] > summary/u);
  const tokens = fs.readFileSync(path.join(root, "app/styles/tokens.css"), "utf8");
  assert.match(tokens, /data-theme="dark"/u);
  assert.match(tokens, /--ink:/u);
});

test("ui scan and garden check fail an uncompiled compose fence", () => {
  const markdown = fence(COMPOSE_INTENT);
  const [block] = scanMarkdown(markdown);
  assert.equal(block.lang, "garden-compose");
  assert.equal(block.status, "uncompiled");
  assert.equal(block.intent.trim(), COMPOSE_INTENT);
  assert.deepEqual(checkGardenMarkdown(markdown).map((item) => item.code), ["compose-uncompiled"]);
  assert.deepEqual(checkGardenMarkdown(markdown, { draft: true }), []);

  const compiled = fence(COMPOSE_EXAMPLE_BODY);
  assert.equal(scanMarkdown(compiled)[0].status, "ok");
  assert.deepEqual(checkGardenMarkdown(compiled), []);
});

test("apply accepts a compiled compose fence and rejects a prose one", () => {
  const markdown = fence(COMPOSE_INTENT);
  const [block] = scanMarkdown(markdown);
  assert.throws(() => applyBlock(markdown, { intentHash: block.intentHash }, fence("还是一句白话")), ApplyError);
  const next = applyBlock(markdown, { intentHash: block.intentHash }, fence(COMPOSE_EXAMPLE_BODY));
  assert.equal(scanMarkdown(next.markdown)[0].status, "ok");
  assert.match(next.markdown, /intent: \|/u);
});

test("the host renders each compose fence as static HTML", () => {
  const source = `${fence(COMPOSE_EXAMPLE_BODY)}\n${fence(COMPOSE_EXAMPLE_BODY)}`;
  const processor = unified().use(remarkParse).use(remarkGarden);
  const tree = processor.runSync(processor.parse(source));
  const html = [];
  const walk = (node) => {
    if (node?.type === "html" && String(node.value).includes("g-compose")) html.push(node.value);
    for (const child of node?.children ?? []) walk(child);
  };
  walk(tree);
  assert.equal(html.length, 2);
  assert.match(html[0], /name="gc1"/u);
  assert.match(html[1], /name="gc2"/u);
});

test("the ui prompt catalog includes compose and forbids arbitrary HTML", () => {
  assert.ok(RECIPE_FILES.includes("compose.md"));
  const rules = fs.readFileSync(path.join(root, "ui/prompt/rules.md"), "utf8");
  const recipe = fs.readFileSync(path.join(root, "ui/prompt/recipes/compose.md"), "utf8");
  assert.match(rules, /garden compose/);
  assert.match(recipe, /不要写色值、HTML、SVG、脚本/);
  for (const name of ["stack", "row", "card", "steps", "compare", "callout", "badge", "kpi", "arrow", "notes"]) {
    assert.match(recipe, new RegExp(name));
  }
});
