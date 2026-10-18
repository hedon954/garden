import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { marked } from "marked";
import { parseGardenBlock } from "../ui/garden/parse.mjs";
import { checkGardenMarkdown } from "../ui/garden/check.mjs";
import {
  HTML_PREVIEW_SANDBOX,
  LARGE_FILE_BYTES,
  fileFeedMarkdown,
  fileMeta,
  fileName,
  fileSearchText,
  formatLabel,
  formatSize,
  previewFrameProps,
  previewKind,
  readFileProps,
  safeFileHref,
  previewBody,
} from "../ui/garden/file-block.mjs";
import { checkFileSources, resolveRepoFile } from "../ui/garden/file-paths.mjs";
import { PREVIEW_TOKENS, highlightRules, previewDocument, previewFileName, renderFilePreview } from "../scripts/file-preview.mjs";
import { probeFileSize, readFileSizeCache, refreshFileSizes, remoteFileSources } from "../scripts/file-sizes.mjs";
import { contentForDistribution, contentForFeed, contentToSearchText } from "../ui/core/transform.mjs";
import { countDemoWords } from "../ui/garden/word-count.mjs";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(new URL("../", import.meta.url).pathname);
const fence = (body) => `\`\`\`garden file\n${body}\n\`\`\``;

test("garden file parses one file, a group, and rejects unknown keys", () => {
  const single = parseGardenBlock("garden file", "src: ./post/spec.zip\nnote: 规格包");
  assert.equal(single.name, "file");
  assert.equal(single.error, undefined);
  assert.deepEqual(readFileProps(single.props), {
    layout: "single",
    title: "",
    files: [{ src: "./post/spec.zip", title: "", note: "规格包" }],
    errors: [],
  });

  const group = parseGardenBlock("garden file", "title: 文档\nfiles:\n  - src: ./post/a.md\n    title: 需求\n  - ./post/b.html");
  assert.equal(group.error, undefined);
  const read = readFileProps(group.props);
  assert.equal(read.layout, "group");
  assert.equal(read.title, "文档");
  assert.deepEqual(read.files.map((file) => [file.src, file.title]), [["./post/a.md", "需求"], ["./post/b.html", ""]]);

  const unknown = parseGardenBlock("garden file", "src: ./a.zip\ncaption: 不支持");
  assert.equal(unknown.error.code, "garden-yaml");
  assert.match(unknown.error.message, /caption/u);

  // The build writes `resolved`; the parser accepts it so the page can read it.
  assert.equal(parseGardenBlock("garden file", 'resolved: {"layout":"single","files":[]}').error, undefined);
});

test("readFileProps reports what an author has to fix", () => {
  assert.deepEqual(readFileProps({}).errors, ["文件 缺少 src"]);
  assert.match(readFileProps({ src: "./a.zip", files: ["./b.zip"] }).errors.join(), /不能同时写/u);
  assert.match(readFileProps({ files: [] }).errors.join(), /至少一项/u);
  assert.match(readFileProps({ files: [{ title: "没有 src" }] }).errors.join(), /第 1 项 缺少 src/u);
  assert.match(readFileProps({ files: [{ src: "./a.zip", size: 3 }] }).errors.join(), /不支持的键：size/u);
});

test("garden check flags a broken file block and a hand-written resolved", () => {
  const codes = (markdown) => checkGardenMarkdown(markdown).map((item) => item.code);
  assert.deepEqual(codes(fence("src: ./a/b.zip")), []);
  assert.deepEqual(codes(fence("note: 没写 src")), ["garden-file"]);
  assert.deepEqual(codes(fence("files:\n  - src: ./a.md\n    size: 1")), ["garden-file"]);
  const resolved = checkGardenMarkdown(fence('resolved: {"files":[]}'));
  assert.equal(resolved[0].code, "garden-file");
  assert.match(resolved[0].message, /构建生成/u);
});

