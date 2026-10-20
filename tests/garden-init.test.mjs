import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, promises as fsPromises, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findBuiltEnglishHtmlCjk } from "../scripts/handbook-facts.mjs";

const CJK_OR_FULLWIDTH_RE = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/u;

const root = fileURLToPath(new URL("../", import.meta.url));
const engine = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

function initSite(extraArgs = []) {
  const parent = mkdtempSync(path.join(tmpdir(), "garden-init-"));
  const site = path.join(parent, "my-blog");
  const stdout = execFileSync(process.execPath, [path.join(root, "bin/garden.mjs"), "init", site, ...extraArgs], {
    cwd: parent,
    encoding: "utf8",
  });
  return { parent, site, stdout };
}

function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath ?? entry.path, entry.name)).split(path.sep).join("/"))
    .sort();
}

test("the site template's package.json is valid JSON and pins no engine version of its own", () => {
  const template = JSON.parse(readFileSync(path.join(root, "templates/site/package.json"), "utf8"));
  assert.equal(template.dependencies?.[engine.name], undefined);
});

test("garden init writes a site whose package.json parses and pins the current engine, and zh init output is unchanged", (t) => {
  const { parent, site, stdout } = initSite();
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const pkg = JSON.parse(readFileSync(path.join(site, "package.json"), "utf8"));
  assert.equal(pkg.dependencies[engine.name], `^${engine.version}`);
  assert.deepEqual(Object.keys(pkg.dependencies), [engine.name]);
  for (const file of ["site.config.yaml", "Makefile", "README.md", ".gitignore", "content/columns.yaml", "content/posts/.gitkeep", "content/thoughts/.gitkeep"]) {
    assert.ok(existsSync(path.join(site, file)), `${file} is missing`);
    assert.equal(
      readFileSync(path.join(site, file), "utf8"),
      readFileSync(path.join(root, "templates/site", file), "utf8"),
      `zh init file ${file} drifted from templates/site/${file}`,
    );
  }
  const makefile = readFileSync(path.join(site, "Makefile"), "utf8");
  for (const target of ["new", "dev", "update"]) assert.match(makefile, new RegExp(`^${target}:`, "m"));
  for (const excluded of ["site.config.en.yaml", "Makefile.en", "README.en.md", ".github/workflows/pages.yml"]) {
    assert.ok(!existsSync(path.join(site, excluded)), `zh init should not write ${excluded}`);
  }
  const nonSkillFiles = listFiles(site).filter((f) => !f.startsWith(".agents/skills/"));
  assert.deepEqual(nonSkillFiles, [
    ".gitignore",
    "Makefile",
    "README.md",
    "content/columns.yaml",
    "content/posts/.gitkeep",
    "content/thoughts/.gitkeep",
    "package.json",
    "site.config.yaml",
  ]);
  assert.match(stdout, /已创建站点：/u);
  assert.match(stdout, /https:\/\/giscus\.app\/zh-CN/u);
});

test("garden init with --locale en / en_US writes English site.config.yaml, Makefile, README.md, pages.yml workflow, and English Giscus guide", (t) => {
  for (const localeArg of ["en", "en_US"]) {
    const { parent, site, stdout } = initSite(["--locale", localeArg]);
    t.after(() => rmSync(parent, { recursive: true, force: true }));
    for (const [siteFile, templateFile] of [
      ["site.config.yaml", "templates/site/site.config.en.yaml"],
      ["Makefile", "templates/site/Makefile.en"],
      ["README.md", "templates/site/README.en.md"],
      [".github/workflows/pages.yml", "templates/workflows/pages.en.yml"],
    ]) {
      const actual = readFileSync(path.join(site, siteFile), "utf8");
      const expected = readFileSync(path.join(root, templateFile), "utf8");
      assert.equal(actual, expected, `${siteFile} should match ${templateFile}`);
      assert.doesNotMatch(actual, CJK_OR_FULLWIDTH_RE, `${siteFile} contains CJK or fullwidth characters`);
    }
    const siteConfig = readFileSync(path.join(site, "site.config.yaml"), "utf8");
    assert.match(siteConfig, /^locale:\s*en_US$/mu);
    for (const excluded of ["site.config.en.yaml", "Makefile.en", "README.en.md"]) {
      assert.ok(!existsSync(path.join(site, excluded)), `en init should not leave ${excluded}`);
    }
    assert.doesNotMatch(stdout, CJK_OR_FULLWIDTH_RE, `en init stdout contains CJK:\n${stdout}`);
    assert.match(stdout, /Created site:/u);
    assert.match(stdout, /https:\/\/giscus\.app\b/u);
    assert.doesNotMatch(stdout, /giscus\.app\/zh-CN/u);
  }
});

