import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DIAGRAM_RECIPES, OTHER_RECIPE_NAME } from "../ui/garden/diagram-recipes.mjs";
import { pickerItems } from "../ui/garden/snippets.mjs";
import { checkGenerated, handbookEnglish, plannedFiles, previewSvgMarkup } from "../scripts/handbook-diagrams.mjs";
import { checkEnglishHandbookNoCjk, checkHandbookPairs } from "../scripts/handbook-facts.mjs";
import { checkGardenMarkdown } from "../ui/garden/check.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("Typora and VS Code both use the shared DIAGRAM_RECIPES picker list", () => {
  const typora = read("editors/typora/src/slash-suggest.ts");
  const typoraMain = read("editors/typora/src/main.ts");
  const vscode = read("editors/vscode/src/extension.ts");
  assert.match(typora, /from "\.\.\/\.\.\/\.\.\/ui\/garden\/snippets\.mjs"/);
  assert.match(typora, /pickerItems/);
  assert.match(typoraMain, /from "\.\.\/\.\.\/\.\.\/ui\/garden\/snippets\.mjs"/);
  assert.match(typoraMain, /pickerItems/);
  assert.match(vscode, /from "\.\.\/\.\.\/\.\.\/ui\/garden\/snippets\.mjs"/);
  assert.match(vscode, /pickerItems/);
  assert.equal(pickerItems().length, DIAGRAM_RECIPES.length);
  assert.deepEqual(
    pickerItems().map((item) => item.name),
    DIAGRAM_RECIPES.map((item) => item.name),
  );
});

test("the shared list length and last item come from code, including 其他", () => {
  const items = DIAGRAM_RECIPES;
  assert.ok(items.length > 0);
  assert.equal(items.at(-1).name, OTHER_RECIPE_NAME);
  assert.equal(items.at(-1).label, "其他");
  assert.equal(items.filter((item) => item.open).length, 1);
  assert.equal(new Set(items.map((item) => item.name)).size, items.length);
});

test("every recipe has English handbook copy in the generator", () => {
  for (const item of DIAGRAM_RECIPES) {
    const en = handbookEnglish(item);
    assert.ok(en.label, item.name);
    assert.ok(en.hint, item.name);
    assert.ok(en.prompt, item.name);
    assert.doesNotMatch(en.prompt, /[\u3400-\u9FFF]/u);
  }
});

test("generated handbook files stay in sync with diagram-recipes", () => {
  const issues = checkGenerated(root);
  assert.deepEqual(issues, [], issues.map((issue) => `${issue.file}: ${issue.message}`).join("\n"));
});

