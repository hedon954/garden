import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import matter from "gray-matter";

const exec = promisify(execFile);
const project = fileURLToPath(new URL("../", import.meta.url));

async function fork(t) {
  const root = await mkdtemp(path.join(tmpdir(), "garden-fork-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "scripts"));
  for (const file of ["Makefile", "scripts/new-post.mjs", "scripts/site-date.mjs"]) {
    await cp(path.join(project, file), path.join(root, file));
  }
  // Deliberately no node_modules, .env.local, site configuration or Git remote.
  return root;
}

function run(root, args = []) {
  return exec("make", ["new", ...args], { cwd: root });
}

test("a fresh fork can run bare make new repeatedly without npm setup", async (t) => {
  const root = await fork(t);
  await run(root);
  await run(root);
  const posts = path.join(root, "content/posts");
  const files = await readdir(posts);
  assert.equal(files.length, 2);
  for (const file of files) {
    const source = await readFile(path.join(posts, file), "utf8");
    const { data } = matter(source);
    assert.equal(data.title, "新文章");
    assert.equal(data.draft, true);
    assert.equal(data.topic, "未分类");
    assert.ok(data.description);
    assert.match(source, /^date: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/m);
    assert.equal(data.slug, undefined);
    assert.match(file, /^post-\d{4}-\d{2}-\d{2}-[a-f0-9]{8}\.md$/u);
  }
  assert.deepEqual((await readdir(root)).sort(), ["Makefile", "content", "scripts"]);
});

test("make passes title literally and creates nested, valid front matter", async (t) => {
  const root = await fork(t);
  const title = 'SFT: "笔记" #1\n$(shell touch injected) `touch injected` $HOME';
  const { stdout } = await run(root, [
    `TITLE=${title}`, "SLUG=sft-notes", "DIR=ai/学习", "TOPIC=AI: 学习",
  ]);
  const filename = path.join(root, "content/posts/ai/学习/sft-notes.md");
  const content = await readFile(filename, "utf8");
  const { data } = matter(content);
  assert.equal(data.title, title);
  assert.equal(data.topic, "AI: 学习");
  assert.match(stdout, /\/blog\/ai\/学习\/sft-notes\//u);
  assert.ok(!(await readdir(root)).includes("injected"));
  await assert.rejects(run(root, ["SLUG=sft-notes", "DIR=ai/学习"]), /文章已存在/u);
  assert.equal(await readFile(filename, "utf8"), content);
});

test("English titles generate slugs and Chinese titles get usable fallback slugs", async (t) => {
  const root = await fork(t);
  await run(root, ["TITLE=Hello, Garden!"]);
  await run(root, ["TITLE=我的文章"]);
  const files = await readdir(path.join(root, "content/posts"));
  assert.ok(files.includes("hello-garden.md"));
  assert.ok(files.some((file) => /^post-\d{4}-\d{2}-\d{2}-[a-f0-9]{8}\.md$/u.test(file)));
});

test("invalid paths and symlinks cannot write outside the article directory", async (t) => {
  const root = await fork(t);
  for (const argument of ["SLUG=../escape", "SLUG=post.md", "DIR=../escape", "DIR=/tmp", "DIR=ai//notes"]) {
    await assert.rejects(run(root, [argument]), /创建失败/u);
  }
  await mkdir(path.join(root, "content/posts"), { recursive: true });
  const outside = path.join(root, "outside");
  await mkdir(outside);
  await symlink(outside, path.join(root, "content/posts/link"));
  await assert.rejects(run(root, ["DIR=link", "SLUG=escape"]), /不支持符号链接/u);
  assert.deepEqual(await readdir(outside), []);
});

test("generated articles pass the real pipeline and are excluded from public output", async (t) => {
  const root = await fork(t);
  await run(root, ["TITLE=管线验证", "SLUG=pipeline", "DIR=notes"]);
  await mkdir(path.join(root, "public"));
  await cp(path.join(project, "scripts/build-content.mjs"), path.join(root, "scripts/build-content.mjs"));
  await cp(path.join(project, "site.config.yaml"), path.join(root, "site.config.yaml"));
  await symlink(path.join(project, "node_modules"), path.join(root, "node_modules"));
  const output = path.join(root, ".garden/generated-content.ts");
  for (const includeDrafts of ["0", "1"]) {
    await exec(process.execPath, ["scripts/build-content.mjs"], {
      cwd: root, env: { ...process.env, CONTENT_INCLUDE_DRAFTS: includeDrafts },
    });
    const generated = await readFile(output, "utf8");
    assert.equal(generated.includes('"path": "notes/pipeline"'), includeDrafts === "1");
    if (includeDrafts === "1") {
      assert.match(generated, /"date": "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00"/);
    }
  }
});
