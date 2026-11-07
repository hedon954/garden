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

${fence}garden compose
让读者拧 batch，看 KV 显存怎么涨。
${fence}

${fence}garden compose #kv
caption: 显存随 batch 线性增长。
intent: |
  让读者拧 batch。
---
{@body const [batch, setBatch] = DIL.useState(1)}
<slidr bind="batch" />
${fence}
`;

test("ui scan lists uncompiled and interactive Compose blocks", () => {
  const blocks = scanMarkdown(post());
  assert.deepEqual(blocks.map((block) => [block.lang, block.status, block.id]), [
    ["garden-compose", "uncompiled", null],
    ["garden-compose", "error", "kv"],
  ]);
  assert.equal(blocks[0].intent.trim(), "让读者拧 batch，看 KV 显存怎么涨。");
  assert.equal(blocks[0].section, "显存");
  const bad = blocks[1].diagnostics.find((item) => item.code === "ui-component");
  assert.ok(bad, "unknown component is reported");
  assert.equal(post().split("\n")[bad.line - 1], '<slidr bind="batch" />', "diagnostic points at the file line");
});

test("garden check reports a broken component inside garden compose", () => {
  const codes = checkGardenMarkdown(post()).map((item) => item.code);
  assert.ok(codes.includes("compose-uncompiled"));
  assert.ok(codes.includes("ui-component"));
});

test("the fix prompt asks to compile Compose requests", () => {
  const [idea] = scanMarkdown(post());
  const zh = buildFixPrompt([{ file: "content/posts/a.md", block: idea, diagnostics: [] }]);
  assert.match(zh, /compose-uncompiled：围栏类型保持 garden compose/u);
  assert.match(zh, /npx garden ui apply/u);
  const en = buildFixPrompt([{ file: "content/posts/a.md", block: idea, diagnostics: [] }], { lang: "en" });
  assert.match(en, /compose-uncompiled: keep the fence type garden compose/u);
  assert.match(en, /Fix prompt for AI|Handle the Garden post blocks/u);
  assert.match(en, /npx garden ui apply/u);
});

test("ui apply turns an idea into a garden compose and leaves the rest byte-identical", () => {
  const markdown = post().replace('<slidr bind="batch" />', '<slider bind="batch" min={1} max={8} label="batch" />');
  const [idea] = scanMarkdown(markdown);
  const replacement = `${fence}garden compose #kv-grow
caption: batch 翻倍，显存也翻倍。
intent: |
  让读者拧 batch，看 KV 显存怎么涨。
---
{@body const [batch, setBatch] = DIL.useState(1)}
<slider bind="batch" min={1} max={8} label="batch" />
<stat label="batch" value={batch} />
${fence}`;
  const result = applyBlock(markdown, { intentHash: idea.intentHash }, replacement);
  assert.equal(result.kind, "garden");
  assert.equal(result.markdown.slice(0, idea.startLine === 1 ? 0 : markdown.indexOf(`${fence}garden compose\n`)), markdown.slice(0, markdown.indexOf(`${fence}garden compose\n`)));
  assert.ok(result.markdown.endsWith(markdown.slice(markdown.indexOf(`\n\n${fence}garden compose #kv`))));
  assert.deepEqual(scanMarkdown(result.markdown).map((block) => block.status), ["ok", "ok"]);
});

test("ui apply refuses a broken garden compose and an uncompiled idea", () => {
  const [idea] = scanMarkdown(post());
  assert.throws(
    () => applyBlock(post(), { intentHash: idea.intentHash }, `${fence}garden compose #x\ncaption: c\nintent: i\n---\n<slidr />\n${fence}`),
    (error) => error instanceof ApplyError && error.code === "apply-invalid",
  );
  assert.throws(
    () => applyBlock(post(), { intentHash: idea.intentHash }, `正文\n\n${fence}garden compose\n还是想法\n${fence}`),
    (error) => error instanceof ApplyError && error.code === "apply-content",
  );
});

function site(markdown) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "garden-fence-")));
  fs.mkdirSync(path.join(dir, "content/posts"), { recursive: true });
  fs.writeFileSync(path.join(dir, "content/posts/a.md"), markdown);
  return dir;
}

const cli = (dir, ...args) => spawnSync(process.execPath, [path.join(root, "bin/garden.mjs"), "ui", ...args], {
  cwd: dir,
  encoding: "utf8",
  env: { ...process.env, GARDEN_SITE: dir, GARDEN_UI_NO_COPY: "1" },
});

