import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const project = fileURLToPath(new URL("../", import.meta.url));

async function site(t) {
  const root = await mkdtemp(path.join(tmpdir(), "garden-check-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "content", "posts"), { recursive: true });
  await writeFile(path.join(root, "site.config.yaml"), "name: Test\n");
  return root;
}

function post(body) {
  return `---
title: 测试
description: 一篇用来检查结构的文章。
date: 2026-09-18 14:39:00
${body}`;
}

async function check(root, markdown) {
  const file = path.join(root, "content", "posts", "sample.md");
  await writeFile(file, markdown);
  try {
    const { stdout } = await exec(process.execPath, [path.join(project, "scripts/check-post.mjs"), "content/posts/sample.md"], {
      cwd: root,
      env: { ...process.env, GARDEN_SITE: root },
    });
    return JSON.parse(stdout);
  } catch (error) {
    return JSON.parse(error.stdout);
  }
}

const codes = (result) => result.results[0].errors.map((item) => item.code);
const warnings = (result) => result.results[0].warnings.map((item) => item.code);

test("an older ISO timestamp still passes", async (t) => {
  const root = await site(t);
  const result = await check(root, `---
title: 测试
description: 一篇用来检查结构的文章。
date: 2026-09-18T14:39:00+08:00
---

## 正文
`);
  assert.equal(result.ok, true);
  assert.deepEqual(codes(result), []);
});

test("a leftover topic line is ignored without an error or a warning", async (t) => {
  const root = await site(t);
  const result = await check(root, post(`topic: 旧字段
---

## 正文
`));
  assert.equal(result.ok, true);
  assert.deepEqual(codes(result), []);
  assert.deepEqual(warnings(result), []);
});

test("a post with a matched external link passes", async (t) => {
  const root = await site(t);
  const result = await check(root, post(`references:
  - title: KCP repo
    url: https://github.com/skywind3000/kcp
---

## 正文

见 [KCP repo](https://github.com/skywind3000/kcp)。
`));
  assert.equal(result.ok, true);
  assert.deepEqual(codes(result), []);
});

test("structure errors use stable codes and leave translated bibliographies alone", async (t) => {
  const root = await site(t);
  const broken = await check(root, `---
title: 测试
description: 一篇用来检查结构的文章。
date: not-a-date
slug: sample
references:
  - title: KCP repo
    url: https://github.com/skywind3000/kcp
  - title: KCP repo
    url: https://github.com/skywind3000/kcp
---

# 标题

见 [别处](https://example.com/post)。

## 参考

## 下一节

#### 跳级
`);
  assert.equal(broken.ok, false);
  assert.deepEqual(codes(broken).sort(), [
    "date-format",
    "heading-h1",
    "heading-skip",
    "reference-duplicate",
    "reference-heading",
    "unexpected-slug",
  ]);

  const translated = await check(root, post(`---

## 参考文献

[1] 一篇留在正文里的译文文献。
`));
  assert.equal(translated.ok, true);
});

test("a title splits at the first separator and warns only for an empty side", async (t) => {
  const root = await site(t);
  const article = (title) => `---
title: ${title}
description: 一篇用来检查结构的文章。
date: 2026-09-18 14:39:00
---

## 正文
`;
  const several = await check(root, article("FOSA丨01丨xxx"));
  assert.equal(several.ok, true);
  assert.deepEqual(codes(several), []);
  assert.deepEqual(warnings(several), []);

  const empty = await check(root, article("只有左边丨"));
  assert.equal(empty.ok, true);
  assert.deepEqual(codes(empty), []);
  assert.deepEqual(warnings(empty), ["title-split"]);

  const split = await check(root, article("Rust 实战丨手写一个 SpinLock"));
  assert.equal(split.ok, true);
  assert.deepEqual(warnings(split), []);
});

test("Markdown in a post's same-name folder is named, unless the post offers it as a file", async (t) => {
  const root = await site(t);
  const folder = path.join(root, "content", "posts", "sample");
  await mkdir(path.join(folder, "old"), { recursive: true });
  await writeFile(path.join(folder, "notes.md"), "---\ntitle: 笔记\n---\n\n正文\n");
  await writeFile(path.join(folder, "old", "former-post.md"), "---\ntitle: 以前的一篇\n---\n");
  await writeFile(path.join(folder, "kit.zip"), "zip");
  const result = await check(root, post(`---

## 正文

\`\`\`garden file
src: ./sample/notes.md
\`\`\`
`));
  assert.equal(result.ok, true, JSON.stringify(result));
  const found = result.results[0].warnings.filter((item) => item.code === "folder-markdown");
  assert.equal(found.length, 1, JSON.stringify(found));
  assert.match(found[0].message, /^content\/posts\/sample\/old\/former-post\.md: 在 content\/posts\/sample\.md 的同名目录里，不会作为文章发布/u);
  assert.match(found[0].message, /把它移出 content\/posts\/sample\//u);

  // Checked on its own, the file in the folder says the same.
  let direct;
  try {
    ({ stdout: direct } = await exec(process.execPath, [path.join(project, "scripts/check-post.mjs"), "content/posts/sample/old/former-post.md"], {
      cwd: root,
      env: { ...process.env, GARDEN_SITE: root },
    }));
  } catch (error) {
    direct = error.stdout;
  }
  const own = JSON.parse(direct).results[0].warnings.filter((item) => item.code === "folder-markdown");
  assert.equal(own.length, 1);
  assert.match(own[0].message, /former-post\.md: 在 content\/posts\/sample\.md 的同名目录里/u);

  // A post without a folder, or whose folder holds no stray Markdown, gets no such warning.
  await rm(path.join(folder, "old"), { recursive: true });
  const clean = await check(root, post(`---

\`\`\`garden file
src: ./sample/notes.md
\`\`\`
`));
  assert.deepEqual(clean.results[0].warnings.filter((item) => item.code === "folder-markdown"), []);
});

test("images in angle brackets: remote ones pass, local ones with spaces and parentheses are found or reported whole", async (t) => {
  const root = await site(t);
  await mkdir(path.join(root, "content", "posts", "shots"), { recursive: true });
  await writeFile(path.join(root, "content", "posts", "shots", "my shot (1).png"), "png");
  const ok = await check(root, post(`---

## 正文

![远程](<https://oss.example.com/img/image%20(1).png>)

![本地](<./shots/my shot (1).png> "标题")

![不带尖括号](./shots/my%20shot%20(1).png)
`));
  assert.deepEqual(codes(ok), []);
  const missing = await check(root, post(`---

## 正文

![缺失](<./shots/gone (2).png>)
`));
  assert.deepEqual(codes(missing), ["missing-asset"]);
  assert.match(missing.results[0].errors[0].message, /gone \(2\)\.png/u);
});