test("format, size and preview kind come from the file name", () => {
  assert.equal(formatLabel("./a/01-prd.md"), "Markdown");
  assert.equal(formatLabel("./a/demo.HTM"), "HTML");
  assert.equal(formatLabel("./a/guide.pdf?v=2#p3"), "PDF");
  assert.equal(formatLabel("./a/kit.zip"), "ZIP");
  assert.equal(formatLabel("./a/data.csv"), "CSV");
  assert.equal(formatLabel("./a/LICENSE"), "文件");
  assert.equal(fileName("./a/my%20notes.md"), "my notes.md");
  assert.equal(formatSize(654), "654 B");
  assert.equal(formatSize(1879), "1.8 KB");
  assert.equal(formatSize(208599), "204 KB");
  assert.equal(formatSize(4547060), "4.3 MB");
  assert.equal(formatSize(undefined), "");
  assert.equal(fileMeta({ format: "PDF" }), "PDF");
  assert.equal(fileMeta({ format: "ZIP", size: 49152 }), "ZIP · 48 KB");
  assert.equal(previewKind("./a/notes.md"), "md");
  assert.equal(previewKind("./a/demo.html"), "html");
  assert.equal(previewKind("./a/guide.pdf"), "pdf");
  assert.equal(previewKind("./a/kit.zip"), "");
  // Remote files are download and open only in this version.
  assert.equal(previewKind("https://oss.example.com/guide.pdf"), "");
});

test("an HTML preview is sandboxed without the site's origin; PDF uses the native viewer", async () => {
  assert.match(HTML_PREVIEW_SANDBOX, /\ballow-scripts\b/u);
  assert.doesNotMatch(HTML_PREVIEW_SANDBOX, /allow-same-origin/u);
  const html = previewFrameProps({ preview: "html", url: "/media/posts/a/demo.html", name: "demo.html" });
  assert.equal(html.sandbox, HTML_PREVIEW_SANDBOX);
  assert.equal(html.src, "/media/posts/a/demo.html");
  const pdf = previewFrameProps({ preview: "pdf", url: "/media/posts/a/guide.pdf", name: "guide.pdf" });
  assert.equal(pdf.sandbox, undefined);
  assert.equal(previewFrameProps({ preview: "md" }), null);
  const drawer = await readFile(new URL("../app/components/garden/FilePreview.tsx", import.meta.url), "utf8");
  assert.match(drawer, /<iframe ref=\{frameRef\} className="gf-frame" \{\.\.\.frame\} \/>/u);
  assert.doesNotMatch(drawer, /allow-same-origin/u);
  // No Markdown parser in the drawer: Markdown arrives rendered.
  assert.doesNotMatch(drawer, /react-markdown|from "marked"|remark|rehype/u);
});

test("a Markdown preview is rendered at build time with the posts' syntax, and nothing in it can run", () => {
  const html = renderFilePreview([
    "# 记录",
    "第一行",
    "第二行",
    "",
    "| a | b |",
    "| --- | --- |",
    "| 1 | 2 |",
    "",
    "$x^2$ 和 ~~删除~~",
    "",
    "```js",
    "let a = 1",
    "```",
    "",
    '<img src="x.png" onerror="alert(1)"> <script>alert(2)</script> <iframe src="https://e.org"></iframe>',
    "",
    '[坏](javascript:alert(3)) <a href="JaVa\tscript:alert(4)">也坏</a> [站外](https://example.org) [同目录](./guide.pdf) <img src="data:image/png;base64,AAAA">',
  ].join("\n"));
  assert.match(html, /<h1 id="gf-记录">记录<\/h1>/u, "heading ids are prefixed, apart from the article's");
  assert.match(html, /第一行<br>\n第二行/u, "line breaks as in posts");
  assert.match(html, /<div class="table-wrap" role="region" aria-label="表格，可横向滚动" tabindex="0"><table>/u, "tables wrapped like the article's, so its styles apply");
  assert.match(html, /class="katex"/u);
  assert.match(html, /<del>删除<\/del>/u);
  assert.match(html, /<pre class="code" data-language="JS"><code class="hljs language-js">/u);
  assert.doesNotMatch(html, /onerror|<script|<iframe|javascript:|script:alert/iu);
  assert.match(html, /<a href="https:\/\/example\.org" target="_blank" rel="noopener noreferrer" class="ext">站外<\/a>/u);
  assert.match(html, /<a href="\.\/guide\.pdf">同目录<\/a>/u);
  assert.match(html, /<img src="data:image\/png;base64,AAAA">/u);
  assert.equal(previewFileName("/media/posts/a/log.md"), "/media/posts/a/log.md.preview.html");
  const page = previewDocument(html, { title: "<记录>" });
  assert.match(page, /<title>&lt;记录&gt;<\/title>/u);
  assert.equal(previewBody(page), html);
  assert.equal(previewBody("<html>no main</html>"), "");
});

