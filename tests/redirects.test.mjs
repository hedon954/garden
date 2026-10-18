import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readRedirects, redirectFile, redirectPage, writeRedirects } from "../scripts/redirects.mjs";

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

test("each old path gets a page: meta refresh, canonical, the #anchor kept, noindex", () => {
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
    assert.match(page, /<meta name="robots" content="noindex">/u);
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
  assert.match(cli, /if \(process\.env\.STATIC_EXPORT === "1"\) runNode\("scripts\/redirects\.mjs"\);/u);
});