test("garden ui check (the pre-commit hook's command) fails on garden blocks and prints a short skill instruction without exporting a prompt", () => {
  const dir = site(post());
  const result = cli(dir, "check", "content/posts/a.md", "--no-copy");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /content\/posts\/a\.md:9 {2}- {2}compose-uncompiled {2}还有没编译的 compose 想法/u);
  assert.match(result.stderr, /kv {2}ui-component/u);
  assert.match(result.stderr, /garden-compose skill/u);
  assert.doesNotMatch(result.stderr, /发给 AI 的修复提示词|no-verify/u);
  assert.equal(fs.existsSync(path.join(dir, ".garden/ui-fix-prompt.md")), false);
});

test("garden ui check prints English messages when site locale is en", () => {
  const dir = site(post());
  fs.writeFileSync(path.join(dir, "site.config.yaml"), "name: T\nlocale: en_US\n");
  const result = cli(dir, "check", "content/posts/a.md", "--no-copy");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /content\/posts\/a\.md:9 {2}- {2}compose-uncompiled {2}uncompiled compose idea remaining/u);
  assert.doesNotMatch(result.stderr, /Fix prompt for AI|no-verify/u);
  assert.match(result.stderr, /garden-compose skill/u);
  assert.match(result.stderr, /kv {2}ui-component/u);
  assert.equal(fs.existsSync(path.join(dir, ".garden/ui-fix-prompt.md")), false);
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

test("drafts expose Compose requests just like published posts", () => {
  const dir = site(post("draft: true\n").replace('<slidr bind="batch" />', '<slider bind="batch" min={1} max={8} label="batch" />'));
  assert.equal(cli(dir, "check", "content/posts/a.md", "--no-copy").status, 1);
});

// The handbook's end-to-end example (overview and 用 AI 写作) quotes real output.
test("the handbook's AI-writing example matches what the commands print", () => {
  const read = (name) => fs.readFileSync(path.join(root, "docs/handbook", name), "utf8");
  const overview = read("index.md");
  const aiPage = read("ai-writing.md");
  const idea = overview.match(/```garden compose\n(让读者[^\n]+)\n```/u)[1];
  const markdown = `---\ntitle: 慢慢写\ndate: 2026-10-01\ndescription: 一篇长文要写多久。\n---\n\n## 写作节奏\n\n${fence}garden compose\n${idea}\n${fence}\n`;
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
  const interactive = overview.match(/```garden compose #writing-pace\n[\s\S]*?\n```/u)[0];
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
  const enIdea = enOverview.match(/```garden compose\n(Let the reader[^\n]+)\n```/u)[1];
  const enMarkdown = `---\ntitle: Writing pace\ndate: 2026-10-01\ndescription: How long.\n---\n\n## Writing Pace\n\n${fence}garden compose\n${enIdea}\n${fence}\n`;
  const enDir = site(enMarkdown);
  fs.writeFileSync(path.join(enDir, "site.config.yaml"), "name: T\nlocale: en_US\n");
  fs.renameSync(path.join(enDir, "content/posts/a.md"), path.join(enDir, "content/posts/writing-pace.md"));
  const enScan = JSON.parse(cli(enDir, "scan", "content/posts/writing-pace.md").stdout);
  const [enBlock] = enScan.blocks;
  assert.ok(enOverview.includes(`"intentHash": ${JSON.stringify(enBlock.intentHash)}`), enBlock.intentHash);
  const enCheck = cli(enDir, "check", "content/posts/writing-pace.md", "--no-copy");
  assert.match(enCheck.stderr, /uncompiled compose idea remaining/u);
  assert.match(enCheck.stderr, /garden-compose skill/u);
  const enDiagnostic = enCheck.stderr.split("\n")[0];
  assert.ok(enOverview.includes(enDiagnostic) && enAi.includes(enDiagnostic), enDiagnostic);
  for (const line of enCheck.stderr.split("\n").slice(2, 9)) {
    if (line.trim()) assert.ok(enOverview.includes(line), `en overview prompt line: ${line}`);
  }
});


test("Compose diagnostics expose author tags and do not invent ambiguous lowered source positions", () => {
  const source = post();
  const diagnostic = scanMarkdown(source)[1].diagnostics.find(item => item.code === "ui-component");
  assert.match(diagnostic.message, /<slider>/u);
  assert.doesNotMatch(diagnostic.message, /<Slider>/u);
  const duplicate = source.replace('<slidr bind="batch" />', '<slidr bind="batch" />\n<slidr bind="batch" />');
  const block = scanMarkdown(duplicate)[1];
  for (const item of block.diagnostics) assert.equal(item.line, block.startLine);
});
