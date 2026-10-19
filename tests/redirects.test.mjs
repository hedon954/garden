import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { columnRedirects, generateRedirects, readRedirects, redirectFile, redirectPage, runRedirectStep, writeRedirects } from "../scripts/redirects.mjs";

function builtSite() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "garden-redirects-"));
  for (const page of ["blog/go/go-gpm", "blog/rust-action-httpie", "blog/rust-action-spinlock", "2025/kept"]) {
    fs.mkdirSync(path.join(out, page), { recursive: true });
    fs.writeFileSync(path.join(out, page, "index.html"), "<p>page</p>");
  }
  return out;
}

test("old paths map to the file a static host serves for them", () => {
  assert.equal(redirectFile("/2024/01/20/go/go-gpm/"), "2024/01/20/go/go-gpm/index.html");
  assert.equal(redirectFile("/2024/01/20/go/go-gpm"), "2024/01/20/go/go-gpm/index.html");
  assert.equal(redirectFile("/wiki/rust/04-action/rust-action-httpie.html"), "wiki/rust/04-action/rust-action-httpie.html");
});

test("malformed entries are skipped with a warning, never thrown", () => {
  const warnings = [];
  const pairs = readRedirects({ redirects: {
    "/old/": "/blog/new/",
    "relative/": "/blog/x/",
    "/../escape/": "/blog/x/",
    "/q?x=1": "/blog/x/",
    "/": "/blog/x/",
    "/bad-target/": "blog/x/",
    "/away/": "https://elsewhere.example/",
  } }, (line) => warnings.push(line));
  assert.deepEqual(pairs, [{ from: "/old/", to: "/blog/new/" }, { from: "/away/", to: "https://elsewhere.example/" }]);
  assert.equal(warnings.length, 5);
  assert.deepEqual(readRedirects({}), []);
  assert.deepEqual(readRedirects({ redirects: ["/a"] }, () => {}), []);
});

