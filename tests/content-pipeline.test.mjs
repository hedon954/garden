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
    await mkdir(path.join(fixture, "content", "covers"), { recursive: true });
    await mkdir(path.join(fixture, "content", "posts", "writing"), {
      recursive: true,
    });
    await cp(
      path.join(projectRoot, "scripts", "build-content.mjs"),
      path.join(fixture, "scripts", "build-content.mjs"),
    );
    await cp(
      path.join(projectRoot, "site.config.yaml"),
      path.join(fixture, "site.config.yaml"),
    );
    await symlink(
      path.join(projectRoot, "node_modules"),
      path.join(fixture, "node_modules"),
      "dir",
    );
    await writeFile(
      path.join(fixture, "content", "covers", "cover.jpg"),
      "fixture-cover",
    );
    await writeFile(
      path.join(fixture, "content", "posts", "assets", "cover.jpg"),
      "fixture-image",
    );
    await writeFile(
      path.join(fixture, "content", "posts", "published.md"),
      `---
title: 已发布文章
description: 验证内容发布管线
date: 2026-07-25
topic: 测试
cover: cover.jpg
---

![本地图片](./assets/cover.jpg)
`,
    );
    await writeFile(
      path.join(fixture, "content", "posts", "draft.md"),
      `---
title: 草稿文章
description: 不应出现在正式构建
date: 2026-07-25
topic: 测试
draft: true
---

草稿正文
`,
    );
    await writeFile(
      path.join(fixture, "content", "posts", "writing", "nested.md"),
      `---
title: 子目录文章
description: 验证多级目录中的博文。
date: 2026-07-25
topic: 测试
---

这篇文章放在多级目录中。
`,
    );
    await writeFile(
      path.join(fixture, "content", "columns.yaml"),
      `columns:
  - slug: writing
    title: 写作练习
    description: 从一篇文章开始。
    posts:
      - writing/nested
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
      path.join(fixture, ".garden", "generated-content.ts"),
      "utf8",
    );
    const generatedConfig = await readFile(
      path.join(fixture, ".garden", "site-config.ts"),
      "utf8",
    );
    assert.match(generatedConfig, /export const siteConfig/);
    assert.match(generated, /"slug": "published"/);
    assert.match(generated, /"sourcePath": "posts\/writing\/nested\.md"/);
    assert.doesNotMatch(generated, /"slug": "draft"/);
    assert.match(generated, /"column": "writing"/);
    assert.match(generated, /\/media\/covers\/cover\.jpg/);
    assert.match(generated, /\/media\/posts\/assets\/cover\.jpg/);
    const postsFeed = await readFile(path.join(fixture, "public", "posts.xml"), "utf8");
    assert.match(postsFeed, /<lastBuildDate>Sat, 25 Jul 2026 00:00:00 GMT<\/lastBuildDate>/);
    assert.doesNotMatch(postsFeed, /草稿文章/);
    await access(path.join(fixture, "public", "media", "covers", "cover.jpg"));
    await access(
      path.join(fixture, "public", "media", "posts", "assets", "cover.jpg"),
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("GARDEN_SITE writes generated files into the site, not the process cwd", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "garden-site-"));
  try {
    await mkdir(path.join(fixture, "content", "posts"), { recursive: true });
    await mkdir(path.join(fixture, "public"), { recursive: true });
    await cp(
      path.join(projectRoot, "site.config.yaml"),
      path.join(fixture, "site.config.yaml"),
    );
    await writeFile(
      path.join(fixture, "content", "posts", "isolated.md"),
      `---
title: Isolated
date: 2026-07-25
description: 站点隔离
topic: 测试
draft: false
---

正文。
`,
    );
    await execFileAsync(
      process.execPath,
      [path.join(projectRoot, "scripts", "build-content.mjs")],
      {
        cwd: projectRoot,
        env: { ...process.env, GARDEN_SITE: fixture, CONTENT_INCLUDE_DRAFTS: "0" },
      },
    );
    const generated = await readFile(
      path.join(fixture, ".garden", "generated-content.ts"),
      "utf8",
    );
    assert.match(generated, /"slug": "isolated"/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