function findChromeBinary() {
  for (const candidate of ["/usr/local/bin/google-chrome", "/opt/google/chrome/chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      srv.close(() => resolve(addr.port));
    });
    srv.on("error", reject);
  });
}

function serveStaticDir(rootDir) {
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".json": "application/json; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
  };
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(reqUrl.pathname);
    let candidate = path.join(rootDir, pathname);
    if (existsSync(candidate) && readdirSync(path.dirname(candidate), { withFileTypes: true }).find((e) => e.name === path.basename(candidate))?.isDirectory()) {
      candidate = path.join(candidate, "index.html");
    } else if (!existsSync(candidate) && existsSync(`${candidate}.html`)) {
      candidate = `${candidate}.html`;
    } else if (!existsSync(candidate) && existsSync(path.join(candidate, "index.html"))) {
      candidate = path.join(candidate, "index.html");
    }
    if (existsSync(candidate)) {
      const ext = path.extname(candidate).toLowerCase();
      res.writeHead(200, { "content-type": mimeTypes[ext] ?? "application/octet-stream" });
      res.end(readFileSync(candidate));
      return;
    }
    const notFoundFile = path.join(rootDir, "404.html");
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(existsSync(notFoundFile) ? readFileSync(notFoundFile) : "Not found");
  });
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
    server.on("error", reject);
  });
}

