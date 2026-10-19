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
    for (const script of ["site-date.mjs", "link-assets.mjs", "link-meta-core.mjs", "cover-images.mjs", "brand.mjs", "image-sizes.mjs", "file-sizes.mjs", "file-preview.mjs"]) {
      await cp(path.join(projectRoot, "scripts", script), path.join(fixture, "scripts", script));
    }
    await cp(
      path.join(projectRoot, "site.config.yaml"),
      path.join(fixture, "site.config.yaml"),
    );
    await symlink(
      path.join(projectRoot, "node_modules"),
      path.join(fixture, "node_modules"),
      "dir",
    );
    await symlink(path.join(projectRoot, "ui"), path.join(fixture, "ui"), "dir");
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
topic: 旧字段
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

    const build = await execFileAsync(
      process.execPath,
      [path.join(fixture, "scripts", "build-content.mjs")],
      {
        cwd: fixture,
        env: { ...process.env, CONTENT_INCLUDE_DRAFTS: "0" },
      },
    );
    // A leftover `topic:` line is ignored without an error or a warning.
    assert.doesNotMatch(build.stdout + build.stderr, /topic/i);

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
    assert.doesNotMatch(generated, /topic|旧字段/);
    assert.match(generated, /"column": "writing"/);
    assert.match(generated, /\/media\/covers\/cover\.jpg/);
    assert.match(generated, /\/media\/posts\/assets\/cover\.jpg/);
    const postsFeed = await readFile(path.join(fixture, "public", "posts.xml"), "utf8");
    assert.match(postsFeed, /<lastBuildDate>Fri, 24 Jul 2026 16:00:00 GMT<\/lastBuildDate>/);
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

test("angle-bracket destinations survive the build: spaces and parentheses, local and remote", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "hedon-angle-"));
  try {
    await mkdir(path.join(fixture, "scripts"), { recursive: true });
    await mkdir(path.join(fixture, "content", "posts", "shots"), { recursive: true });
    for (const script of ["build-content.mjs", "site-date.mjs", "link-assets.mjs", "link-meta-core.mjs", "cover-images.mjs", "brand.mjs", "image-sizes.mjs", "file-sizes.mjs", "file-preview.mjs"]) {
      await cp(path.join(projectRoot, "scripts", script), path.join(fixture, "scripts", script));
    }
    await cp(path.join(projectRoot, "site.config.yaml"), path.join(fixture, "site.config.yaml"));
    await symlink(path.join(projectRoot, "node_modules"), path.join(fixture, "node_modules"), "dir");
    await symlink(path.join(projectRoot, "ui"), path.join(fixture, "ui"), "dir");
    await writeFile(path.join(fixture, "content", "posts", "shots", "my shot (1).svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="2"/>');
    await writeFile(
      path.join(fixture, "content", "posts", "angle.md"),
      `---
title: 尖括号地址
description: 验证尖括号包住的图片和链接地址
date: 2026-10-19
---

![远程图片](<https://oss.example.com/img/image%20(1).png>)

![带标题](<https://oss.example.com/img/output (2).png> "标题")

![本地图片](<./shots/my shot (1).svg>)

[维基百科](<https://en.wikipedia.org/wiki/Trie_(data_structure)>) 和 [没有尖括号](https://en.wikipedia.org/wiki/Trie_(data_structure))
`,
    );
    await execFileAsync(process.execPath, [path.join(fixture, "scripts", "build-content.mjs")], { cwd: fixture, env: { ...process.env, CONTENT_INCLUDE_DRAFTS: "0" } });
    const generated = await readFile(path.join(fixture, ".garden", "generated-content.ts"), "utf8");
    const posts = JSON.parse(generated.match(/export const posts = ([\s\S]*?) as ContentEntry\[\];/u)[1]);
    const body = posts.find((post) => post.slug === "angle").content;
    // The brackets stay; the local file is published and its new address is bracketed too.
    assert.match(body, /!\[远程图片\]\(<https:\/\/oss\.example\.com\/img\/image%20\(1\)\.png>\)/u);
    assert.match(body, /!\[带标题\]\(<https:\/\/oss\.example\.com\/img\/output \(2\)\.png> "标题"\)/u);
    assert.match(body, /!\[本地图片\]\(<\/media\/posts\/shots\/my-shot-1-\.svg>\)/u);
    await access(path.join(fixture, "public", "media", "posts", "shots", "my-shot-1-.svg"));
    // Read as the article reads it: every address whole, nothing glued on.
    const { renderFilePreview } = await import("../scripts/file-preview.mjs");
    const html = renderFilePreview(body);
    const srcs = [...html.matchAll(/<img [^>]*src="([^"]*)"/gu)].map((match) => match[1]);
    assert.deepEqual(srcs, ["https://oss.example.com/img/image%20(1).png", "https://oss.example.com/img/output%20(2).png", "/media/posts/shots/my-shot-1-.svg"]);
    assert.doesNotMatch(html, /%3E|&gt;\)/u);
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]*)"/gu)].map((match) => match[1]);
    assert.deepEqual(hrefs, ["https://en.wikipedia.org/wiki/Trie_(data_structure)", "https://en.wikipedia.org/wiki/Trie_(data_structure)"]);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
