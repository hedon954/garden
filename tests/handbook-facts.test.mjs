import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  checkAllHandbookFacts,
  checkFileFacts,
  deriveHandbookFacts,
} from "../scripts/handbook-facts.mjs";

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

test("all docs/handbook/**/*.md and app/garden/** pass handbook fact-check", () => {
  const { issues } = checkAllHandbookFacts(root);
  if (issues.length > 0) {
    const formatted = issues
      .map((i) => `  ${i.file}:${i.line} [${i.kind}] ${i.message}`)
      .join("\n");
    assert.fail(`Handbook fact-check found ${issues.length} issue(s):\n${formatted}`);
  }
});
