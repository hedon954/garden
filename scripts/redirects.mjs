#!/usr/bin/env node
/**
 * Pages for old addresses. `redirects` in site.config.yaml maps an old path to
 * where the page lives now:
 *
 *   redirects:
 *     /2024/01/20/go/go-gpm/: /blog/go/go-gpm/
 *
 * A static export (GitHub Pages and the like) has no server to answer with a
 * 301, so each old path gets a small page that sends the reader on: a meta
 * refresh, a script that keeps the #anchor, and rel="canonical" for search
 * engines. Runs after the build, into dist/client.
 *
 * Columns have no index page of their own: each column is a section of
 * /columns/ whose heading id is the column slug. So every column in
 * content/columns.yaml also gets /columns/<slug>/ → /columns/#<slug>.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { configuredSiteAddress } from "../ui/garden/same-site.mjs";

const escapeHtml = (value) => String(value).replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

// Shared with the article renderer, which rewrites links to old addresses (ui/garden/internal-links.mjs).
export { columnRedirects, readRedirects } from "../ui/garden/internal-links.mjs";
import { columnRedirects, readRedirects } from "../ui/garden/internal-links.mjs";

/** The file an old path is served from: `/a/b/` and `/a/b` → a/b/index.html, `/a/b.html` → a/b.html. */
export function redirectFile(from) {
  const clean = from.replace(/^\/+/u, "");
  return /\.html?$/iu.test(clean) ? clean : path.posix.join(clean.replace(/\/+$/u, ""), "index.html");
}

export function redirectPage({ href, canonical }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>页面已移动</title>
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(href)}">
<script>location.replace(${JSON.stringify(href).replace(/</gu, "\\u003c")}${href.includes("#") ? "" : " + location.hash"})</script>
</head>
<body>
<p>页面已移到 <a href="${escapeHtml(href)}">${escapeHtml(canonical)}</a>。</p>
</body>
</html>
`;
}

/**
 * Write one page per redirect into `outDir`. Returns what was written, how
 * many pages the valid entries call for, and the entries that got no page.
 *
 * A malformed entry (not a site path, a bad target, the same old path twice)
 * is left out with a warning and does not count. A valid entry is skipped,
 * also with a warning, when a real page already lives at the old path or when
 * the site path it points to was not built; the build step then fails,
 * because `written` falls short of `expected`.
 */
export function generateRedirects({ outDir, config = {}, env = {}, basePath = "", log = () => {}, extra = [] }) {
  const base = String(basePath ?? "").replace(/\/+$/u, "");
  let origin = "";
  try {
    const address = configuredSiteAddress(config, env);
    origin = address ? new URL(address).origin : "";
  } catch {
    origin = "";
  }
  const written = [];
  const skipped = [];
  const configured = readRedirects(config, log);
  // Configured redirects win over generated ones for the same old path.
  const taken = new Set(configured.map(({ from }) => redirectFile(from)));
  const candidates = [...configured, ...extra.filter(({ from }) => !taken.has(redirectFile(from)))];
  const seen = new Set();
  const pairs = [];
  for (const pair of candidates) {
    const file = redirectFile(pair.from);
    if (seen.has(file)) {
      log(`redirects：${pair.from} 和前面的旧路径是同一个页面，已跳过。`);
      continue;
    }
    seen.add(file);
    pairs.push(pair);
  }
  for (const { from, to } of pairs) {
    const file = path.join(outDir, redirectFile(from));
    if (!path.resolve(file).startsWith(path.resolve(outDir) + path.sep)) {
      log(`redirects：${from} 不在站点目录里，已跳过。`);
      skipped.push({ from, to, reason: "outside" });
      continue;
    }
    if (fs.existsSync(file)) {
      log(`redirects：${from} 已经有页面，没有覆盖。`);
      skipped.push({ from, to, reason: "page-exists" });
      continue;
    }
    const external = /^https?:\/\//iu.test(to);
    if (!external) {
      const target = to.split(/[?#]/u, 1)[0];
      const built = [path.join(outDir, redirectFile(target)), path.join(outDir, target.replace(/^\/+/u, ""))]
        .some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!built) {
        log(`redirects：${from} 指向的 ${to} 不存在，已跳过。`);
        skipped.push({ from, to, reason: "missing-target" });
        continue;
      }
    }
    const href = external ? to : `${base}${to}`;
    const canonical = external || !origin ? href : `${origin}${href}`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, redirectPage({ href, canonical }));
    written.push({ from, to: href, file });
  }
  return { written, expected: pairs.length, skipped };
}

/** The pages written by `generateRedirects`. Never throws for a bad entry. */
export function writeRedirects(options) {
  return generateRedirects(options).written;
}

/**
 * The build step. Exit code 1 when it throws or when fewer pages were written
 * than the valid entries call for; a malformed entry only prints a warning.
 */
export function runRedirectStep({ siteRoot, env = process.env, out = process.stdout, err = process.stderr }) {
  const outDir = path.join(siteRoot, "dist", "client");
  try {
    const config = parseYaml(fs.readFileSync(path.join(siteRoot, "site.config.yaml"), "utf8")) ?? {};
    const columnsFile = path.join(siteRoot, "content", "columns.yaml");
    const extra = fs.existsSync(columnsFile) ? columnRedirects(parseYaml(fs.readFileSync(columnsFile, "utf8")) ?? {}) : [];
    if (!config.redirects && !extra.length) return 0;
    if (!fs.existsSync(outDir)) throw new Error(`找不到构建产物 ${path.relative(siteRoot, outDir)}`);
    const basePath = env.NEXT_PUBLIC_BASE_PATH ?? "";
    const { written, expected, skipped } = generateRedirects({
      outDir,
      config,
      env,
      basePath,
      log: (line) => out.write(`警告：${line}\n`),
      extra,
    });
    out.write(`旧地址跳转页：${written.length} 个。\n`);
    if (written.length !== expected) {
      const list = skipped.map(({ from, to }) => `  ${from} → ${to}`).join("\n");
      err.write(`错误：旧地址跳转页应有 ${expected} 个，只生成了 ${written.length} 个。没有生成的：\n${list}\n改好 site.config.yaml 的 redirects（或补上目标页面）后重新构建。\n`);
      return 1;
    }
    return 0;
  } catch (error) {
    err.write(`错误：旧地址跳转页生成失败（${error.message}），构建中止。\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  process.exitCode = runRedirectStep({ siteRoot });
}