test("check fails when a generated recipe page is missing", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "handbook-diagrams-"));
  const planned = [...plannedFiles().keys()].filter((file) => !file.endsWith(".gitkeep"));
  const missingAbs = planned.find((file) => file.endsWith(`${path.sep}components${path.sep}diagrams${path.sep}columns-join.md`));
  assert.ok(missingAbs);
  const missing = path.relative(root, missingAbs).split(path.sep).join("/");
  for (const file of planned) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (rel === missing) continue;
    const dest = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  const issues = checkGenerated(tmp);
  assert.ok(
    issues.some((issue) => issue.file === missing && /missing/.test(issue.message)),
    JSON.stringify(issues),
  );
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("every recipe has a Chinese page, an English page, a visible schematic, and a matching brief", () => {
  const prefix = "data:image/svg+xml,";
  for (const item of DIAGRAM_RECIPES) {
    const zh = read(`docs/handbook/components/diagrams/${item.name}.md`);
    const en = read(`docs/handbook/en/components/diagrams/${item.name}.md`);
    const svg = read(`docs/handbook/components/diagrams/previews/${item.name}.svg`);
    const enCopy = handbookEnglish(item);

    assert.match(zh, new RegExp(`^title: "${item.label}"`, "m"));
    assert.ok(zh.includes(`![${item.label}示意](./previews/${item.name}.svg)`));
    assert.ok(zh.includes(item.hint));
    assert.ok(zh.includes(item.whenNot));
    assert.ok(zh.includes(item.prompt), item.name);
    assert.ok(zh.includes(item.body), item.name);

    assert.match(en, new RegExp(`^title: "${enCopy.label}"`, "m"));
    assert.ok(en.includes(`![Schematic for ${enCopy.label}](../../../components/diagrams/previews/${item.name}.svg)`));
    assert.ok(en.includes(enCopy.hint));
    assert.ok(en.includes(enCopy.prompt), item.name);
    assert.doesNotMatch(en, /[\u3400-\u9FFF]/u);

    const expectedSvg = previewSvgMarkup(item);
    assert.equal(svg.trim(), expectedSvg.trim());
    const raw = decodeURIComponent(item.preview.slice(prefix.length));
    assert.ok(raw.includes('viewBox="0 0 72 48"'));
    assert.equal(
      svg.replace('width="216"', 'width="72"').replace('height="144"', 'height="48"').trim(),
      raw.trim(),
    );
  }

  const zhIndex = read("docs/handbook/components/diagrams.md");
  const enIndex = read("docs/handbook/en/components/diagrams.md");
  assert.match(zhIndex, new RegExp(`目前共 ${DIAGRAM_RECIPES.length} 项`));
  assert.match(enIndex, new RegExp(`There are currently ${DIAGRAM_RECIPES.length} items`));
  assert.doesNotMatch(zhIndex, /\[!\[/);
  assert.doesNotMatch(enIndex, /\[!\[/);

  for (const item of DIAGRAM_RECIPES) {
    assert.ok(zhIndex.includes(`/garden/components/diagrams/${item.name}/`), item.name);
    assert.ok(zhIndex.includes(`./diagrams/previews/${item.name}.svg`), item.name);
    assert.ok(enIndex.includes(`/garden/en/components/diagrams/${item.name}/`), item.name);
  }
});

test("handbook entry pages link to the figure catalog without dropping existing wording", () => {
  const zhCompose = read("docs/handbook/components/compose.md");
  const enCompose = read("docs/handbook/en/components/compose.md");
  const zhWorkflow = read("docs/handbook/workflow.md");
  const enWorkflow = read("docs/handbook/en/workflow.md");
  assert.ok(zhCompose.includes("[推荐图示](/garden/components/diagrams)"));
  assert.ok(enCompose.includes("[Recommended figures](/garden/en/components/diagrams)"));
  assert.ok(zhWorkflow.includes("[推荐图示](/garden/components/diagrams)"));
  assert.ok(enWorkflow.includes("[Recommended figures](/garden/en/components/diagrams)"));
  assert.ok(read("docs/handbook/components.md").includes("[推荐图示](/garden/components/diagrams)"));
  assert.ok(read("docs/handbook/en/components.md").includes("[Recommended figures](/garden/en/components/diagrams)"));
  assert.match(zhCompose, /\/garden/);
  assert.match(zhWorkflow, /garden compose/);
});

test("handbook pairs and the English CJK gate accept the new figure pages", () => {
  const pairIssues = checkHandbookPairs(root).filter((issue) => String(issue.file ?? issue.message ?? "").includes("diagrams"));
  assert.deepEqual(pairIssues, [], JSON.stringify(pairIssues, null, 2));
  const cjkIssues = checkEnglishHandbookNoCjk(root).filter((issue) => String(issue.file).includes("diagrams"));
  assert.deepEqual(cjkIssues, [], cjkIssues.map((issue) => `${issue.file}:${issue.line} ${issue.message}`).join("\n"));
});

test("new figure pages pass the garden markdown check", () => {
  for (const item of DIAGRAM_RECIPES) {
    const zh = read(`docs/handbook/components/diagrams/${item.name}.md`).replace(/^---[\s\S]*?---\n/, "");
    const diagnostics = checkGardenMarkdown(zh, { title: item.label, draft: true });
    const blocking = (diagnostics ?? []).filter((d) => d.severity === "error");
    assert.deepEqual(blocking, [], `${item.name}: ${JSON.stringify(blocking)}`);
  }
});
