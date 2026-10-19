import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  checkAllHandbookFacts,
  checkFileFacts,
  deriveHandbookFacts,
} from "../scripts/handbook-facts.mjs";
import { checkUiBlock } from "../ui/core/validate.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("handbook-facts derives commands, flags, Makefile targets, env vars, config keys, check codes, and CSS tokens from source", () => {
  const facts = deriveHandbookFacts(root);

  // CLI commands and flags
  assert.ok(facts.cli.binNames.has("garden"));
  assert.ok(facts.cli.binNames.has("hd-garden"));
  assert.ok(facts.cli.gardenCommands.has("check"));
  assert.ok(facts.cli.gardenCommands.has("ui"));
  assert.ok(facts.cli.gardenCommands.has("pages:validate"));
  assert.ok(facts.cli.uiSubcommands.has("check"));
  assert.ok(facts.cli.uiFlags.has("--staged"));
  assert.ok(facts.cli.uiFlags.has("--all"));
  assert.ok(!facts.cli.allFlags.has("--fix"));

  // Makefile targets and variables
  assert.ok(facts.makefile.targets.has("new"));
  assert.ok(facts.makefile.targets.has("dev"));
  assert.ok(facts.makefile.targets.has("check"));
  assert.ok(facts.makefile.targets.has("build"));
  assert.ok(facts.makefile.targets.has("update"));
  assert.ok(!facts.makefile.targets.has("upgrade"));
  assert.ok(facts.makefile.variables.has("MESSAGE"));

  // Environment variables
  assert.ok(facts.envVars.has("STATIC_EXPORT"));
  assert.ok(facts.envVars.has("TRAILING_SLASH"));
  assert.ok(facts.envVars.has("GISCUS_DISABLED"));
  assert.ok(!facts.envVars.has("NEXT_PUBLIC_TRAILING_SLASH"));

  // site.config.yaml keys
  assert.ok(facts.siteConfig.keyPaths.has("pages.garden.title"));
  assert.ok(facts.siteConfig.keyPaths.has("brand.logo"));
  assert.ok(facts.siteConfig.leafKeys.has("redirects"));

  // Check codes & severities
  assert.ok(facts.checkCodes.get("title-split")?.has("warning"));
  assert.ok(!facts.checkCodes.get("title-split")?.has("error"));
  assert.ok(facts.checkCodes.get("diff-orphan")?.has("error"));
  assert.ok(facts.checkCodes.get("steps-prose")?.has("error"));
  assert.ok(!facts.checkCodes.has("title-pipe"));
  assert.ok(!facts.checkCodes.has("code-diff-mismatch"));
  assert.ok(!facts.checkCodes.has("chart-table-dup"));

  // CSS tokens
  assert.deepEqual(facts.cssTokens.get("--paper"), { light: "#faf9f5", dark: "#1f1e1d" });
  assert.deepEqual(facts.cssTokens.get("--text"), { light: "#2d2c29", dark: "#dcd9d2" });
  assert.deepEqual(facts.cssTokens.get("--chip"), { light: "#f0eee6", dark: "#30302e" });
});

