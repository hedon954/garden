import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(new URL("../", import.meta.url).pathname);

const block = (component) => [
  "---",
  "title: 钩子",
  "date: 2026-07-25",
  "description: 提交前检查",
  "---",
  "",
  "```ui",
  "---",
  "id: knob",
  "caption: 一个可以拧的数。",
  "---",
  "<State n={1} />",
  `<${component} bind="n" label="n" min={1} max={4} />`,
  "```",
  "",
].join("\n");

test("the pre-commit hook refuses a broken staged ui block and judges the staged version", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "garden-hook-"));
  const env = { ...process.env, GARDEN_SITE: "", GARDEN_UI_NO_COPY: "1" };
  const run = (command, args) => spawnSync(command, args, { cwd: repo, encoding: "utf8", env });
  const git = (...args) => run("git", args);
  const commit = (message) => git("commit", "-q", "-m", message).status;
  try {
    git("init", "-q");
    git("config", "user.email", "hook@example.com");
    git("config", "user.name", "hook");
    await mkdir(path.join(repo, "node_modules", ".bin"), { recursive: true });
    await symlink(projectRoot, path.join(repo, "node_modules", "hd-garden"), "dir");
    await symlink(path.join(projectRoot, "bin", "garden.mjs"), path.join(repo, "node_modules", ".bin", "garden"));
    await writeFile(path.join(repo, "package.json"), '{ "private": true }\n');
    await writeFile(path.join(repo, ".gitignore"), "node_modules\n.garden\n");
    await copyFile(path.join(projectRoot, "site.config.yaml"), path.join(repo, "site.config.yaml"));
    assert.equal(run(process.execPath, [path.join(projectRoot, "bin", "garden.mjs"), "hooks"]).status, 0);

    const post = path.join(repo, "content", "posts", "knob.md");
    await mkdir(path.dirname(post), { recursive: true });
    await writeFile(post, block("Slidr"));
    git("add", "-A");
    assert.notEqual(commit("broken"), 0);

    await writeFile(post, block("Slider"));
    assert.notEqual(commit("fixed but not staged"), 0);

    git("add", "-A");
    assert.equal(commit("fixed"), 0);
    assert.equal(git("rev-list", "--count", "HEAD").stdout.trim(), "1");
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
