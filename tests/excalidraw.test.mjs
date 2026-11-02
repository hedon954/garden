import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { renderFilePreview } from "../scripts/file-preview.mjs";
import {
  ensureExcalidrawSvg,
  ExcalidrawExportError,
  isExcalidrawPath,
  siblingSvgPath,
  sourceHash,
} from "../scripts/excalidraw.mjs";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(new URL("../", import.meta.url).pathname);
const fixture = path.join(projectRoot, "tests", "fixtures", "excalidraw-note.excalidraw");

async function siteFixture(name) {
  const root = await mkdtemp(path.join(os.tmpdir(), name));
  await mkdir(path.join(root, "content", "posts", "assets"), { recursive: true });
  await mkdir(path.join(root, "public"), { recursive: true });
  await cp(path.join(projectRoot, "site.config.yaml"), path.join(root, "site.config.yaml"));
  return root;
}

function runContentBuild(root) {
  return execFileAsync(process.execPath, [path.join(projectRoot, "scripts", "build-content.mjs")], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GARDEN_SITE: root, CONTENT_INCLUDE_DRAFTS: "0" },
  });
}

async function postBody(root, slug) {
  const generated = await readFile(path.join(root, ".garden", "generated-content.ts"), "utf8");
  const posts = JSON.parse(generated.match(/export const posts = ([\s\S]*?) as ContentEntry\[\];/u)[1]);
  return posts.find((post) => post.slug === slug).content;
}

function tempDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