test("handbook-facts rejects invented flags, env vars, check codes, Makefile targets, config keys, and wrong token colours", () => {
  const facts = deriveHandbookFacts(root);
  const sample = [
    "# Sample broken doc",
    "",
    "Run `npx garden ui check content/posts/my-post.md --fix` or `make upgrade`.",
    "Configure `NEXT_PUBLIC_TRAILING_SLASH` in `.env`.",
    "Splitting titles wrong triggers `title-pipe` 错误.",
    "",
    "```yaml",
    "site:",
    "  inventedOption: true",
    "```",
    "",
    "| 颜色变量 | 浅色模式 | 深色模式 | 用途 |",
    "| :--- | :--- | :--- | :--- |",
    "| `--text` | `#292826` | `#dad6ce` | 正文 |",
  ].join("\n");

  const issues = checkFileFacts(
    path.join(root, "docs/handbook/sample.md"),
    sample,
    facts,
    root,
  );

  const messages = issues.map((i) => `${i.file}:${i.line} [${i.kind}] ${i.message}`).join("\n");
  assert.match(messages, /docs\/handbook\/sample\.md:3 \[cli-flag\].*--fix/u);
  assert.match(messages, /docs\/handbook\/sample\.md:3 \[make-target\].*make upgrade/u);
  assert.match(messages, /docs\/handbook\/sample\.md:4 \[env-var\].*NEXT_PUBLIC_TRAILING_SLASH/u);
  assert.match(messages, /docs\/handbook\/sample\.md:5 \[check-code\].*title-pipe/u);
  assert.match(messages, /docs\/handbook\/sample\.md:9 \[config-key\].*site\.inventedOption/u);
  assert.match(messages, /docs\/handbook\/sample\.md:14 \[css-color\].*--text.*#292826.*#2d2c29/u);
});

function issuesFor(lines) {
  const facts = deriveHandbookFacts(root);
  return checkFileFacts(path.join(root, "docs/handbook/sample.md"), lines.join("\n"), facts, root).map(
    (i) => `${i.line} [${i.kind}] ${i.message}`,
  );
}

test("handbook-facts derives argument counts for pages commands from bin/garden.mjs and the script", () => {
  const facts = deriveHandbookFacts(root);
  assert.deepEqual(facts.cli.commandArity.get("pages:validate"), { min: 0, max: 1 });
  assert.deepEqual(facts.cli.commandArity.get("pages:prepare"), { min: 1, max: 2 });
  assert.equal(facts.cli.npmScriptCommands.get("pages:validate"), "pages:validate");
});

test("handbook-facts checks commands in console and text fences", () => {
  const issues = issuesFor(["```console", "$ npx garden ui check --fix", "```", "", "```text", "make upgrade", "```"]);
  assert.ok(issues.some((m) => /^2 \[cli-flag\].*--fix/u.test(m)), issues.join("\n"));
  assert.ok(issues.some((m) => /^6 \[make-target\].*upgrade/u.test(m)), issues.join("\n"));
  assert.deepEqual(issuesFor(["```console", "$ npx garden ui check --staged", "```"]), []);
});

test("handbook-facts checks run: lines inside a workflow YAML fence", () => {
  const workflow = [
    "```yaml",
    "jobs:",
    "  publish:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: npx garden pages:validate static-site pages-repository",
    "      - name: Build",
    "        run: |",
    "          npm ci",
    "          npm run nonexistent-script",
    "```",
  ];
  const issues = issuesFor(workflow);
  assert.ok(issues.some((m) => /^6 \[cli-arity\].*pages:validate.*got 2/u.test(m)), issues.join("\n"));
  assert.ok(issues.some((m) => /^10 \[npm-script\].*nonexistent-script/u.test(m)), issues.join("\n"));
  const fixed = workflow.map((l) => l.replace("pages:validate static-site", "pages:prepare static-site").replace("nonexistent-script", "build"));
  assert.deepEqual(issuesFor(fixed), []);
});

test("handbook-facts checks the argument count of pages:prepare and pages:validate", () => {
  const issues = issuesFor([
    "Run `npx garden pages:prepare` first.",
    "Then `npm run pages:validate -- dist/client extra`.",
  ]);
  assert.ok(issues.some((m) => /^1 \[cli-arity\].*pages:prepare.*got 0/u.test(m)), issues.join("\n"));
  assert.ok(issues.some((m) => /^2 \[cli-arity\].*pages:validate.*got 2/u.test(m)), issues.join("\n"));
  assert.deepEqual(issuesFor(["Run `npx garden pages:prepare dist/client out` and `npm run pages:validate`."]), []);
});

test("handbook-facts checks a --token: #hex pair written inside one code span", () => {
  const issues = issuesFor(["正文颜色是 `--text: #123456`。"]);
  assert.ok(issues.some((m) => /^1 \[css-color\].*--text.*#123456/u.test(m)), issues.join("\n"));
  assert.ok(issuesFor(["`--nope: #2d2c29`"]).some((m) => /\[css-token\].*--nope/u.test(m)));
  assert.deepEqual(issuesFor(["正文颜色是 `--text: #2d2c29`。"]), []);
});

test("handbook-facts matches site.config.yaml keys by their full dotted path", () => {
  const issues = issuesFor(["```yaml", "brand:", "  title: Garden", "author:", "  logo: x.svg", "```"]);
  assert.ok(issues.some((m) => /\[config-key\].*"brand\.title"/u.test(m)), issues.join("\n"));
  assert.ok(issues.some((m) => /\[config-key\].*"author\.logo"/u.test(m)), issues.join("\n"));
  assert.deepEqual(issuesFor(["```yaml", "brand:", "  logo: brand/logo.svg", "author:", "  name: A", "```"]), []);
});

/** Every ```garden interactive block in a Markdown text, including samples nested in ````markdown fences. */
function interactiveBlocks(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const open = /^(\s*)(`{3,})garden interactive(?:\s+#([\w-]+))?\s*$/u.exec(lines[i]);
    if (!open) continue;
    const end = lines.findIndex((line, j) => j > i && line.trim() === open[2]);
    blocks.push({ line: i + 1, id: open[3] ?? "handbook-sample", body: lines.slice(i + 1, end).join("\n") });
    i = end;
  }
  return blocks;
}

function uiErrors(block) {
  return checkUiBlock(`---\nid: ${block.id}\n${block.body}`, { skipData: true }).diagnostics.filter((d) => d.severity === "error");
}

test("every garden interactive example in the handbook passes the ui validator", () => {
  const files = fs.readdirSync(path.join(root, "docs/handbook"), { recursive: true }).filter((f) => String(f).endsWith(".md"));
  let count = 0;
  for (const rel of files) {
    const markdown = fs.readFileSync(path.join(root, "docs/handbook", String(rel)), "utf8");
    for (const block of interactiveBlocks(markdown)) {
      count += 1;
      const errors = uiErrors(block);
      assert.deepEqual(errors, [], `docs/handbook/${rel}:${block.line}\n${errors.map((e) => `${e.code} ${e.message}`).join("\n")}`);
    }
  }
  assert.ok(count >= 2, `expected the interactive page to show at least two examples, found ${count}`);
});

test("the ui validator rejects tags and props that are not in the catalog", () => {
  const [block] = interactiveBlocks([
    "```garden interactive",
    "caption: 示例",
    "---",
    "<State n={2} />",
    "<Controls><Slider label=\"n\" state=\"n\" min={1} max={9} /></Controls>",
    "<Result label=\"结果\" value=\"{n}\" />",
    "```",
  ].join("\n"));
  const codes = uiErrors(block).map((e) => e.code);
  assert.ok(codes.includes("ui-component"), codes.join(","));
});

test("all docs/handbook/**/*.md and app/garden/** pass handbook fact-check", () => {
  const { issues } = checkAllHandbookFacts(root);
  if (issues.length > 0) {
    const formatted = issues
      .map((i) => `  ${i.file}:${i.line} [${i.kind}] ${i.message}`)
      .join("\n");
    assert.fail(`Handbook fact-check found ${issues.length} issue(s):\n${formatted}`);
  }
});