test("each old path gets a page: meta refresh, canonical, the #anchor kept, no noindex", () => {
  const out = builtSite();
  try {
    const log = [];
    const written = writeRedirects({
      outDir: out,
      config: { url: "https://blog.example.org", redirects: {
        "/2024/01/20/go/go-gpm/": "/blog/go/go-gpm/",
        "/wiki/rust/04-action/rust-action-httpie.html": "/blog/rust-action-httpie/",
        "/2025/05/13/rust-action-spinlock/": "/blog/rust-action-spinlock/",
        "/2025/11/17/go/go-gc/": "/blog/go/missing/",
        "/2025/kept/": "/blog/go/go-gpm/",
      } },
      log: (line) => log.push(line),
    });
    assert.deepEqual(written.map((entry) => entry.from), ["/2024/01/20/go/go-gpm/", "/wiki/rust/04-action/rust-action-httpie.html", "/2025/05/13/rust-action-spinlock/"]);
    const page = fs.readFileSync(path.join(out, "2024/01/20/go/go-gpm/index.html"), "utf8");
    assert.match(page, /<link rel="canonical" href="https:\/\/blog\.example\.org\/blog\/go\/go-gpm\/">/u);
    assert.match(page, /<meta http-equiv="refresh" content="0; url=\/blog\/go\/go-gpm\/">/u);
    assert.match(page, /location\.replace\("\/blog\/go\/go-gpm\/" \+ location\.hash\)/u);
    assert.doesNotMatch(page, /noindex|name="robots"/u);
    assert.ok(fs.existsSync(path.join(out, "wiki/rust/04-action/rust-action-httpie.html")));
    // A missing target and an existing page at the old path are reported, not written.
    assert.ok(log.some((line) => line.includes("/2025/11/17/go/go-gc/") && line.includes("不存在")));
    assert.ok(log.some((line) => line.includes("/2025/kept/") && line.includes("已经有页面")));
    assert.equal(fs.readFileSync(path.join(out, "2025/kept/index.html"), "utf8"), "<p>page</p>");
    assert.ok(!fs.existsSync(path.join(out, "2025/11/17/go/go-gc")));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("a base path is added to the target; the site address falls back to SITE_URL", () => {
  const out = builtSite();
  try {
    writeRedirects({ outDir: out, config: { redirects: { "/old/": "/blog/go/go-gpm/" } }, env: { SITE_URL: "https://owner.github.io" }, basePath: "/garden/" });
    const page = fs.readFileSync(path.join(out, "old/index.html"), "utf8");
    assert.match(page, /href="https:\/\/owner\.github\.io\/garden\/blog\/go\/go-gpm\/"/u);
    assert.match(page, /url=\/garden\/blog\/go\/go-gpm\//u);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("redirect pages escape what they print", () => {
  const page = redirectPage({ href: '/a"b</script>', canonical: "https://x.test/a\"b" });
  assert.doesNotMatch(page, /<\/script>"/u);
  assert.match(page, /content="0; url=\/a&quot;b&lt;\/script&gt;"/u);
});

test("the build writes redirect pages only for a static export", () => {
  const cli = fs.readFileSync(new URL("../bin/garden.mjs", import.meta.url), "utf8");
  const staticSteps = cli.match(/if \(process\.env\.STATIC_EXPORT === "1"\) \{([^}]*)\}/u)?.[1] ?? "";
  // Placeholder pages of empty dynamic routes go first, then the redirect pages.
  assert.match(staticSteps, /runNode\("scripts\/static-placeholders\.mjs"\);\s*runNode\("scripts\/redirects\.mjs"\);/u);
  assert.equal(cli.match(/runNode\("scripts\/redirects\.mjs"\)/gu).length, 1, "nowhere else");
});

test("each column gets /columns/<slug>/ → /columns/#<slug>, with the column's anchor kept", () => {
  assert.deepEqual(columnRedirects({ columns: [{ slug: "go-advance" }, { slug: "Bad Slug" }, {}, null, { slug: "book-note" }] }), [
    { from: "/columns/go-advance/", to: "/columns/#go-advance" },
    { from: "/columns/book-note/", to: "/columns/#book-note" },
  ]);
  assert.deepEqual(columnRedirects({}), []);

  const out = builtSite();
  fs.mkdirSync(path.join(out, "columns"), { recursive: true });
  fs.writeFileSync(path.join(out, "columns", "index.html"), "<p>columns</p>");
  const extra = columnRedirects({ columns: [{ slug: "go-advance" }, { slug: "book-note" }] });
  const written = writeRedirects({
    outDir: out,
    config: { url: "https://blog.example.org", redirects: { "/columns/book-note/": "/blog/go/go-gpm/" } },
    extra,
  });
  // A configured redirect wins over the generated one for the same path.
  assert.deepEqual(written.map(({ from, to }) => [from, to]), [
    ["/columns/book-note/", "/blog/go/go-gpm/"],
    ["/columns/go-advance/", "/columns/#go-advance"],
  ]);
  const page = fs.readFileSync(path.join(out, "columns/go-advance/index.html"), "utf8");
  assert.match(page, /content="0; url=\/columns\/#go-advance"/u);
  // The target already carries an anchor, so the reader's own hash is not appended.
  assert.match(page, /location\.replace\("\/columns\/#go-advance"\)/u);
  assert.doesNotMatch(page, /#go-advance"\) \+ location\.hash|"\/columns\/#go-advance" \+ location\.hash/u);
  // Ordinary redirects still keep the reader's hash.
  assert.match(fs.readFileSync(path.join(out, "columns/book-note/index.html"), "utf8"), /"\/blog\/go\/go-gpm\/" \+ location\.hash/u);
});

test("the build step writes the pages when run as a script (configured and column redirects)", async () => {
  const { execFileSync } = await import("node:child_process");
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "garden-redirects-cli-"));
  try {
    const out = path.join(site, "dist", "client");
    for (const page of ["blog/go/go-gc-tri-color-marking", "columns"]) {
      fs.mkdirSync(path.join(out, page), { recursive: true });
      fs.writeFileSync(path.join(out, page, "index.html"), "<p>page</p>");
    }
    fs.writeFileSync(path.join(site, "site.config.yaml"), "url: https://blog.example.org\nredirects:\n  /2025/11/17/go/go-gc/: /blog/go/go-gc-tri-color-marking/\n");
    fs.mkdirSync(path.join(site, "content"));
    fs.writeFileSync(path.join(site, "content", "columns.yaml"), "columns:\n  - slug: rust-action\n");
    const stdout = execFileSync(process.execPath, [new URL("../scripts/redirects.mjs", import.meta.url).pathname], { env: { ...process.env, GARDEN_SITE: site }, encoding: "utf8" });
    assert.doesNotMatch(stdout, /警告/u, stdout);
    assert.match(stdout, /旧地址跳转页：2 个/u);
    assert.match(fs.readFileSync(path.join(out, "2025/11/17/go/go-gc/index.html"), "utf8"), /url=\/blog\/go\/go-gc-tri-color-marking\//u);
    assert.match(fs.readFileSync(path.join(out, "columns/rust-action/index.html"), "utf8"), /url=\/columns\/#rust-action/u);
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

function cliSite({ config, pages = [], columns }) {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "garden-redirects-step-"));
  const out = path.join(site, "dist", "client");
  fs.mkdirSync(out, { recursive: true });
  for (const page of pages) {
    fs.mkdirSync(path.join(out, page), { recursive: true });
    fs.writeFileSync(path.join(out, page, "index.html"), "<p>page</p>");
  }
  fs.writeFileSync(path.join(site, "site.config.yaml"), config);
  if (columns) {
    fs.mkdirSync(path.join(site, "content"), { recursive: true });
    fs.writeFileSync(path.join(site, "content", "columns.yaml"), columns);
  }
  return { site, out };
}

async function runStep(site) {
  const { spawnSync } = await import("node:child_process");
  return spawnSync(process.execPath, [new URL("../scripts/redirects.mjs", import.meta.url).pathname], {
    env: { ...process.env, GARDEN_SITE: site },
    encoding: "utf8",
  });
}

test("the build step fails when writing a redirect page throws", async () => {
  const { site, out } = cliSite({
    config: "redirects:\n  /old/post/: /blog/post/\n",
    pages: ["blog/post"],
  });
  try {
    // `old` is a file, so the folder for old/post/index.html cannot be made.
    fs.writeFileSync(path.join(out, "old"), "not a folder");
    const result = await runStep(site);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /旧地址跳转页生成失败/u);
    assert.doesNotMatch(result.stdout, /继续构建/u);
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

test("a missing target and a page already at the old path only warn; the step still succeeds", async () => {
  const { site, out } = cliSite({
    config: "redirects:\n  /old/kept/: /blog/kept/\n  /old/gone/: /blog/never-built/\n  /blog/other/: /blog/kept/\n",
    pages: ["blog/kept", "blog/other"],
  });
  try {
    const result = await runStep(site);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /警告：redirects：\/old\/gone\/ 指向的 \/blog\/never-built\/ 不存在，已跳过。/u);
    assert.match(result.stdout, /警告：redirects：\/blog\/other\/ 已经有页面，没有覆盖。/u);
    assert.match(result.stdout, /旧地址跳转页：1 个，跳过 2 个（见上面的警告）。/u);
    assert.ok(fs.existsSync(path.join(out, "old/kept/index.html")));
    assert.ok(!fs.existsSync(path.join(out, "old/gone")));
    assert.equal(fs.readFileSync(path.join(out, "blog/other/index.html"), "utf8"), "<p>page</p>");
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

test("the build step fails when the pages written are not the valid entries minus the skipped ones", () => {
  const { site } = cliSite({
    config: "redirects:\n  /old/a/: /blog/a/\n  /old/b/: /blog/b/\n  /old/c/: /blog/missing/\n",
    pages: ["blog/a", "blog/b"],
  });
  const capture = () => {
    const sink = { text: "", write: (chunk) => { sink.text += chunk; return true; } };
    return sink;
  };
  try {
    // Three valid entries, one skipped with a warning, but only one page: a page went missing without a reason.
    const out = capture();
    const err = capture();
    const status = runRedirectStep({
      siteRoot: site,
      env: {},
      out,
      err,
      generate: (options) => {
        const result = generateRedirects(options);
        return { ...result, written: result.written.slice(0, 1) };
      },
    });
    assert.equal(status, 1, out.text + err.text);
    assert.match(err.text, /应生成 2 个（3 条有效配置，跳过 1 条），实际生成了 1 个，构建中止/u);
    // The real generator adds up: same site, fresh output, exit 0.
    fs.rmSync(path.join(site, "dist/client/old"), { recursive: true, force: true });
    const again = capture();
    assert.equal(runRedirectStep({ siteRoot: site, env: {}, out: again, err: capture() }), 0);
    assert.match(again.text, /旧地址跳转页：2 个，跳过 1 个/u);
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

test("a malformed redirect entry only warns; the step still succeeds", async () => {
  const { site, out } = cliSite({
    config: [
      "redirects:",
      "  not-a-site-path: /blog/post/",
      "  /old/bad-target/: ftp://example.org/file",
      "  /old/post/: /blog/post/",
      "  /old/post: /blog/post/",
      "",
    ].join("\n"),
    pages: ["blog/post", "columns"],
    columns: "columns:\n  - slug: field-notes\n",
  });
  try {
    const result = await runStep(site);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /警告：redirects：旧路径 not-a-site-path 必须是站内路径/u);
    assert.match(result.stdout, /警告：redirects：\/old\/bad-target\/ 的新地址/u);
    assert.match(result.stdout, /警告：redirects：\/old\/post 和前面的旧路径是同一个页面/u);
    assert.match(result.stdout, /旧地址跳转页：2 个/u);
    assert.ok(fs.existsSync(path.join(out, "old/post/index.html")));
    assert.ok(fs.existsSync(path.join(out, "columns/field-notes/index.html")));
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

test("the build step is quiet and succeeds when no redirects are configured", async () => {
  const { site } = cliSite({ config: "name: Example\n" });
  try {
    const result = await runStep(site);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
});

test("redirect pages carry the site's icon, so there is no /favicon.ico request", async () => {
  const { site, out } = cliSite({
    config: "redirects:\n  /old/post/: /blog/post\n",
    pages: ["blog/post"],
  });
  try {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync(process.execPath, [new URL("../scripts/redirects.mjs", import.meta.url).pathname], {
      env: { ...process.env, GARDEN_SITE: site, NEXT_PUBLIC_BASE_PATH: "/notes" },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const page = fs.readFileSync(path.join(out, "old/post/index.html"), "utf8");
    assert.match(page, /<link rel="icon" href="\/notes\/favicon\.svg" type="image\/svg\+xml">/u);
    // The target is a site address like any other: trailing slash, base path in front.
    assert.match(page, /url=\/notes\/blog\/post\//u);
  } finally {
    fs.rmSync(site, { recursive: true, force: true });
  }
  assert.match(redirectPage({ href: "/a/", canonical: "/a/", icon: "/brand/icon.png" }), /<link rel="icon" href="\/brand\/icon\.png">/u);
  assert.doesNotMatch(redirectPage({ href: "/a/", canonical: "/a/" }), /rel="icon"/u);
});