test("the drawer fetches the Markdown preview only when opened, with loading, error and retry", async () => {
  const drawer = await readFile(new URL("../app/components/garden/FilePreview.tsx", import.meta.url), "utf8");
  assert.match(drawer, /fetch\(file\.src, \{ signal: controller\.signal \}\)/u);
  assert.match(drawer, /if \(file\.preview === "md" && loaded\.state !== "ready" && loaded\.state !== "loading"\) load\(\);/u, "loaded on the first open, kept afterwards");
  assert.match(drawer, /正在载入预览…/u);
  assert.match(drawer, /预览没能载入。/u);
  assert.match(drawer, />重试<\/button>/u);
  assert.match(drawer, />下载文件<\/a>/u);
  assert.match(drawer, /request\.current\?\.abort\(\);\n    setOpen\(false\);/u, "closing stops a pending load");
  // Without JavaScript the control is a link to the same preview (or the file) in a new tab.
  assert.match(drawer, /href=\{file\.preview === "md" && file\.src \? file\.src : file\.url\}\n\s+target="_blank"/u);
  const css = await readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.gf-preview \{ display: none; \}/u, "the 预览 link stays without scripts");
});

test("src resolves next to the Markdown file and must stay inside content/", () => {
  const content = path.join(path.sep, "site", "content");
  const post = path.join(content, "posts", "go", "go-lock.md");
  assert.deepEqual(resolveRepoFile("./go-lock/mutex.pdf", post, content), { path: path.join(content, "posts", "go", "go-lock", "mutex.pdf") });
  assert.deepEqual(resolveRepoFile("go-lock/a%20b.md?raw#top", post, content), { path: path.join(content, "posts", "go", "go-lock", "a b.md") });
  assert.deepEqual(resolveRepoFile("../shared/kit.zip", post, content), { path: path.join(content, "posts", "shared", "kit.zip") });
  assert.match(resolveRepoFile("../../../etc/passwd", post, content).error, /content 目录/u);
});

test("garden check warns above 5 MB and errors on a missing file", async () => {
  const site = await mkdtemp(path.join(tmpdir(), "garden-file-check-"));
  try {
    const content = path.join(site, "content");
    const dir = path.join(content, "posts", "big");
    await mkdir(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "edge.zip"), "");
    fs.truncateSync(path.join(dir, "edge.zip"), LARGE_FILE_BYTES);
    fs.writeFileSync(path.join(dir, "large.zip"), "");
    fs.truncateSync(path.join(dir, "large.zip"), LARGE_FILE_BYTES + 1);
    const markdown = [
      "正文",
      fence("src: ./big/edge.zip"),
      fence("files:\n  - src: ./big/large.zip\n  - src: ./big/missing.pdf\n  - src: https://oss.example.com/huge.zip"),
    ].join("\n\n");
    const found = checkFileSources(markdown, path.join(content, "posts", "big.md"), content);
    assert.deepEqual(found.map(({ code, severity, line }) => [code, severity, line]), [
      ["file-large", "warning", 7],
      ["missing-asset", "error", 7],
    ]);
    assert.match(found[0].message, /large\.zip 有 5 MB/u);
    assert.match(found[0].suggestion, /OSS/u);
  } finally {
    await rm(site, { recursive: true, force: true });
  }
});

