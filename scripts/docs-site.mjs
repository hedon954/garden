#!/usr/bin/env node
/**
 * Standalone Garden User Documentation builder & dev server (`hedon.top/garden/`).
 *
 * Isolates generated state inside `.garden/docs-site/` so building or previewing
 * the handbook never pollutes the engine repository's sample blog build or git tree.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startDev } from "./dev-server.mjs";
import { ensureLink } from "./vinext-runtime.mjs";
import { runFaviconStep } from "./favicon-ico.mjs";
import { prepareDocsPagesOutput } from "./prepare-docs-pages.mjs";

const gardenPackageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsSiteRoot = path.join(gardenPackageRoot, ".garden", "docs-site");
const docsRuntimeRoot = path.join(docsSiteRoot, ".garden", "runtime");
const docsOutputDir = path.join(gardenPackageRoot, "dist", "docs-client");

const DOCS_SITE_CONFIG = `name: Garden 用户手册
tagline: Markdown · AI 协作 · 静态发布
description: Garden 开源个人博客引擎官方用户文档。
locale: zh_CN
url: https://hedon.top

author:
  name: Hedon
  github: hedon954
  githubBio: ""
  githubPinned: []

pages:
  home:
    title: Garden 用户手册
    subtitle: 用 Markdown 写作，通过 AI 协作表达智能 UI，推送即自动发布。
  blog:
    title: 博文
    subtitle: ""
  columns:
    title: 专栏
    subtitle: ""
  about:
    title: 关于
    subtitle: ""

footer: Garden 用户手册
`;

function hasEnglishHandbookMarkdown() {
  const enRoot = path.join(gardenPackageRoot, "docs", "handbook", "en");
  if (!fs.existsSync(enRoot)) return false;
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).some((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith(".md"),
    );
  return walk(enRoot);
}

function resolveVinext() {
  const require = createRequire(path.join(gardenPackageRoot, "package.json"));
  try {
    const vinextRoot = path.dirname(require.resolve("vinext/package.json"));
    const manifest = JSON.parse(fs.readFileSync(path.join(vinextRoot, "package.json"), "utf8"));
    const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin.vinext;
    return path.join(vinextRoot, bin);
  } catch {
    const candidate = path.join(gardenPackageRoot, "node_modules", "vinext", "dist", "cli.js");
    if (fs.existsSync(candidate)) return candidate;
    throw new Error("找不到 vinext，请先在仓库目录运行 npm install。");
  }
}

function prepareDocsWorkspace() {
  fs.mkdirSync(path.join(docsSiteRoot, ".garden"), { recursive: true });
  fs.mkdirSync(path.join(docsSiteRoot, "public"), { recursive: true });
  fs.mkdirSync(path.join(docsSiteRoot, "content", "posts"), { recursive: true });
  fs.writeFileSync(path.join(docsSiteRoot, "site.config.yaml"), DOCS_SITE_CONFIG);

  // Seed shared brand icons and cached link/image metadata from repo root
  for (const icon of ["favicon.svg", "apple-touch-icon.png", "og.png"]) {
    const src = path.join(gardenPackageRoot, "public", icon);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(docsSiteRoot, "public", icon));
  }
  const rootLinkAssetsDir = path.join(gardenPackageRoot, "public", "link-assets");
  if (fs.existsSync(rootLinkAssetsDir)) {
    fs.cpSync(rootLinkAssetsDir, path.join(docsSiteRoot, "public", "link-assets"), { recursive: true });
  }
  for (const cacheFile of ["link-assets.json", "image-sizes.json"]) {
    const src = path.join(gardenPackageRoot, ".garden", cacheFile);
    const dst = path.join(docsSiteRoot, ".garden", cacheFile);
    if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
  }
  const fileSizesSrc = path.join(gardenPackageRoot, "file-sizes.json");
  if (fs.existsSync(fileSizesSrc)) {
    fs.copyFileSync(fileSizesSrc, path.join(docsSiteRoot, "file-sizes.json"));
  }

  // Assemble docs runtime overlay using docs-app/ as app/ (copy files so vinext route scanner walks nested directories)
  fs.mkdirSync(docsRuntimeRoot, { recursive: true });
  const runtimeAppDir = path.join(docsRuntimeRoot, "app");
  fs.rmSync(runtimeAppDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeAppDir, { recursive: true });

  const docsAppRoot = path.join(gardenPackageRoot, "docs-app");
  const includeEn = hasEnglishHandbookMarkdown();
  for (const entry of fs.readdirSync(docsAppRoot, { withFileTypes: true })) {
    if (entry.name === "en" && !includeEn) continue;
    fs.cpSync(path.join(docsAppRoot, entry.name), path.join(runtimeAppDir, entry.name), { recursive: true });
  }
  ensureLink(path.join(gardenPackageRoot, "docs-app"), path.join(docsRuntimeRoot, "docs-app"));
  ensureLink(path.join(gardenPackageRoot, "app"), path.join(docsRuntimeRoot, "engine-app"));

  const links = [
    ["ui", path.join(gardenPackageRoot, "ui")],
    ["scripts", path.join(gardenPackageRoot, "scripts")],
    ["docs", path.join(gardenPackageRoot, "docs")],
    ["build", path.join(gardenPackageRoot, "build")],
    ["worker", path.join(gardenPackageRoot, "worker")],
    [".openai", path.join(gardenPackageRoot, ".openai")],
    ["vite.config.ts", path.join(gardenPackageRoot, "vite.config.ts")],
    ["next.config.ts", path.join(gardenPackageRoot, "next.config.ts")],
    ["postcss.config.mjs", path.join(gardenPackageRoot, "postcss.config.mjs")],
    ["tsconfig.json", path.join(gardenPackageRoot, "tsconfig.json")],
    ["package.json", path.join(gardenPackageRoot, "package.json")],
    ["node_modules", path.join(gardenPackageRoot, "node_modules")],
    ["public", path.join(docsSiteRoot, "public")],
    ["content", path.join(docsSiteRoot, "content")],
    ["site.config.yaml", path.join(docsSiteRoot, "site.config.yaml")],
  ];
  for (const [name, from] of links) {
    if (fs.existsSync(from)) ensureLink(from, path.join(docsRuntimeRoot, name));
  }
}

function docsEnv(extra = {}) {
  const siteUrl = (process.env.SITE_URL ?? "https://hedon.top").replace(/\/+$/u, "");
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/garden").replace(/\/+$/u, "");
  return {
    ...process.env,
    GARDEN_MODE: "docs",
    GARDEN_SITE: docsSiteRoot,
    NEXT_PUBLIC_BASE_PATH: basePath,
    SITE_URL: siteUrl,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    GISCUS_DISABLED: "1",
    WRANGLER_LOG_PATH: path.join(docsSiteRoot, ".wrangler", "wrangler.log"),
    ...extra,
  };
}

function runScript(script, scriptArgs = [], env = docsEnv()) {
  const result = spawnSync(process.execPath, [path.join(gardenPackageRoot, script), ...scriptArgs], {
    cwd: docsSiteRoot,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

const mode = process.argv[2] ?? "build";
const extraArgs = process.argv.slice(3);

prepareDocsWorkspace();

if (mode === "dev") {
  const env = docsEnv({ GARDEN_DEV_WORKER: "0", CONTENT_INCLUDE_DRAFTS: "1" });
  const syncDocs = async () => {
    if (env.GARDEN_OFFLINE !== "1") {
      spawnSync(process.execPath, [path.join(gardenPackageRoot, "scripts/link-assets.mjs"), "--dev"], {
        cwd: docsSiteRoot,
        env,
        stdio: "inherit",
      });
    }
    runScript("scripts/build-content.mjs", [], env);
  };
  const { finished } = await startDev({
    cwd: docsRuntimeRoot,
    executable: resolveVinext(),
    args: extraArgs,
    env,
    prepare: syncDocs,
  });
  const result = await finished;
  if (result.status !== 0) process.exit(result.status || 1);
} else if (mode === "build") {
  const env = docsEnv({ STATIC_EXPORT: "1" });
  if (env.GARDEN_OFFLINE !== "1") {
    runScript("scripts/link-assets.mjs", [], env);
    runScript("scripts/image-sizes.mjs", [], env);
    runScript("scripts/file-sizes.mjs", [], env);
  }
  runScript("scripts/build-content.mjs", [], env);
  const buildRes = spawnSync(process.execPath, [resolveVinext(), "build", ...extraArgs], {
    cwd: docsRuntimeRoot,
    env,
    stdio: "inherit",
  });
  if (buildRes.status !== 0) process.exit(buildRes.status || 1);

  const rawDist = path.join(docsRuntimeRoot, "dist");
  const siteDist = path.join(docsSiteRoot, "dist");
  fs.rmSync(siteDist, { recursive: true, force: true });
  fs.cpSync(rawDist, siteDist, { recursive: true });

  await runFaviconStep({ siteRoot: docsSiteRoot, env });
  const summary = await prepareDocsPagesOutput({
    rawClientDir: path.join(siteDist, "client"),
    outputDir: docsOutputDir,
    basePath: env.NEXT_PUBLIC_BASE_PATH,
  });
  process.stdout.write(`Docs static site ready: ${summary.pages} pages, ${summary.assets} assets -> ${summary.outputDir}\n`);
} else {
  process.stderr.write(`Usage: node scripts/docs-site.mjs <dev|build>\n`);
  process.exit(1);
}