function writeFlat(file, label) {
  fs.writeFileSync(
    file,
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><text>${label}</text></svg>`,
  );
}

test("sibling SVG names drop only the .excalidraw suffix", () => {
  assert.equal(siblingSvgPath("posts/flow.excalidraw"), "posts/flow.svg");
  assert.equal(siblingSvgPath("posts/my.flow.EXCALIDRAW"), "posts/my.flow.svg");
  assert.equal(isExcalidrawPath("./assets/flow.excalidraw?v=1"), true);
  assert.equal(isExcalidrawPath("./assets/flow.excalidraw.svg"), false);
  assert.equal(isExcalidrawPath("./assets/flow.svg"), false);
});

test("a stale sibling SVG is deleted before it is regenerated", () => {
  const dir = tempDir("excal-stale-");
  try {
    const source = path.join(dir, "box.excalidraw");
    const svg = siblingSvgPath(source);
    fs.writeFileSync(source, "{\"type\":\"excalidraw\"}\n");
    fs.writeFileSync(svg, `<svg xmlns="http://www.w3.org/2000/svg"><text>STALE</text></svg>`);
    let sawMissing = false;
    ensureExcalidrawSvg(source, {
      render(_input, output) {
        sawMissing = !fs.existsSync(output);
        writeFlat(output, "NEW");
      },
    });
    assert.equal(sawMissing, true);
    const text = fs.readFileSync(svg, "utf8");
    assert.match(text, />NEW</u);
    assert.doesNotMatch(text, /STALE/u);
    assert.match(text, new RegExp(`garden-excalidraw-source:${sourceHash(fs.readFileSync(source))}`, "u"));
    let called = false;
    ensureExcalidrawSvg(source, {
      render() {
        called = true;
      },
    });
    assert.equal(called, false);
    assert.equal(fs.readFileSync(svg, "utf8"), text);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("an embedded scene with a matching stamp is still replaced", () => {
  const dir = tempDir("excal-embed-");
  try {
    const source = path.join(dir, "box.excalidraw");
    const svg = siblingSvgPath(source);
    const bytes = Buffer.from("{\"type\":\"excalidraw\",\"elements\":[]}\n");
    fs.writeFileSync(source, bytes);
    const hash = sourceHash(bytes);
    fs.writeFileSync(
      svg,
      `<!-- garden-excalidraw-source:${hash} --><svg xmlns="http://www.w3.org/2000/svg"><metadata><!-- payload-start -->abc</metadata></svg>`,
    );
    ensureExcalidrawSvg(source, {
      render(_input, output) {
        writeFlat(output, "FLAT");
      },
    });
    const text = fs.readFileSync(svg, "utf8");
    assert.match(text, />FLAT</u);
    assert.doesNotMatch(text, /payload-start/u);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a failed export removes the sibling SVG and records the source path", () => {
  const dir = tempDir("excal-fail-");
  try {
    const source = path.join(dir, "box.excalidraw");
    const svg = siblingSvgPath(source);
    fs.writeFileSync(source, "{}\n");
    fs.writeFileSync(svg, `<svg xmlns="http://www.w3.org/2000/svg"><text>STALE</text></svg>`);
    assert.throws(
      () => ensureExcalidrawSvg(source, {
        render() {
          throw new Error("renderer exploded");
        },
      }),
      (error) => {
        assert.ok(error instanceof ExcalidrawExportError);
        assert.equal(error.code, "export-failed");
        assert.equal(error.file, source);
        return true;
      },
    );
    assert.equal(fs.existsSync(svg), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing source fails before any SVG is written", () => {
  const dir = tempDir("excal-missing-");
  try {
    const source = path.join(dir, "gone.excalidraw");
    assert.throws(
      () => ensureExcalidrawSvg(source, {
        render() {
          throw new Error("should not render");
        },
      }),
      (error) => {
        assert.ok(error instanceof ExcalidrawExportError);
        assert.equal(error.code, "missing-source");
        assert.equal(error.file, source);
        return true;
      },
    );
    assert.equal(fs.existsSync(siblingSvgPath(source)), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("offline mode does not download a missing exporter", () => {
  const dir = tempDir("excal-offline-");
  const home = tempDir("excal-home-");
  try {
    const source = path.join(dir, "box.excalidraw");
    fs.writeFileSync(source, "{}\n");
    assert.throws(
      () => ensureExcalidrawSvg(source, { env: { GARDEN_OFFLINE: "1" }, homedir: home }),
      (error) => {
        assert.ok(error instanceof ExcalidrawExportError);
        assert.equal(error.code, "offline");
        return true;
      },
    );
    assert.equal(fs.existsSync(siblingSvgPath(source)), false);
    assert.equal(fs.readdirSync(home).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("a fixture .excalidraw exports a flat SVG with the label and inlined fonts", { timeout: 180_000 }, () => {
  const dir = tempDir("excal-smoke-");
  try {
    const source = path.join(dir, "note.excalidraw");
    fs.copyFileSync(fixture, source);
    const svg = ensureExcalidrawSvg(source);
    const text = fs.readFileSync(svg, "utf8");
    assert.match(text, /<svg[\s>]/u);
    assert.match(text, /园子/u);
    assert.match(text, /data:font\/woff2/u);
    assert.doesNotMatch(text, /payload-start/u);
    assert.doesNotMatch(text, /application\/vnd\.excalidraw\+json/u);
    assert.doesNotMatch(text, /excalidraw\.com|unpkg\.com|jsdelivr\.net|fonts\.googleapis\.com/u);
    assert.match(text, new RegExp(`garden-excalidraw-source:${sourceHash(fs.readFileSync(source))}`, "u"));
    const again = fs.readFileSync(svg, "utf8");
    ensureExcalidrawSvg(source);
    assert.equal(fs.readFileSync(svg, "utf8"), again);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("article code does not import the Excalidraw editor", () => {
  const app = path.join(projectRoot, "app");
  const files = [];
  const stack = [app];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(?:tsx?|jsx?|mjs)$/u.test(entry.name)) files.push(full);
    }
  }
  assert.ok(files.length > 10);
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /@excalidraw\/excalidraw/u, file);
  }
});

test("garden content build rewrites .excalidraw images to a flat SVG and replaces a stale one", { timeout: 180_000 }, async () => {
  const root = await siteFixture("excal-build-");
  try {
    const source = path.join(root, "content", "posts", "assets", "note.excalidraw");
    await cp(fixture, source);
    await writeFile(path.join(root, "content", "posts", "sketch.md"), `---
title: 草图
description: Excalidraw 在构建时变成 SVG
date: 2026-11-02
---

![说明](./assets/note.excalidraw)

<img src="./assets/note.excalidraw" alt="说明">
`);
    await runContentBuild(root);
    const body = await postBody(root, "sketch");
    assert.match(body, /\/media\/posts\/assets\/note\.svg/u);
    assert.doesNotMatch(body, /\.excalidraw/u);
    const html = renderFilePreview(body);
    const srcs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gu)].map((match) => match[1]);
    assert.deepEqual(srcs, ["/media/posts/assets/note.svg", "/media/posts/assets/note.svg"]);
    const sibling = path.join(root, "content", "posts", "assets", "note.svg");
    const published = path.join(root, "public", "media", "posts", "assets", "note.svg");
    assert.match(await readFile(sibling, "utf8"), /园子/u);
    assert.match(await readFile(published, "utf8"), /园子/u);

    await writeFile(sibling, `<svg xmlns="http://www.w3.org/2000/svg"><text>STALE</text></svg>`);
    await writeFile(source, (await readFile(source, "utf8")).replaceAll("园子", "新图"));
    await runContentBuild(root);
    const next = await readFile(sibling, "utf8");
    assert.match(next, /新图/u);
    assert.doesNotMatch(next, /STALE|园子/u);
    const publishedNext = await readFile(published, "utf8");
    assert.match(publishedNext, /新图/u);
    assert.doesNotMatch(publishedNext, /STALE/u);
    assert.doesNotMatch(await postBody(root, "sketch"), /\.excalidraw/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a missing .excalidraw fails the content build with the path", async () => {
  const root = await siteFixture("excal-gone-");
  try {
    await writeFile(path.join(root, "content", "posts", "sketch.md"), `---
title: 缺图
description: 源文件不存在
date: 2026-11-02
---

![说明](./assets/gone.excalidraw)
`);
    await assert.rejects(runContentBuild(root), (error) => {
      const output = `${error.stderr ?? ""}\n${error.stdout ?? ""}`;
      assert.match(output, /\[excalidraw:missing-source\]/u);
      assert.match(output, /gone\.excalidraw/u);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an unreadable .excalidraw fails the content build with the path and the exporter reason", { timeout: 180_000 }, async () => {
  const root = await siteFixture("excal-bad-");
  try {
    const source = path.join(root, "content", "posts", "assets", "broken.excalidraw");
    await writeFile(source, "{\n");
    await writeFile(path.join(root, "content", "posts", "sketch.md"), `---
title: 坏图
description: 源文件不是场景
date: 2026-11-02
---

![说明](./assets/broken.excalidraw)
`);
    await assert.rejects(runContentBuild(root), (error) => {
      const output = `${error.stderr ?? ""}\n${error.stdout ?? ""}`;
      assert.match(output, /\[excalidraw:export-failed\]/u);
      assert.match(output, /broken\.excalidraw/u);
      assert.match(output, /SyntaxError/u);
      return true;
    });
    assert.equal(fs.existsSync(siblingSvgPath(source)), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