test("garden check runs the file checks and keeps a large file a warning", async () => {
  const site = await mkdtemp(path.join(tmpdir(), "garden-file-cli-"));
  try {
    const dir = path.join(site, "content", "posts", "kit");
    await mkdir(dir, { recursive: true });
    await cp(path.join(projectRoot, "site.config.yaml"), path.join(site, "site.config.yaml"));
    fs.writeFileSync(path.join(dir, "large.zip"), "");
    fs.truncateSync(path.join(dir, "large.zip"), LARGE_FILE_BYTES + 1024);
    await writeFile(path.join(site, "content", "posts", "kit.md"), `---\ntitle: 资料\ndate: 2026-10-01\ndescription: 下载\n---\n\n${fence("src: ./kit/large.zip")}\n`);
    const { stdout } = await execFileAsync(process.execPath, [path.join(projectRoot, "scripts", "check-post.mjs"), "content/posts/kit.md"], {
      cwd: site,
      env: { ...process.env, GARDEN_SITE: site },
    });
    const report = JSON.parse(stdout);
    assert.equal(report.ok, true);
    assert.deepEqual(report.results[0].warnings.map((item) => item.code), ["file-large"]);
  } finally {
    await rm(site, { recursive: true, force: true });
  }
});

function sizeSite(markdown, cache) {
  const site = fs.mkdtempSync(path.join(tmpdir(), "garden-file-sizes-"));
  fs.mkdirSync(path.join(site, "content", "posts"), { recursive: true });
  fs.writeFileSync(path.join(site, "content", "posts", "a.md"), `---\ntitle: a\n---\n\n${markdown}\n`);
  if (cache) fs.writeFileSync(path.join(site, "file-sizes.json"), JSON.stringify({ version: 1, files: cache }));
  return site;
}

const reply = (status, headers = {}) => new Response(null, { status, headers });