async function verifyPagesInRealBrowser(chromeBin, baseUrl, routes) {
  const debugPort = await getFreePort();
  const userDataDir = mkdtempSync(path.join(tmpdir(), "garden-chrome-"));
  const proc = spawn(
    chromeBin,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let targets = null;
    for (let i = 0; i < 60; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        if (res.ok) {
          targets = await res.json();
          if (targets.length > 0) break;
        }
      } catch {
        // wait for DevTools port
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.ok(targets && targets.length > 0, "Chrome DevTools target did not start");
    const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    let msgId = 0;
    const pending = new Map();
    const exceptions = [];
    ws.addEventListener("message", (event) => {
      const data = JSON.parse(String(event.data));
      if (data.method === "Runtime.exceptionThrown") {
        exceptions.push(data.params?.exceptionDetails?.text ?? "runtime exception");
      }
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        msgId += 1;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });

    try {
      await send("Page.enable");
      await send("Runtime.enable");

      const results = {};
      for (const route of routes) {
        await send("Page.navigate", { url: `${baseUrl}${route}` });
        // Poll until document.readyState === 'complete' and main element is rendered
        for (let i = 0; i < 30; i += 1) {
          const state = await send("Runtime.evaluate", {
            expression: "document.readyState === 'complete' && Boolean(document.querySelector('main'))",
            returnByValue: true,
          });
          if (state?.result?.value === true) break;
          await new Promise((r) => setTimeout(r, 100));
        }
        await new Promise((r) => setTimeout(r, 150));
        const evalRes = await send("Runtime.evaluate", {
          expression: `JSON.stringify({
            lang: document.documentElement.lang,
            title: document.title,
            h1: document.querySelector("h1")?.textContent?.trim() ?? "",
            bodyText: document.body.innerText,
            metaTexts: Array.from(document.querySelectorAll("meta[content]")).map((m) => (m.getAttribute("name") || m.getAttribute("property") || "meta") + "=" + m.getAttribute("content")),
            permalinkLabel: document.querySelector("a.u-url")?.textContent?.trim() ?? "",
            commentsText: document.querySelector(".comments")?.textContent?.trim() ?? "",
            footerText: document.querySelector(".sh-footer")?.textContent?.trim() ?? "",
            navText: document.querySelector(".sh-nav")?.textContent?.trim() ?? "",
          })`,
          returnByValue: true,
        });
        results[route] = JSON.parse(evalRes.result.value);
      }
      await send("Browser.close").catch(() => {});
      ws.close();
      assert.deepEqual(exceptions, [], `Uncaught browser exceptions: ${exceptions.join("; ")}`);
      return results;
    } finally {
      ws.close();
    }
  } finally {
    if (proc.exitCode === null && proc.signalCode === null) {
      proc.kill("SIGTERM");
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          proc.kill("SIGKILL");
          resolve();
        }, 2000);
        proc.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    await fsPromises.rm(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
  }
}

test("an en_US site from garden init --locale en builds a 100% English static site with zero CJK across HTML, RSC .txt payloads, feeds, and generated files, verified in a real browser", { timeout: 10 * 60_000 }, async (t) => {
  const { parent, site } = initSite(["--locale", "en"]);
  t.after(() => rmSync(parent, { recursive: true, force: true }));

  // Link the workspace node_modules into the temp site so vinext and dependencies resolve without network.
  symlinkSync(path.join(root, "node_modules"), path.join(site, "node_modules"), "dir");

  const env = {
    ...process.env,
    GITHUB_ACTIONS: "",
    GARDEN_SITE: site,
    GARDEN_OFFLINE: "1",
    STATIC_EXPORT: "1",
    SITE_URL: "https://example.github.io",
    NEXT_PUBLIC_SITE_URL: "https://example.github.io",
    GISCUS_DISABLED: "1",
  };

  // Create a post via `garden new`, publish it, and add a column + thought so every route family is exercised.
  execFileSync(process.execPath, [path.join(root, "bin/garden.mjs"), "new"], {
    cwd: site,
    stdio: "inherit",
    env: { ...env, GARDEN_NEW_TITLE: "Hello, Garden", GARDEN_NEW_SLUG: "hello-garden" },
  });
  const postPath = path.join(site, "content/posts/hello-garden.md");
  const draftContent = readFileSync(postPath, "utf8");
  assert.doesNotMatch(draftContent, CJK_OR_FULLWIDTH_RE, "English draft template must not contain CJK");
  assert.match(draftContent, /description: "Write a one-sentence summary\."/u);
  writeFileSync(
    postPath,
    [
      "---",
      "title: Hello, Garden",
      "date: 2026-10-16 10:00:00",
      "updated: 2026-10-17 12:00:00",
      "description: First English post in a fresh site.",
      "tags:",
      "  - Notes",
      "  - Systems",
      "pinned: true",
      "references:",
      "  - title: CommonMark Spec",
      "    url: https://spec.commonmark.org/",
      "---",
      "",
      "## Getting Started",
      "",
      "Start writing in `content/posts/hello-garden.md`.",
      "",
      "### Subsection",
      "",
      "> [!NOTE]",
      "> A quiet English note callout.",
      "",
      "```ts",
      "export const greeting = 'hello';",
      "```",
      "",
    ].join("\n"),
  );

  // Add a second post in a column and a thought entry
  mkdirSync(path.join(site, "content/posts/systems-notes"), { recursive: true });
  writeFileSync(
    path.join(site, "content/posts/systems-notes/first-step.md"),
    [
      "---",
      "title: First Step",
      "date: 2026-09-20 09:00:00",
      "description: Opening note in an English column.",
      "tags:",
      "  - Systems",
      "---",
      "",
      "## Why Columns",
      "",
      "Columns group related essays in reading order.",
      "",
    ].join("\n"),
  );
  writeFileSync(
    path.join(site, "content/columns.yaml"),
    [
      "columns:",
      "  - slug: systems-notes",
      "    title: Systems Notes",
      "    description: Notes on building reliable systems.",
      "    posts:",
      "      - systems-notes/first-step",
      "",
    ].join("\n"),
  );
  writeFileSync(
    path.join(site, "content/thoughts/morning-coffee.md"),
    [
      "---",
      "title: Morning Coffee",
      "date: 2026-10-18 08:30:00",
      "description: Clear autumn morning note.",
      "tags:",
      "  - Daily",
      "---",
      "",
      "Clear autumn morning before starting the build.",
      "",
    ].join("\n"),
  );

  execFileSync(process.execPath, [path.join(root, "bin/garden.mjs"), "build"], { cwd: site, stdio: "inherit", env });
  execFileSync(process.execPath, [path.join(root, "bin/garden.mjs"), "pages:validate"], { cwd: site, stdio: "inherit", env });

  // Verify generated files in site root, .garden/, and public/
  for (const genFile of [
    "site.config.yaml",
    "Makefile",
    "README.md",
    ".env.local",
    ".github/workflows/pages.yml",
    ".garden/site-config.ts",
    "public/rss.xml",
    "public/posts.xml",
    "public/sitemap.xml",
    "public/search-index.json",
  ]) {
    const text = readFileSync(path.join(site, genFile), "utf8");
    assert.doesNotMatch(text, CJK_OR_FULLWIDTH_RE, `Generated file ${genFile} contains CJK:\n${text.match(CJK_OR_FULLWIDTH_RE)?.[0]}`);
  }
  const generatedContentTs = readFileSync(path.join(site, ".garden/generated-content.ts"), "utf8");
  const generatedPostsAndThoughts = generatedContentTs.slice(0, generatedContentTs.indexOf("export const gardenDocs ="));
  assert.doesNotMatch(generatedPostsAndThoughts, CJK_OR_FULLWIDTH_RE, ".garden/generated-content.ts posts/thoughts/columns contain CJK");
  const rssXml = readFileSync(path.join(site, "public/rss.xml"), "utf8");
  assert.match(rssXml, /<language>en-US<\/language>/u);
  assert.match(rssXml, /<title>Garden<\/title>/u);
  const postsXml = readFileSync(path.join(site, "public/posts.xml"), "utf8");
  assert.match(postsXml, /<language>en-US<\/language>/u);
  assert.match(postsXml, /<title>Garden<\/title>/u);

  // Verify ALL built files in dist/client: HTML, .txt/RSC payloads, XML, JSON
  const clientDir = path.join(site, "dist/client");
  const builtFiles = listFiles(clientDir);
  assert.ok(builtFiles.includes("index.html"));
  assert.ok(builtFiles.includes("index.txt"));
  assert.ok(builtFiles.includes("404.html"));
  assert.ok(builtFiles.includes("blog/index.html"));
  assert.ok(builtFiles.includes("blog/hello-garden/index.html"));
  assert.ok(builtFiles.includes("columns/index.html"));
  assert.ok(builtFiles.includes("columns/systems-notes/first-step/index.html"));
  assert.ok(builtFiles.includes("tags/index.html"));
  assert.ok(builtFiles.includes("thoughts/index.html"));
  assert.ok(builtFiles.includes("about/index.html"));

  const cjkFailures = [];
  for (const rel of builtFiles) {
    if (!/\.(?:html|txt|xml|json)$/u.test(rel)) continue;
    const text = readFileSync(path.join(clientDir, rel), "utf8");
    const route = `/${rel.replace(/\/index\.(?:html|txt)$/u, "").replace(/^index\.(?:html|txt)$/u, "")}`;
    const isHandbookRoute = route === "/garden" || route.startsWith("/garden/");
    if (rel.endsWith(".html")) {
      if (isHandbookRoute) {
        const normalizedRoute = route.startsWith("/garden/en") ? route : route.replace(/^\/garden/u, "/garden/en");
        for (const issue of findBuiltEnglishHtmlCjk(text, normalizedRoute)) {
          cjkFailures.push(`${rel}: ${issue.message}`);
        }
      } else if (CJK_OR_FULLWIDTH_RE.test(text)) {
        const match = text.match(/.{0,30}[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]+.{0,30}/u)?.[0];
        cjkFailures.push(`${rel}: unexpected CJK in non-handbook HTML: ${JSON.stringify(match)}`);
      }
    } else if (rel.endsWith(".txt")) {
      // RSC payload: strip only the narrow handbook allowlist on /garden/** routes
      let scrubbed = text;
      if (isHandbookRoute) {
        scrubbed = scrubbed
          .replace(/"children":"中"/gu, '"children":"ZH"')
          .replace(/[丨｜]/gu, "|");
        if (route === "/garden/components/figure" || route === "/garden/en/components/figure") {
          scrubbed = scrubbed.replace(/"全部"/gu, '"ALL"');
        }
      }
      if (CJK_OR_FULLWIDTH_RE.test(scrubbed)) {
        const match = scrubbed.match(/.{0,30}[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]+.{0,30}/u)?.[0];
        cjkFailures.push(`${rel}: unexpected CJK in RSC payload: ${JSON.stringify(match)}`);
      }
    } else if (CJK_OR_FULLWIDTH_RE.test(text)) {
      const match = text.match(/.{0,30}[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]+.{0,30}/u)?.[0];
      cjkFailures.push(`${rel}: unexpected CJK: ${JSON.stringify(match)}`);
    }
  }
  assert.deepEqual(cjkFailures, [], `Found CJK in built en_US site:\n${cjkFailures.join("\n")}`);

  // Key static HTML checks across routes
  const homeHtml = readFileSync(path.join(clientDir, "index.html"), "utf8");
  assert.match(homeHtml, /<html lang="en"/u);
  assert.match(homeHtml, />About</u);
  assert.match(homeHtml, />Latest post</u);
  assert.match(homeHtml, />Recent updates</u);
  assert.match(homeHtml, />Oct 16, 2026</u);
  assert.match(homeHtml, />Sep 20</u);
  assert.match(homeHtml, />Pinned</u);
  assert.match(homeHtml, />Columns</u);
  assert.match(homeHtml, />Built with <a /u);

  const postHtml = readFileSync(path.join(clientDir, "blog/hello-garden/index.html"), "utf8");
  assert.match(postHtml, /Permanent link to Hello, Garden/u);
  assert.match(postHtml, /Updated Oct 17, 2026/u);
  assert.match(postHtml, /Comments are not enabled yet\. Configure the four variables below to show the comment box\./u);
  assert.match(postHtml, /https:\/\/giscus\.app"/u);
  assert.match(postHtml, /<h2 id="article-references-heading">References<\/h2>/u);

  const aboutHtml = readFileSync(path.join(clientDir, "about/index.html"), "utf8");
  assert.match(aboutHtml, /alt="[^"]*&#x27;s GitHub avatar"|alt="[^']*'s GitHub avatar"/u);

  const notFoundHtml = readFileSync(path.join(clientDir, "404.html"), "utf8");
  assert.match(notFoundHtml, />Page not found</u);
  assert.match(notFoundHtml, />Back to home</u);

  // Real-browser verification of home (/), post (/blog/hello-garden/), and 404 (/does-not-exist)
  const chromeBin = findChromeBinary();
  assert.ok(chromeBin, "Expected a local Chrome/Chromium binary for real-browser verification");
  const { server, port } = await serveStaticDir(clientDir);
  t.after(() => server.close());

  const browserPages = await verifyPagesInRealBrowser(chromeBin, `http://127.0.0.1:${port}`, [
    "/",
    "/blog/hello-garden/",
    "/does-not-exist",
  ]);

  // 1. Home page in real browser
  assert.equal(browserPages["/"].lang, "en");
  assert.match(browserPages["/"].bodyText, /About/u);
  assert.match(browserPages["/"].bodyText, /Latest post/u);
  assert.match(browserPages["/"].bodyText, /Oct 16, 2026/u);
  assert.match(browserPages["/"].bodyText, /Recent updates/u);
  assert.match(browserPages["/"].footerText, /Built with Garden/u);
  assert.doesNotMatch(browserPages["/"].bodyText, CJK_OR_FULLWIDTH_RE);
  for (const meta of browserPages["/"].metaTexts) {
    assert.doesNotMatch(meta, CJK_OR_FULLWIDTH_RE, `Home meta has CJK: ${meta}`);
  }

  // 2. Post page in real browser
  assert.equal(browserPages["/blog/hello-garden/"].lang, "en");
  assert.equal(browserPages["/blog/hello-garden/"].h1, "Hello, Garden");
  assert.equal(browserPages["/blog/hello-garden/"].permalinkLabel, "Permanent link to Hello, Garden");
  assert.match(browserPages["/blog/hello-garden/"].commentsText, /Comments are not enabled yet\. Configure the four variables below to show the comment box\./u);
  assert.doesNotMatch(browserPages["/blog/hello-garden/"].bodyText, CJK_OR_FULLWIDTH_RE);
  for (const meta of browserPages["/blog/hello-garden/"].metaTexts) {
    assert.doesNotMatch(meta, CJK_OR_FULLWIDTH_RE, `Post meta has CJK: ${meta}`);
  }

  // 3. 404 page in real browser
  assert.equal(browserPages["/does-not-exist"].lang, "en");
  assert.equal(browserPages["/does-not-exist"].h1, "Page not found");
  assert.match(browserPages["/does-not-exist"].bodyText, /Back to home/u);
  assert.doesNotMatch(browserPages["/does-not-exist"].bodyText, CJK_OR_FULLWIDTH_RE);
  for (const meta of browserPages["/does-not-exist"].metaTexts) {
    assert.doesNotMatch(meta, CJK_OR_FULLWIDTH_RE, `404 meta has CJK: ${meta}`);
  }
});

// Installs the packed engine into a fresh site and builds it. Slow and needs the
// npm registry, so it runs only when GARDEN_INIT_BUILD=1 (CI sets it).
test("a site from garden init installs the packed engine and builds", { skip: process.env.GARDEN_INIT_BUILD !== "1", timeout: 15 * 60_000 }, (t) => {
  const { parent, site } = initSite();
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const packed = execFileSync("npm", ["pack", "--silent", "--pack-destination", parent], { cwd: root, encoding: "utf8" }).trim().split("\n").at(-1);
  const tarball = path.join(parent, packed);
  assert.ok(existsSync(tarball), `npm pack did not write ${tarball}`);
  execFileSync("npm", ["install", "--no-audit", "--no-fund", tarball], { cwd: site, stdio: "inherit" });
  const env = {
    ...process.env,
    STATIC_EXPORT: "1",
    SITE_URL: "https://example.github.io",
    NEXT_PUBLIC_SITE_URL: "https://example.github.io",
    GISCUS_DISABLED: "1",
  };
  execFileSync("npx", ["--no-install", "garden", "new"], { cwd: site, stdio: "inherit", env: { ...env, GARDEN_NEW_TITLE: "你好，世界", GARDEN_NEW_SLUG: "hello" } });
  execFileSync("npx", ["--no-install", "garden", "build"], { cwd: site, stdio: "inherit", env });
  execFileSync("npx", ["--no-install", "garden", "pages:validate"], { cwd: site, stdio: "inherit", env });
  assert.ok(existsSync(path.join(site, "dist/client/index.html")));
  assert.ok(readdirSync(path.join(site, "content/posts")).includes("hello.md"));
});
