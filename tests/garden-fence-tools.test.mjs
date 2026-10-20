import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scanMarkdown } from "../ui/core/scan.mjs";
import { applyBlock, ApplyError } from "../ui/core/apply.mjs";
import { buildFixPrompt } from "../ui/core/fix-prompt.mjs";
import { checkGardenMarkdown } from "../ui/garden/check.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fence = "```";

const post = (extra = "") => `---
title: 试验
date: 2026-01-01
description: 一句话。
${extra}---

## 显存

${fence}garden
让读者拧 batch，看 KV 显存怎么涨。
${fence}

${fence}garden interactive #kv
caption: 显存随 batch 线性增长。
intent: |
  让读者拧 batch。
---
<State batch={1} />
<Slidr bind="batch" />
${fence}
`;

test("ui scan lists garden ideas and garden interactive blocks", () => {
  const blocks = scanMarkdown(post());
  assert.deepEqual(blocks.map((block) => [block.lang, block.status, block.id]), [
    ["garden-idea", "uncompiled", null],
    ["garden-interactive", "error", "kv"],
  ]);
  assert.equal(blocks[0].intent.trim(), "让读者拧 batch，看 KV 显存怎么涨。");
  assert.equal(blocks[0].section, "显存");
  const bad = blocks[1].diagnostics.find((item) => item.code === "ui-component");
  assert.ok(bad, "unknown component is reported");
  assert.equal(post().split("\n")[bad.line - 1], '<Slidr bind="batch" />', "diagnostic points at the file line");
});

test("garden check reports a broken component inside garden interactive", () => {
  const codes = checkGardenMarkdown(post()).map((item) => item.code);
  assert.ok(codes.includes("garden-idea"));
  assert.ok(codes.includes("ui-component"));
});

test("the fix prompt asks to compile garden ideas", () => {
  const [idea] = scanMarkdown(post());
  const prompt = buildFixPrompt([{ file: "content/posts/a.md", block: idea, diagnostics: [] }]);
  assert.match(prompt, /garden-idea：这段想法还没编译/u);
  assert.match(prompt, /npx garden ui apply/u);
});

test("ui apply turns an idea into a garden interactive and leaves the rest byte-identical", () => {
  const markdown = post().replace('<Slidr bind="batch" />', '<Slider bind="batch" min={1} max={8} label="batch" />');
  const [idea] = scanMarkdown(markdown);
  const replacement = `${fence}garden interactive #kv-grow
caption: batch 翻倍，显存也翻倍。
intent: |
  让读者拧 batch，看 KV 显存怎么涨。
---
<State batch={1} />
<Slider bind="batch" min={1} max={8} label="batch" />
<Stat label="batch" value={batch} />
${fence}`;
  const result = applyBlock(markdown, { intentHash: idea.intentHash }, replacement);
  assert.equal(result.kind, "garden");
  assert.equal(result.markdown.slice(0, idea.startLine === 1 ? 0 : markdown.indexOf(`${fence}garden\n`)), markdown.slice(0, markdown.indexOf(`${fence}garden\n`)));
  assert.ok(result.markdown.endsWith(markdown.slice(markdown.indexOf(`\n\n${fence}garden interactive #kv`))));
  assert.deepEqual(scanMarkdown(result.markdown).map((block) => block.status), ["ok", "ok"]);
});

test("ui apply refuses a broken garden interactive and an uncompiled idea", () => {
  const [idea] = scanMarkdown(post());
  assert.throws(
    () => applyBlock(post(), { intentHash: idea.intentHash }, `${fence}garden interactive #x\ncaption: c\nintent: i\n---\n<Slidr />\n${fence}`),
    (error) => error instanceof ApplyError && error.code === "apply-invalid",
  );
  assert.throws(
    () => applyBlock(post(), { intentHash: idea.intentHash }, `正文\n\n${fence}garden\n还是想法\n${fence}`),
    (error) => error instanceof ApplyError && error.code === "apply-content",
  );
});

function site(markdown) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-fence-"));
  fs.mkdirSync(path.join(dir, "content/posts"), { recursive: true });
  fs.writeFileSync(path.join(dir, "content/posts/a.md"), markdown);
  return dir;
}

const cli = (dir, ...args) => spawnSync(process.execPath, [path.join(root, "bin/garden.mjs"), "ui", ...args], {
  cwd: dir,
  encoding: "utf8",
  env: { ...process.env, GARDEN_SITE: dir, GARDEN_UI_NO_COPY: "1" },
});

test("garden ui check (the pre-commit hook's command) fails on garden blocks and prints the prompt", () => {
  const dir = site(post());
  const result = cli(dir, "check", "content/posts/a.md", "--no-copy");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /content\/posts\/a\.md:9 {2}- {2}garden-idea {2}还有没编译的想法/u);
  assert.match(result.stderr, /kv {2}ui-component/u);
  assert.match(result.stderr, /发给 AI 的修复提示词/u);
  assert.ok(fs.existsSync(path.join(dir, ".garden/ui-fix-prompt.md")));
});

test("garden ui check --staged reads the staged version", () => {
  const dir = site(post());
  const git = (...args) => spawnSync("git", args, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("add", "content/posts/a.md");
  fs.writeFileSync(path.join(dir, "content/posts/a.md"), "---\ntitle: 改好了\n---\n\n正文。\n");
  assert.equal(cli(dir, "check", "--staged", "--quiet", "--no-copy").status, 1);
  git("add", "content/posts/a.md");
  assert.equal(cli(dir, "check", "--staged", "--quiet", "--no-copy").status, 0);
});

test("drafts may keep garden ideas", () => {
  const dir = site(post("draft: true\n").replace('<Slidr bind="batch" />', '<Slider bind="batch" min={1} max={8} label="batch" />'));
  assert.equal(cli(dir, "check", "content/posts/a.md", "--no-copy").status, 0);
});
