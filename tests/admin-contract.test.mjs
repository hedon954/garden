import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { withPostPinned } from "../ui/garden/post-frontmatter.mjs";
import { evaluateWorkbenchDraft } from "../ui/core/workbench-eval.mjs";
import { COMPOSE_EXAMPLE_BODY } from "../ui/compose/examples.mjs";
import { rewriteArticleMedia } from "../ui/garden/article-assets.mjs";
import { previewAssetType, isRepositoryManuscript } from "../app/lib/repository-path.mjs";

const fence = body => "```garden compose\n" + body + "\n```";

test("Admin pin edits only its boolean scalar, preserving current book metadata, comments, exact body and line endings", () => {
  for (const eol of ["\n", "\r\n"]) {
    const source = "\ufeff" + ["---", "title: 'A book: two notes' # keep", "date: 2026-11-09", "cover: ./post/article.webp", "book:", "  title: A book", "  cover: ./post/book.webp", "pinned: false # retain this comment", "custom: {unknown: [1, 2]}", "---", "", "Body with trailing spaces  ", "", "\n"].join(eol);
    const pinned = withPostPinned(source, true);
    assert.equal(pinned, source.replace("pinned: false", "pinned: true"));
    assert.equal(withPostPinned(pinned, true), pinned);
    assert.equal(withPostPinned(pinned, false), source);
  }
});

test("Admin pin inserts a missing scalar without reserializing mapping or touching body", () => {
  for (const yaml of ["title: Test # exact", "{title: Test}", "{}"]) {
    const source = "---\r\n" + yaml + "\r\n---\r\nBody\n";
    assert.equal(withPostPinned(source, false), source);
    const pinned = withPostPinned(source, true);
    assert.match(pinned, /pinned: true/u);
    assert.ok(pinned.endsWith("---\r\nBody\n"));
    assert.equal(withPostPinned(pinned, true), pinned);
  }
  assert.throws(() => withPostPinned("Body\n", true), /Front Matter/u);
  assert.throws(() => withPostPinned("---\npinned: yes\n---\nBody", false), /布尔/u);
  assert.throws(() => withPostPinned("---\npinned: true\npinned: false\n---\nBody", true), /Front Matter/u);
});

test("Admin manuscript discovery excludes nested same-name attachments, not real book notes", () => {
  const paths = new Set(["content/posts/book/first.md", "content/posts/book/first/attachment.md", "content/posts/book/first/sub/deep.md", "content/posts/book/second.md", "content/posts/book/unrelated/note.md", "content/columns/books.md"]);
  assert.equal(isRepositoryManuscript("content/posts/book/first.md", paths), true);
  assert.equal(isRepositoryManuscript("content/posts/book/first/attachment.md", paths), false);
  assert.equal(isRepositoryManuscript("content/posts/book/first/sub/deep.md", paths), false);
  assert.equal(isRepositoryManuscript("content/posts/book/second.md", paths), true);
  assert.equal(isRepositoryManuscript("content/posts/book/unrelated/note.md", paths), true);
  assert.equal(isRepositoryManuscript("content/columns/books.md", paths), false);
});

test("Admin eval uses real unified Compose syntax and recognizes native and interactive tags", () => {
  const native = evaluateWorkbenchDraft({ fence: fence(COMPOSE_EXAMPLE_BODY) }, { components: ["Steps"] });
  assert.equal(native.valid, true, JSON.stringify(native));
  assert.equal(native.components, true, JSON.stringify(native));
  const play = evaluateWorkbenchDraft({ fence: fence('caption: Move the value\n---\n{@body const [n, setN] = DIL.useState(2)}\n<slider label="Quantity" min={1} max={8} value={n} onChange={setN}/>\nResult: {n}') }, { components: ["Slider"] });
  assert.equal(play.valid, true, JSON.stringify(play));
  assert.equal(play.components, true, JSON.stringify(play));
  assert.equal(evaluateWorkbenchDraft({ fence: '```ui\n<Slider/>\n```' }).valid, false);
  assert.equal(evaluateWorkbenchDraft({ fence: fence('<card>Text</card>') + "\n" + fence('<card>Another</card>') }).valid, false);
});

test("Admin eval never accepts component names merely quoted in code or prose", () => {
  const result = evaluateWorkbenchDraft({ fence: fence('<card>Example text: Slider and &lt;slider /&gt;</card>') }, { components: ["Slider"] });
  assert.equal(result.valid, true);
  assert.equal(result.components, false);
  assert.equal(result.ok, false);
});


