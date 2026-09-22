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
topic: 测试
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
date: 2026-09-18T14:39:00+08:00
topic: 测试
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
