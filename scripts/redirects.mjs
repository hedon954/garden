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
import { withTrailingSlash } from "../ui/garden/site-href.mjs";
import { resolveBrand } from "./brand.mjs";

const escapeHtml = (value) => String(value).replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

// Shared with the article renderer, which rewrites links to old addresses (ui/garden/internal-links.mjs).
export { columnRedirects, readRedirects } from "../ui/garden/internal-links.mjs";
import { columnRedirects, readRedirects } from "../ui/garden/internal-links.mjs";

/** The file an old path is served from: `/a/b/` and `/a/b` → a/b/index.html, `/a/b.html` → a/b.html. */
export function redirectFile(from) {
  const clean = from.replace(/^\/+/u, "");
  return /\.html?$/iu.test(clean) ? clean : path.posix.join(clean.replace(/\/+$/u, ""), "index.html");
}

export function redirectPage({ href, canonical, icon = "", lang = "zh" }) {
  // The site's own icon, so the browser does not go looking for /favicon.ico.
  const iconLink = icon ? `\n<link rel="icon" href="${escapeHtml(icon)}"${/\.svg(?:[?#]|$)/iu.test(icon) ? ' type="image/svg+xml"' : ""}>` : "";
  const isEn = lang === "en";
  const htmlLang = isEn ? "en" : "zh-CN";
  const title = isEn ? "Page moved" : "页面已移动";
  const bodyText = isEn
    ? `<p>This page has moved to <a href="${escapeHtml(href)}">${escapeHtml(canonical)}</a>.</p>`
    : `<p>页面已移到 <a href="${escapeHtml(href)}">${escapeHtml(canonical)}</a>。</p>`;
  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="canonical" href="${escapeHtml(canonical)}">${iconLink}
<meta http-equiv="refresh" content="0; url=${escapeHtml(href)}">
<script>location.replace(${JSON.stringify(href).replace(/</gu, "\\u003c")}${href.includes("#") ? "" : " + location.hash"})</script>
</head>
<body>
${bodyText}
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
 * the site path it points to was not built. Both are problems with that one
 * entry, so they do not stop the build: `written` plus `skipped` makes up
 * `expected`.
 */
export function generateRedirects({ outDir, config = {}, env = {}, basePath = "", log = () => {}, extra = [], icon = "" }) {
  const base = String(basePath ?? "").replace(/\/+$/u, "");
  const lang = /^en/iu.test(String(config?.locale ?? "")) ? "en" : "zh";
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
    // A static export serves pages as folders: the target keeps the trailing slash like every site link.
    const href = external ? to : withTrailingSlash(`${base}${to}`);
    const canonical = external || !origin ? href : `${origin}${href}`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, redirectPage({ href, canonical, icon, lang }));
    written.push({ from, to: href, file });
  }
  return { written, expected: pairs.length, skipped };
}

/** The pages written by `generateRedirects`. Never throws for a bad entry. */
export function writeRedirects(options) {
  return generateRedirects(options).written;
}

/**
 * The build step. A bad entry, a missing target and a page already at the old
 * path only print a warning. Exit code 1 when the step throws, or when the
 * pages written are not the valid entries minus the ones skipped with a
 * warning (a page went missing without a reason).
 */
export function runRedirectStep({ siteRoot, env = process.env, out = process.stdout, err = process.stderr, generate = generateRedirects }) {
  const baseDir = String(env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/^\/+|\/+$/gu, "");
  // A base-path build exports pages under dist/client/<base>/, so old paths and targets live there.
  const outDir = baseDir && fs.existsSync(path.join(siteRoot, "dist", "client", baseDir))
    ? path.join(siteRoot, "dist", "client", baseDir)
    : path.join(siteRoot, "dist", "client");
  try {
    const config = parseYaml(fs.readFileSync(path.join(siteRoot, "site.config.yaml"), "utf8")) ?? {};
    const columnsFile = path.join(siteRoot, "content", "columns.yaml");
    const extra = fs.existsSync(columnsFile) ? columnRedirects(parseYaml(fs.readFileSync(columnsFile, "utf8")) ?? {}) : [];
    if (!config.redirects && !extra.length) return 0;
    if (!fs.existsSync(outDir)) throw new Error(`找不到构建产物 ${path.relative(siteRoot, outDir)}`);
    const basePath = env.NEXT_PUBLIC_BASE_PATH ?? "";
    const { written, expected, skipped } = generate({
      outDir,
      config,
      env,
      basePath,
      icon: resolveBrand(siteRoot, config, basePath.replace(/\/+$/u, "")).favicon,
      log: (line) => out.write(`警告：${line}\n`),
      extra,
    });
    out.write(`旧地址跳转页：${written.length} 个${skipped.length ? `，跳过 ${skipped.length} 个（见上面的警告）` : ""}。\n`);
    const due = expected - skipped.length;
    if (written.length !== due) {
      err.write(`错误：旧地址跳转页应生成 ${due} 个（${expected} 条有效配置，跳过 ${skipped.length} 条），实际生成了 ${written.length} 个，构建中止。\n`);
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