test("remote file sizes: HEAD, then a one-byte range, then the cached value, never a failure", async () => {
  const urls = {
    head: "https://oss.example.com/kit.zip",
    range: "https://oss.example.com/stream.zip",
    cached: "https://oss.example.com/down.pdf",
    never: "https://oss.example.com/never.zip",
  };
  const markdown = [fence(`src: ${urls.head}`), fence(`files:\n  - src: ${urls.range}\n  - src: ${urls.cached}\n  - src: ${urls.never}\n  - src: ./local/notes.md`)].join("\n\n");
  assert.deepEqual(remoteFileSources(markdown), [urls.head, urls.range, urls.cached, urls.never]);
  const site = sizeSite(markdown, { [urls.cached]: { size: 2048 }, [urls.head]: { size: 1 } });
  const calls = [];
  const fetch = async (url, init) => {
    calls.push(`${init.method} ${url}`);
    if (url === urls.head) return reply(200, { "content-length": "49152" });
    if (url === urls.range) return init.method === "HEAD" ? reply(200) : reply(206, { "content-range": "bytes 0-0/1048576" });
    throw new Error("offline");
  };
  const log = [];
  try {
    const { files, failed } = await refreshFileSizes({ siteRoot: site, fetch, checkHost: async () => {}, log: (line) => log.push(line) });
    assert.equal(failed, 2);
    assert.deepEqual(files, {
      [urls.cached]: { size: 2048 },
      [urls.head]: { size: 49152 },
      [urls.range]: { size: 1048576 },
    });
    assert.deepEqual(readFileSizeCache(site).files, files);
    assert.ok(log.some((line) => line.includes("沿用上次的结果") && line.includes(urls.cached)));
    assert.ok(log.some((line) => line.includes("不显示大小") && line.includes(urls.never)));
    assert.ok(calls.includes(`GET ${urls.range}`));
    assert.ok(!calls.some((call) => call.includes("local")));
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

test("remote file sizes only ask public hosts", async () => {
  let asked = false;
  const fetch = async () => {
    asked = true;
    return reply(200, { "content-length": "1" });
  };
  await assert.rejects(probeFileSize("http://127.0.0.1/secret.zip", { fetch, checkHost: async () => {} }), /not a public URL/u);
  await assert.rejects(probeFileSize("http://localhost/secret.zip", { fetch, checkHost: async () => {} }), /not a public URL/u);
  assert.equal(asked, false);
});

test("search, word count, RSS and distribution see titles and notes, not the previewed file", () => {
  const props = {
    layout: "group",
    title: "种植资料",
    files: [
      { name: "log.md", title: "浇水记录", note: "前四周", url: "/media/posts/a/log.md", format: "Markdown", size: 654, preview: "md", previewSrc: "/media/posts/a/log.md.preview.html" },
      { name: "kit.zip", title: "资料包", url: "https://oss.example.com/kit.zip", format: "ZIP", remote: true },
    ],
  };
  const built = `开头\n\n\`\`\`garden file\nresolved: ${JSON.stringify(props)}\n\`\`\`\n\n结尾`;
  const search = contentToSearchText(built);
  assert.match(search, /种植资料 浇水记录 前四周 资料包/u);
  assert.doesNotMatch(search, /preview\.html|resolved|media/u);
  assert.doesNotMatch(countDemoWords ? String(countDemoWords(built)) : "", /NaN/u);
  const feed = contentForFeed(built, { siteUrl: "https://blog.example.org" });
  assert.match(feed, /\[浇水记录\]\(<https:\/\/blog\.example\.org\/media\/posts\/a\/log\.md>\)（Markdown · 654 B）：前四周/u);
  assert.match(feed, /\[资料包\]\(<https:\/\/oss\.example\.com\/kit\.zip>\)（ZIP）/u);
  assert.doesNotMatch(feed, /preview\.html/u);
  assert.match(contentForDistribution(built, { siteUrl: "https://blog.example.org" }), /\[资料包\]/u);
  assert.equal(fileSearchText({ src: "./a/kit.zip", note: "说明" }), "kit.zip 说明");
});

test("file titles and links are escaped in feeds and unsafe links are dropped", () => {
  const resolved = { layout: "single", files: [{ name: "x.zip", title: "<script>alert(1)</script> [x](javascript:alert(1))", note: "<img src=x onerror=alert(1)>\n\n# 不是标题", url: "/media/x.zip", format: "ZIP" }] };
  const html = marked.parse(fileFeedMarkdown({ resolved }, { siteUrl: "https://blog.example.org" }));
  assert.doesNotMatch(html, /<script>|<img|href="javascript:|<h1/u);
  assert.match(html, /<a href="https:\/\/blog\.example\.org\/media\/x\.zip">&lt;script&gt;alert\(1\)&lt;\/script&gt; \[x\]\(javascript:alert\(1\)\)<\/a>（ZIP）：&lt;img src=x onerror=alert\(1\)&gt; # 不是标题/u);
  assert.equal(safeFileHref("javascript:alert(1)"), "");
  assert.equal(safeFileHref(" JavaScript:alert(1)"), "");
  assert.equal(safeFileHref("data:text/html,<b>"), "");
  assert.equal(safeFileHref("//evil.example/x.zip"), "");
  assert.equal(safeFileHref("/media/posts/a/kit.zip"), "/media/posts/a/kit.zip");
  assert.equal(safeFileHref("https://oss.example.com/kit.zip"), "https://oss.example.com/kit.zip");
});

async function fileSite() {
  const site = await mkdtemp(path.join(tmpdir(), "garden-file-build-"));
  const dir = path.join(site, "content", "posts", "notes", "kit");
  await mkdir(dir, { recursive: true });
  await mkdir(path.join(site, "public"), { recursive: true });
  await cp(path.join(projectRoot, "site.config.yaml"), path.join(site, "site.config.yaml"));
  await writeFile(path.join(dir, "guide.md"), "---\ntitle: 不显示\n---\n\n# 指南\n\n![图](./pic.png)\n\n正文。\n");
  await writeFile(path.join(dir, "pic.png"), "png");
  await writeFile(path.join(dir, "demo.html"), "<p>demo</p>");
  await writeFile(path.join(dir, "data.csv"), "a,b\n1,2\n");
  await writeFile(path.join(site, "file-sizes.json"), JSON.stringify({ version: 1, files: { "https://oss.example.com/big.zip": { size: 52428800 } } }));
  return site;
}

const post = (body) => `---\ntitle: 资料\ndate: 2026-10-01\ndescription: 下载\n---\n\n${body}\n`;

async function buildContent(site) {
  return execFileAsync(process.execPath, [path.join(projectRoot, "scripts", "build-content.mjs")], {
    cwd: projectRoot,
    env: { ...process.env, GARDEN_SITE: site, CONTENT_INCLUDE_DRAFTS: "0", NEXT_PUBLIC_BASE_PATH: "" },
  });
}

test("the build copies repo files, writes the Markdown preview to its own file, and takes remote sizes from the cache", async () => {
  const site = await fileSite();
  try {
    await writeFile(
      path.join(site, "content", "posts", "notes", "kit.md"),
      post([
        fence("src: ./kit/data.csv\ntitle: <b>数据</b>"),
        fence("title: 一组\nfiles:\n  - src: ./kit/guide.md\n    note: 先读\n  - src: ./kit/demo.html\n  - src: https://oss.example.com/big.zip\n  - src: https://oss.example.com/unknown.zip"),
        "````md",
        fence("src: ./kit/not-resolved-inside-an-example.zip"),
        "````",
      ].join("\n\n")),
    );
    await buildContent(site);
    const generated = await readFile(path.join(site, ".garden", "generated-content.ts"), "utf8");
    // The sidecar Markdown is a file, not a post.
    assert.doesNotMatch(generated, /"slug": "guide"/u);
    const content = JSON.parse(/"content": ("(?:[^"\\]|\\.)*")/u.exec(generated)[1]);
    const blocks = [...content.matchAll(/^resolved: (.*)$/gmu)].map((match) => JSON.parse(match[1]));
    assert.equal(blocks.length, 2);
    assert.deepEqual(blocks[0], {
      layout: "single",
      files: [{ name: "data.csv", title: "<b>数据</b>", format: "CSV", icon: "file", url: "/media/posts/notes/kit/data.csv", size: 8, remote: false, preview: "" }],
    });
    const [guide, demo, big, unknown] = blocks[1].files;
    assert.equal(blocks[1].title, "一组");
    assert.equal(guide.preview, "md");
    assert.equal(guide.url, "/media/posts/notes/kit/guide.md");
    assert.equal(guide.note, "先读");
    // The preview is its own file next to the copy; the page data only points at it.
    assert.equal(guide.markdown, undefined);
    assert.equal(guide.previewSrc, "/media/posts/notes/kit/guide.md.preview.html");
    const published = await readFile(path.join(site, "public", "media", "posts", "notes", "kit", "guide.md.preview.html"), "utf8");
    // Front matter dropped, images next to the file copied and rewritten, a standalone page for readers without JavaScript.
    assert.match(published, /^<!doctype html>/u);
    assert.match(published, /<meta name="robots" content="noindex">/u);
    assert.equal(previewBody(published), '<h1 id="gf-指南">指南</h1>\n<p><img src="/media/posts/notes/kit/pic.png" alt="图"></p>\n<p>正文。</p>');
    assert.doesNotMatch(generated, /正文。/u, "the Markdown file's text is not in the page data");
    assert.equal(demo.preview, "html");
    assert.deepEqual([big.remote, big.size, big.preview], [true, 52428800, ""]);
    assert.equal(unknown.size, undefined);
    assert.ok(fs.existsSync(path.join(site, "public", "media", "posts", "notes", "kit", "data.csv")));
    assert.ok(fs.existsSync(path.join(site, "public", "media", "posts", "notes", "kit", "pic.png")));
    // A fence shown inside a longer code block is an example, left as written.
    assert.match(content, /src: \.\/kit\/not-resolved-inside-an-example\.zip/u);
  } finally {
    await rm(site, { recursive: true, force: true });
  }
});

test("the build fails on a missing file or a file outside content/", async () => {
  for (const [body, message] of [
    [fence("src: ./kit/missing.pdf"), /garden file 找不到 \.\/kit\/missing\.pdf/u],
    [fence("src: ../../../../site.config.yaml"), /文件必须放在 content 目录里/u],
    [fence("note: 没有 src"), /缺少 src/u],
  ]) {
    const site = await fileSite();
    try {
      await writeFile(path.join(site, "content", "posts", "notes", "kit.md"), post(body));
      await assert.rejects(buildContent(site), (error) => {
        assert.match(error.stderr, message);
        return true;
      });
    } finally {
      await rm(site, { recursive: true, force: true });
    }
  }
});

test("preview code blocks look like the article's: same code type and backgrounds, light and dark", async () => {
  const [tokens, articleCss, drawer] = await Promise.all([
    readFile(new URL("../app/styles/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/garden/FilePreview.tsx", import.meta.url), "utf8"),
  ]);
  // In the drawer: the preview's pre.code sits in .markdown-body.prose, so the article's own rules style it ...
  assert.match(renderFilePreview("```js\nlet a\n```"), /^<pre class="code" data-language="JS">/u);
  assert.match(drawer, /className="markdown-body prose gf-doc"/u);
  assert.match(articleCss, /\.markdown-body pre\.code,\n\.prose pre\.code \{[^}]*background: var\(--well\)/u);
  // ... and nothing scoped to the drawer overrides them.
  assert.doesNotMatch(articleCss, /\.gf-(?:doc|db|drawer)[^{]*\b(?:pre|code)\b[^{]*\{/u);
  // On the standalone page (no JavaScript): the article's tokens, light and dark.
  const block = (selector) => tokens.slice(tokens.indexOf(selector)).split("}")[0];
  const token = (css, name) => css.match(new RegExp(`--${name}:\\s*([^;]+);`, "u"))?.[1].trim();
  const light = block(':root[data-theme="light"] {');
  const dark = block(':root[data-theme="dark"]');
  assert.equal(PREVIEW_TOKENS.mono, token(light, "mono"));
  assert.equal(PREVIEW_TOKENS.sans, token(light, "sans"));
  for (const name of ["paper", "ink", "well", "tint", "rule"]) {
    assert.equal(PREVIEW_TOKENS.light[name], token(light, name), `light --${name}`);
    assert.equal(PREVIEW_TOKENS.dark[name], token(dark, name), `dark --${name}`);
  }
  // The block itself (.markdown-body pre in globals.css) and inline code (a2.css), value by value.
  const globalsCss = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rule = (css, selector) => css.slice(css.indexOf(`\n${selector} {`)).split("}")[0];
  const legacyPre = rule(globalsCss, ".markdown-body pre");
  assert.match(legacyPre, new RegExp(`font-size: ${PREVIEW_TOKENS.pre.fontSize};`, "u"));
  assert.match(legacyPre, new RegExp(`line-height: ${PREVIEW_TOKENS.pre.lineHeight};`, "u"));
  assert.match(legacyPre, new RegExp(`color: ${PREVIEW_TOKENS.pre.color};`, "u"));
  const inline = rule(articleCss, ".markdown-body :not(pre) > code");
  assert.match(inline, /font: 400 var\(--fs-small\) \/ 1 var\(--mono\);[\s\S]*background: var\(--tint\);[\s\S]*padding: 3px 6px;[\s\S]*border-radius: 5px;/u);
  assert.equal(token(light, "fs-small"), "14px");
  const page = previewDocument("<pre><code>x</code></pre><p><code>y</code></p>");
  const style = page.match(/<style>([\s\S]*)<\/style>/u)[1];
  assert.ok(style.includes(`pre,code{font-family:${PREVIEW_TOKENS.mono}}`));
  assert.ok(style.includes(`pre{margin:28px 0;padding:18px 22px;border-radius:8px;overflow-x:auto;font-size:12px;line-height:1.7;color:#e6e6e2}`));
  assert.ok(style.includes("pre code{display:block;background:none;padding:0;font-size:14px;line-height:1.6}"));
  assert.ok(style.includes(`:not(pre)>code{font:400 14px/1 ${PREVIEW_TOKENS.mono};padding:3px 6px;border-radius:5px}`));
  assert.ok(style.includes(`pre{background:${PREVIEW_TOKENS.light.well}}pre code{color:${PREVIEW_TOKENS.light.ink}}:not(pre)>code{background:${PREVIEW_TOKENS.light.tint};color:${PREVIEW_TOKENS.light.ink}}`));
  assert.ok(style.includes(`@media (prefers-color-scheme:dark){body{background:${PREVIEW_TOKENS.dark.paper};color:${PREVIEW_TOKENS.dark.ink}}pre{background:${PREVIEW_TOKENS.dark.well}}pre code{color:${PREVIEW_TOKENS.dark.ink}}:not(pre)>code{background:${PREVIEW_TOKENS.dark.tint};color:${PREVIEW_TOKENS.dark.ink}}`));
  // Highlight colours: every .hljs-* rule of globals.css then a2.css, in that order; the dark ones under prefers-color-scheme.
  const sheets = [highlightRules(globalsCss), highlightRules(articleCss)];
  const lightRules = sheets.flatMap((sheet) => sheet.light);
  const darkRules = sheets.flatMap((sheet) => sheet.dark);
  assert.ok(lightRules.length >= 15 && darkRules.length >= 6, `${lightRules.length} light, ${darkRules.length} dark`);
  const [outside, inside] = style.split("@media (prefers-color-scheme:dark){");
  assert.ok(outside.includes(lightRules.join("")), "light highlight rules, in order");
  assert.ok(inside.includes(darkRules.join("")), "dark highlight rules, in order");
  // Spot checks against the article: decorators, keywords, strings, comments.
  assert.ok(lightRules.includes(".hljs-meta,.hljs-symbol,.hljs-bullet{color:#c7a0e8}"));
  assert.ok(lightRules.includes(".hljs-keyword,.hljs-built_in,.hljs-type,.hljs-meta .hljs-keyword{color:#30302e;font-weight:600}"));
  assert.ok(lightRules.includes(".hljs-comment,.hljs-quote{color:#6e6b64;font-style:normal}"));
  assert.ok(darkRules.includes("html:root .hljs-string{color:#8fd1a0}"), "dark rules keep the weight of html[data-theme=dark]");
  // Highlighted at build time; nothing on the page runs.
  assert.match(previewDocument(renderFilePreview("```python\n@dataclass\ndef f(): return 1\n```")), /<span class="hljs-meta">@dataclass<\/span>/u);
  assert.doesNotMatch(page, /<script|\son[a-z]+=/iu);
});

test("an html or pdf preview keeps focus in the drawer: sentinels around the iframe, and a quiet Esc hint", async () => {
  const [drawer, css] = await Promise.all([
    readFile(new URL("../app/components/garden/FilePreview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/styles/a2.css", import.meta.url), "utf8"),
  ]);
  // Keys inside the iframe never reach the page: Tab out of it lands on a sentinel, which sends focus back into the drawer.
  assert.match(drawer, /<span tabIndex=\{0\} className="gf-sentinel" data-gf-sentinel="before" onFocus=\{fromBefore\} \/>\s*<iframe ref=\{frameRef\} className="gf-frame" \{\.\.\.frame\} \/>\s*<span tabIndex=\{0\} className="gf-sentinel" data-gf-sentinel="after" onFocus=\{fromAfter\} \/>/u);
  assert.match(drawer, /const fromAfter = \(\) => \{\s*panel\.current\?\.querySelector<HTMLElement>\("\.gf-dh a\[href\], \.gf-dh button"\)\?\.focus\(\);/u, "after the iframe: round to the first control");
  assert.match(drawer, /if \(from && panel\.current\?\.querySelector\("\.gf-dh"\)\?\.contains\(from\)\) frameRef\.current\?\.focus\(\);\s*else closeButton\.current\?\.focus\(\);/u, "before the iframe: on into it, or back to 关闭");
  assert.match(drawer, /\.filter\(\(element\) => !element\.hasAttribute\("data-gf-sentinel"\)\)/u, "the Tab handler skips the sentinels");
  assert.match(css, /\.gf-sentinel \{ position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset\(50%\);/u);
  // The hint: one quiet line at the bottom, muted, hidden where there is no keyboard.
  assert.match(drawer, /<p className="gf-hint">Esc 关闭<\/p>\s*<\/aside>/u);
  assert.match(css, /\.gf-hint \{[^}]*font-size: 12px;[^}]*color: var\(--muted\);/u);
  assert.match(css, /@media \(hover: none\) and \(pointer: coarse\) \{ \.gf-hint \{ display: none; \} \}/u);
});
