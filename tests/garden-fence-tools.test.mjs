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
  const zh = buildFixPrompt([{ file: "content/posts/a.md", block: idea, diagnostics: [] }]);
  assert.match(zh, /garden-idea：这段想法还没编译/u);
  assert.match(zh, /npx garden ui apply/u);
  const en = buildFixPrompt([{ file: "content/posts/a.md", block: idea, diagnostics: [] }], { lang: "en" });
  assert.match(en, /garden-idea: this idea is not compiled yet/u);
  assert.match(en, /Fix prompt for AI|Handle the Garden post blocks/u);
  assert.match(en, /npx garden ui apply/u);
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

test("garden ui check prints English messages when site locale is en", () => {
  const dir = site(post());
  fs.writeFileSync(path.join(dir, "site.config.yaml"), "name: T\nlocale: en_US\n");
  const result = cli(dir, "check", "content/posts/a.md", "--no-copy");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /content\/posts\/a\.md:9 {2}- {2}garden-idea {2}uncompiled idea remaining/u);
  assert.match(result.stderr, /Fix prompt for AI/u);
  assert.match(result.stderr, /Wrote \.garden\/ui-fix-prompt\.md/u);
  assert.match(result.stderr, /kv {2}ui-component/u);
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

// The handbook's end-to-end example (overview and 用 AI 写作) quotes real output.
test("the handbook's AI-writing example matches what the commands print", () => {
  const read = (name) => fs.readFileSync(path.join(root, "docs/handbook", name), "utf8");
  const overview = read("index.md");
  const aiPage = read("ai-writing.md");
  const idea = overview.match(/```garden\n(让读者[^\n]+)\n```/u)[1];
  const markdown = `---\ntitle: 慢慢写\ndate: 2026-10-01\ndescription: 一篇长文要写多久。\n---\n\n## 写作节奏\n\n${fence}garden\n${idea}\n${fence}\n`;
  const dir = site(markdown);
  fs.renameSync(path.join(dir, "content/posts/a.md"), path.join(dir, "content/posts/writing-pace.md"));
  const scan = JSON.parse(cli(dir, "scan", "content/posts/writing-pace.md").stdout);
  const [block] = scan.blocks;
  for (const [key, value] of Object.entries({ lang: block.lang, status: block.status, startLine: block.startLine, intentHash: block.intentHash, section: block.section })) {
    assert.ok(overview.includes(`"${key}": ${JSON.stringify(value)}`), `overview shows ${key} ${value}`);
  }
  const check = cli(dir, "check", "content/posts/writing-pace.md", "--no-copy");
  const diagnostic = check.stderr.split("\n")[0];
  assert.ok(overview.includes(diagnostic) && aiPage.includes(diagnostic), diagnostic);
  for (const line of check.stderr.split("\n").slice(2, 9)) {
    if (line.trim()) assert.ok(overview.includes(line), `overview prompt line: ${line}`);
  }
  const interactive = overview.match(/```garden interactive #writing-pace\n[\s\S]*?\n```/u)[0];
  fs.writeFileSync(path.join(dir, "new.md"), interactive);
  const apply = cli(dir, "apply", "content/posts/writing-pace.md", "--intent-hash", block.intentHash, "--file", path.join(dir, "new.md"));
  assert.ok(overview.includes(apply.stdout.trim()), apply.stdout);
  assert.equal(cli(dir, "check", "content/posts/writing-pace.md", "--quiet", "--no-copy").stdout, "");
  // The hook command the pages quote is the one bin/garden.mjs installs.
  const hook = /exec npx --no-install garden ui check --staged --quiet/u;
  assert.match(fs.readFileSync(path.join(root, "bin/garden.mjs"), "utf8"), hook);

  // English handbook quotes the same flow with locale en_US output.
  const enOverview = read("en/index.md");
  const enAi = read("en/ai-writing.md");
  const enIdea = enOverview.match(/```garden\n(Let the reader[^\n]+)\n```/u)[1];
  const enMarkdown = `---\ntitle: Writing pace\ndate: 2026-10-01\ndescription: How long.\n---\n\n## Writing Pace\n\n${fence}garden\n${enIdea}\n${fence}\n`;
  const enDir = site(enMarkdown);
  fs.writeFileSync(path.join(enDir, "site.config.yaml"), "name: T\nlocale: en_US\n");
  fs.renameSync(path.join(enDir, "content/posts/a.md"), path.join(enDir, "content/posts/writing-pace.md"));
  const enScan = JSON.parse(cli(enDir, "scan", "content/posts/writing-pace.md").stdout);
  const [enBlock] = enScan.blocks;
  assert.ok(enOverview.includes(`"intentHash": ${JSON.stringify(enBlock.intentHash)}`), enBlock.intentHash);
  const enCheck = cli(enDir, "check", "content/posts/writing-pace.md", "--no-copy");
  assert.match(enCheck.stderr, /uncompiled idea remaining/u);
  assert.match(enCheck.stderr, /Fix prompt for AI/u);
  const enDiagnostic = enCheck.stderr.split("\n")[0];
  assert.ok(enOverview.includes(enDiagnostic) && enAi.includes(enDiagnostic), enDiagnostic);
  for (const line of enCheck.stderr.split("\n").slice(2, 9)) {
    if (line.trim()) assert.ok(enOverview.includes(line), `en overview prompt line: ${line}`);
  }
});
