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
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { configuredSiteAddress } from "../ui/garden/same-site.mjs";

const escapeHtml = (value) => String(value).replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/** Valid `{ from, to }` pairs from the config; anything malformed is reported and skipped. */
export function readRedirects(config = {}, warn = () => {}) {
  const map = config?.redirects;
  if (!map) return [];
  if (typeof map !== "object" || Array.isArray(map)) {
    warn("redirects 应写成「旧路径: 新地址」的映射，已忽略。");
    return [];
  }
  const pairs = [];
  for (const [rawFrom, rawTo] of Object.entries(map)) {
    let from = String(rawFrom).trim();
    const to = String(rawTo ?? "").trim();
    try {
      from = decodeURI(from);
    } catch {
      // keep as written
    }
    if (!from.startsWith("/") || from.startsWith("//") || from === "/" || /(^|\/)\.\.?(\/|$)/u.test(from) || /[?#]/u.test(from)) {
      warn(`redirects：旧路径 ${rawFrom} 必须是站内路径（以 / 开头，不带 ?、# 和 ..），已跳过。`);
      continue;
    }
    if (!(to.startsWith("/") && !to.startsWith("//")) && !/^https?:\/\//iu.test(to)) {
      warn(`redirects：${rawFrom} 的新地址 ${rawTo} 应以 / 开头或是完整网址，已跳过。`);
      continue;
    }
    pairs.push({ from, to });
  }
  return pairs;
}

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
<script>location.replace(${JSON.stringify(href).replace(/</gu, "\\u003c")} + location.hash)</script>
</head>
<body>
<p>页面已移到 <a href="${escapeHtml(href)}">${escapeHtml(canonical)}</a>。</p>
</body>
</html>
`;
}

/**
 * Write one page per redirect into `outDir`. A redirect is skipped, with a
 * warning, when a real page already lives at the old path or when a site path
 * it points to was not built. Never throws for a bad entry.
 */
export function writeRedirects({ outDir, config = {}, env = {}, basePath = "", log = () => {} }) {
  const base = String(basePath ?? "").replace(/\/+$/u, "");
  let origin = "";
  try {
    const address = configuredSiteAddress(config, env);
    origin = address ? new URL(address).origin : "";
  } catch {
    origin = "";
  }
  const written = [];
  for (const { from, to } of readRedirects(config, log)) {
    const file = path.join(outDir, redirectFile(from));
    if (!path.resolve(file).startsWith(path.resolve(outDir) + path.sep)) continue;
    if (fs.existsSync(file)) {
      log(`redirects：${from} 已经有页面，没有覆盖。`);
      continue;
    }
    const external = /^https?:\/\//iu.test(to);
    if (!external) {
      const target = to.split(/[?#]/u, 1)[0];
      const built = [path.join(outDir, redirectFile(target)), path.join(outDir, target.replace(/^\/+/u, ""))]
        .some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!built) {
        log(`redirects：${from} 指向的 ${to} 不存在，已跳过。`);
        continue;
      }
    }
    const href = external ? to : `${base}${to}`;
    const canonical = external || !origin ? href : `${origin}${href}`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, redirectPage({ href, canonical }));
    written.push({ from, to: href, file });
  }
  return written;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  const outDir = path.join(siteRoot, "dist", "client");
  try {
    const config = parseYaml(fs.readFileSync(path.join(siteRoot, "site.config.yaml"), "utf8")) ?? {};
    if (config.redirects && fs.existsSync(outDir)) {
      const written = writeRedirects({ outDir, config, env: process.env, basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "", log: (line) => process.stdout.write(`警告：${line}\n`) });
      process.stdout.write(`旧地址跳转页：${written.length} 个。\n`);
    }
  } catch (error) {
    process.stdout.write(`警告：旧地址跳转页没有生成（${error.message}），继续构建。\n`);
  }
}
