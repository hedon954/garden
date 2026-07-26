import assert from "node:assert/strict";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(new URL("../", import.meta.url).pathname);

test("content pipeline validates metadata, excludes drafts, and publishes Typora assets", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "hedon-content-"));
  try {
    await mkdir(path.join(fixture, "scripts"), { recursive: true });
    await mkdir(path.join(fixture, "content", "posts", "assets"), {
      recursive: true,
    });
    await cp(
      path.join(projectRoot, "scripts", "build-content.mjs"),
      path.join(fixture, "scripts", "build-content.mjs"),
    );
    await cp(
      path.join(projectRoot, "site.config.json"),
      path.join(fixture, "site.config.json"),
    );
    await symlink(
      path.join(projectRoot, "node_modules"),
      path.join(fixture, "node_modules"),
      "dir",
    );
    await writeFile(
      path.join(fixture, "content", "posts", "assets", "cover.jpg"),
      "fixture-image",
    );
    await writeFile(
      path.join(fixture, "content", "posts", "published.md"),
      `---
title: 已发布文章
slug: published
description: 验证内容发布管线
date: 2026-07-25
topic: 测试
cover: ./assets/cover.jpg
---

![本地图片](./assets/cover.jpg)
`,
    );
    await writeFile(
      path.join(fixture, "content", "posts", "draft.md"),
      `---
title: 草稿文章
slug: draft
description: 不应出现在正式构建
date: 2026-07-25
topic: 测试
draft: true
---

草稿正文
`,
    );

    await execFileAsync(
      process.execPath,
      [path.join(fixture, "scripts", "build-content.mjs")],
      {
        cwd: fixture,
        env: { ...process.env, CONTENT_INCLUDE_DRAFTS: "0" },
      },
    );

    const generated = await readFile(
      path.join(fixture, "app", "lib", "generated-content.ts"),
      "utf8",
    );
    assert.match(generated, /"slug": "published"/);
    assert.doesNotMatch(generated, /"slug": "draft"/);
    assert.match(generated, /\/media\/posts\/assets\/cover\.jpg/);
    await access(
      path.join(fixture, "public", "media", "posts", "assets", "cover.jpg"),
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