test("actual Admin repository modules preserve both identical-source note paths, ignore attachments and make pin writes byte minimal", async () => {
  const dir = fs.mkdtempSync(path.resolve(".garden/admin-contract-"));
  const previousFetch = globalThis.fetch;
  const keys = ["CONTENT_REPOSITORY", "CONTENT_GITHUB_TOKEN", "CONTENT_BRANCH", "GITHUB_API_URL"];
  const previousEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    await build({ entryPoints: ["app/lib/ui-content.ts", "app/lib/github-content.ts"], outdir: dir, bundle: true, packages: "external", platform: "node", format: "esm", outExtension: { ".js": ".mjs" } });
    Object.assign(process.env, { CONTENT_REPOSITORY: "neutral/site", CONTENT_GITHUB_TOKEN: "test-not-a-token", CONTENT_BRANCH: "main", GITHUB_API_URL: "https://github.invalid" });
    const manuscript = "---\ntitle: A book\ndate: 2026-01-01\nbook: {title: Same book, cover: ./entry/book.png} # retain\npinned: false # exact\n---\n" + fence(COMPOSE_EXAMPLE_BODY) + "\n";
    const writes = [];
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(input);
      assert.equal(url.origin, "https://github.invalid", "No request may leave the in-memory fake");
      const json = value => Response.json(value);
      if (url.pathname.endsWith("/git/trees/main")) return json({ tree: [
        { path: "content/posts/book/first.md", type: "blob", sha: "identical" },
        { path: "content/posts/book/second.md", type: "blob", sha: "identical" },
        { path: "content/posts/book/first/attachment.md", type: "blob", sha: "attachment" },
      ] });
      if (url.pathname.endsWith("/git/blobs/identical")) return json({ content: Buffer.from(manuscript).toString("base64"), encoding: "base64" });
      assert.ok(url.pathname.endsWith("/contents/content/posts/book/first.md"), url.pathname);
      if (init.method === "PUT") { writes.push(JSON.parse(init.body)); return json({}); }
      return json({ content: Buffer.from(manuscript).toString("base64"), encoding: "base64", sha: "source-sha" });
    };
    const content = await import(pathToFileURL(path.join(dir, "ui-content.mjs")));
    for (let repeat = 0; repeat < 2; repeat++) assert.deepEqual((await content.scanRepositoryBlocks()).map(file => file.path), ["content/posts/book/first.md", "content/posts/book/second.md"]);
    const repo = await import(pathToFileURL(path.join(dir, "github-content.mjs")));
    await repo.updateRepositoryPostPinned({ sourcePath: "posts/book/first.md", slug: "first", title: "A book", pinned: false });
    assert.equal(writes.length, 0, "No-op must not create a remote commit");
    await repo.updateRepositoryPostPinned({ sourcePath: "posts/book/first.md", slug: "first", title: "A book", pinned: true });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].sha, "source-sha");
    assert.equal(writes[0].branch, "main");
    assert.equal(Buffer.from(writes[0].content, "base64").toString(), manuscript.replace("pinned: false", "pinned: true"));
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keys) if (previousEnv[key] === undefined) delete process.env[key]; else process.env[key] = previousEnv[key];
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("Admin model receives every packaged recipe including the unified compose contract", async () => {
  const dir = fs.mkdtempSync(path.resolve(".garden/admin-recipes-"));
  try {
    const output = path.join(dir, "model.mjs");
    await build({ entryPoints: ["app/lib/ui-model.ts"], outfile: output, bundle: true, packages: "external", platform: "node", format: "esm", plugins: [{ name: "raw-markdown", setup(builder) {
      builder.onResolve({ filter: /\.md\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.replace(/\?raw$/u, "")), namespace: "raw-md" }));
      builder.onLoad({ filter: /.*/, namespace: "raw-md" }, args => ({ contents: fs.readFileSync(args.path, "utf8"), loader: "text" }));
    } }] });
    const { recipeSources } = await import(pathToFileURL(output));
    const { RECIPE_FILES } = await import("../ui/prompt/build.mjs");
    assert.deepEqual(recipeSources.map(recipe => recipe.file), RECIPE_FILES);
    for (const recipe of recipeSources) assert.equal(recipe.markdown, fs.readFileSync(path.resolve("ui/prompt/recipes", recipe.file), "utf8"));
    assert.ok(recipeSources.find(recipe => recipe.file === "compose.md")?.markdown.includes("garden compose"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test("build and Admin body preview use the same Markdown/HTML media mapping, with no script MIME expansion", () => {
  const source = '![shot](<./entry/a b.png> "caption")\n<img src="./entry/a.png"/>\n<video src="./entry/movie.mp4" poster="./entry/cover.avif"><source src="./entry/sound.mp3"/></video>\n[ordinary](./other.md)';
  const rewritten = rewriteArticleMedia(source, src => "proxy/" + encodeURIComponent(src));
  for (const asset of ["a b.png", "a.png", "movie.mp4", "cover.avif", "sound.mp3"]) assert.ok(rewritten.includes("proxy/" + encodeURIComponent("./entry/" + asset)));
  assert.ok(rewritten.includes('[ordinary](./other.md)'));
  assert.equal(previewAssetType("post/movie.mp4"), "video/mp4");
  assert.equal(previewAssetType("post/sound.mp3"), "audio/mpeg");
  assert.equal(previewAssetType("post/script.js"), null);
  assert.equal(previewAssetType("post/style.css"), null);
});
