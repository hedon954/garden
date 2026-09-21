#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { gardenPackageRoot, gardenSiteRoot } from "../scripts/garden-paths.mjs";

const siteRoot = gardenSiteRoot();
const args = process.argv.slice(2);
const command = args[0] ?? "help";
const rest = args.slice(1);

function siteEnv(extra = {}) {
  return {
    ...process.env,
    ...extra,
    GARDEN_SITE: siteRoot,
    WRANGLER_LOG_PATH:
      process.env.WRANGLER_LOG_PATH ?? path.join(siteRoot, ".wrangler", "wrangler.log"),
  };
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function runNode(script, scriptArgs = [], { cwd = siteRoot, env } = {}) {
  const result = spawnSync(process.execPath, [path.join(gardenPackageRoot, script), ...scriptArgs], {
    cwd,
    env: env ?? siteEnv(),
    stdio: "inherit",
  });
  if (result.status) process.exit(result.status ?? 1);
}

function resolveVinext() {
  const require = createRequire(path.join(gardenPackageRoot, "package.json"));
  try {
    const vinextRoot = path.dirname(require.resolve("vinext/package.json"));
    const manifest = JSON.parse(fs.readFileSync(path.join(vinextRoot, "package.json"), "utf8"));
    const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin.vinext;
    return path.join(vinextRoot, bin);
  } catch {
    for (const candidate of [
      path.join(siteRoot, "node_modules", "vinext", "dist", "cli.js"),
      path.join(gardenPackageRoot, "node_modules", "vinext", "dist", "cli.js"),
    ]) {
      if (fs.existsSync(candidate)) return candidate;
    }
    fail("找不到 vinext。请在站点目录运行 npm install。");
  }
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

function isPackageSite() {
  return samePath(siteRoot, gardenPackageRoot);
}

function ensureLink(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    const stat = fs.lstatSync(to);
    if (stat.isSymbolicLink() && fs.readlinkSync(to) === from) return;
    if (stat.isSymbolicLink()) fs.unlinkSync(to);
    else return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  fs.symlinkSync(from, to);
}

function ensurePublic() {
  const dest = path.join(siteRoot, "public");
  fs.mkdirSync(dest, { recursive: true });
  for (const name of ["favicon.svg", "og.png"]) {
    const from = path.join(gardenPackageRoot, "public", name);
    const to = path.join(dest, name);
    if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to);
  }
  const imagesFrom = path.join(gardenPackageRoot, "public", "images");
  const imagesTo = path.join(dest, "images");
  if (fs.existsSync(imagesFrom) && !fs.existsSync(imagesTo)) {
    fs.cpSync(imagesFrom, imagesTo, { recursive: true });
  }
}

function ensureEnv() {
  const example = path.join(gardenPackageRoot, ".env.example");
  const local = path.join(siteRoot, ".env.local");
  if (!fs.existsSync(local) && fs.existsSync(example)) {
    fs.copyFileSync(example, local);
  }
}

function resolveNodeModules() {
  const siteModules = path.join(siteRoot, "node_modules");
  const packageModules = path.join(gardenPackageRoot, "node_modules");
  if (fs.existsSync(path.join(siteModules, "vinext"))) return siteModules;
  if (fs.existsSync(path.join(packageModules, "vinext"))) return packageModules;
  return siteModules;
}

function vinextRoot() {
  if (isPackageSite()) return gardenPackageRoot;

  const runtime = path.join(siteRoot, ".garden", "runtime");
  fs.mkdirSync(runtime, { recursive: true });

  const links = [
    ["app", path.join(gardenPackageRoot, "app")],
    ["build", path.join(gardenPackageRoot, "build")],
    ["worker", path.join(gardenPackageRoot, "worker")],
    [".openai", path.join(gardenPackageRoot, ".openai")],
    ["vite.config.ts", path.join(gardenPackageRoot, "vite.config.ts")],
    ["next.config.ts", path.join(gardenPackageRoot, "next.config.ts")],
    ["postcss.config.mjs", path.join(gardenPackageRoot, "postcss.config.mjs")],
    ["tsconfig.json", path.join(gardenPackageRoot, "tsconfig.json")],
    ["package.json", path.join(gardenPackageRoot, "package.json")],
    ["node_modules", resolveNodeModules()],
    ["public", path.join(siteRoot, "public")],
    ["content", path.join(siteRoot, "content")],
    ["site.config.yaml", path.join(siteRoot, "site.config.yaml")],
  ];

  for (const name of [".env", ".env.local"]) {
    const from = path.join(siteRoot, name);
    if (fs.existsSync(from)) links.push([name, from]);
  }

  for (const [name, from] of links) {
    if (fs.existsSync(from) || name === "public" || name === "content") {
      if ((name === "public" || name === "content") && !fs.existsSync(from)) {
        fs.mkdirSync(from, { recursive: true });
      }
      ensureLink(from, path.join(runtime, name));
    }
  }

  return runtime;
}

function publishDist(fromRoot) {
  const from = path.join(fromRoot, "dist");
  const to = path.join(siteRoot, "dist");
  if (!fs.existsSync(from) || samePath(from, to)) return;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

function copyIfMissing(from, to) {
  if (fs.existsSync(to) || !fs.existsSync(from)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  return true;
}

function ensureSiteKit(destinationRoot = siteRoot) {
  if (samePath(destinationRoot, gardenPackageRoot)) return;

  const added = [];
  if (
    copyIfMissing(
      path.join(gardenPackageRoot, "templates", "site", "Makefile"),
      path.join(destinationRoot, "Makefile"),
    )
  ) {
    added.push("Makefile");
  }
  if (
    copyIfMissing(
      path.join(gardenPackageRoot, "scripts", "new-post.mjs"),
      path.join(destinationRoot, "scripts", "new-post.mjs"),
    )
  ) {
    added.push("scripts/new-post.mjs");
  }
  if (added.length) {
    process.stdout.write(`已补齐站点文件：${added.join("、")}\n`);
  }

  const skillFile = path.join(
    destinationRoot,
    ".agents",
    "skills",
    "garden-interactive-chart",
    "SKILL.md",
  );
  if (!fs.existsSync(skillFile)) installSkill(destinationRoot);
}

function prepare() {
  ensureEnv();
  ensurePublic();
  fs.mkdirSync(path.join(siteRoot, "content", "posts"), { recursive: true });
  fs.mkdirSync(path.join(siteRoot, "content", "thoughts"), { recursive: true });
  ensureSiteKit();
}

function sync() {
  if (!fs.existsSync(path.join(siteRoot, "site.config.yaml"))) {
    fail(`当前目录不是 Garden 站点（缺少 site.config.yaml）：${siteRoot}`);
  }
  prepare();
  runNode("scripts/build-content.mjs");
}

function runVinext(vinextArgs, { copyDist = false } = {}) {
  sync();
  const cwd = vinextRoot();
  const result = spawnSync(process.execPath, [resolveVinext(), ...vinextArgs], {
    cwd,
    env: siteEnv(),
    stdio: "inherit",
  });
  if (copyDist) publishDist(cwd);
  if (result.status) process.exit(result.status ?? 1);
}

function copyTemplate(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const source = path.join(from, entry.name);
    const destination = path.join(to, entry.name);
    if (entry.isDirectory()) copyTemplate(source, destination);
    else if (!fs.existsSync(destination)) fs.copyFileSync(source, destination);
  }
}

function initSite() {
  const destination = path.resolve(rest[0] ?? ".");
  const template = path.join(gardenPackageRoot, "templates", "site");
  if (!fs.existsSync(template)) fail("Garden 包里缺少 templates/site。");
  if (fs.existsSync(path.join(destination, "site.config.yaml"))) {
    fail(`目录已是 Garden 站点：${destination}`);
  }
  copyTemplate(template, destination);
  fs.mkdirSync(path.join(destination, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(gardenPackageRoot, "scripts", "new-post.mjs"),
    path.join(destination, "scripts", "new-post.mjs"),
  );
  process.stdout.write(`已创建站点：${destination}\n`);
  installSkill(destination);
  process.stdout.write("下一步：\n");
  process.stdout.write(`  cd ${destination}\n`);
  process.stdout.write("  npm install\n");
  process.stdout.write("  make new TITLE=\"你好，世界\" SLUG=hello\n");
  process.stdout.write("  make dev\n");
}

function packagedSkillRoot() {
  return path.join(
    gardenPackageRoot,
    ".agents",
    "skills",
    "garden-interactive-chart",
  );
}

function installSkill(destinationRoot = siteRoot) {
  const from = packagedSkillRoot();
  if (!fs.existsSync(path.join(from, "SKILL.md"))) {
    fail("Garden 包里缺少图表 skill。");
  }
  const to = path.join(destinationRoot, ".agents", "skills", "garden-interactive-chart");
  fs.cpSync(from, to, { recursive: true });
  const shown = path.relative(destinationRoot, to) || to;
  process.stdout.write(`已安装图表 skill：${shown}\n`);
}

function help() {
  process.stdout.write(`Garden 命令：
  garden dev              同步内容并本地预览
  garden build            同步内容并构建静态站点
  garden start            启动已构建的服务
  garden sync             只从 Markdown 生成索引
  garden new              创建文章草稿
  garden embed            拉取外链摘要
  garden init [目录]      创建只含稿和配置的新站点
  garden skill            把可交互图表 skill 装进当前站点
  garden pages:validate   检查 dist/client
  garden pages:prepare    写入公开产物仓库
  garden webmentions      发送 Webmentions
`);
}

switch (command) {
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  case "sync":
    sync();
    break;
  case "dev":
    runVinext(["dev", ...rest]);
    break;
  case "build":
    runVinext(["build", ...rest], { copyDist: true });
    break;
  case "start":
    runVinext(["start", ...rest]);
    break;
  case "new":
    runNode("scripts/new-post.mjs", rest);
    break;
  case "embed":
    runNode("scripts/fetch-embed.mjs", rest);
    break;
  case "init":
    initSite();
    break;
  case "skill":
  case "skills":
    installSkill();
    break;
  case "pages:validate":
    runNode("scripts/prepare-pages-output.mjs", [
      rest[0] ?? path.join(siteRoot, "dist", "client"),
    ]);
    break;
  case "pages:prepare":
    runNode("scripts/prepare-pages-output.mjs", rest);
    break;
  case "webmentions":
    runNode("scripts/send-webmentions.mjs", rest);
    break;
  default:
    fail(`未知命令：${command}`);
}
