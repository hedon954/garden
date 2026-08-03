import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const forbiddenDirectoryNames = new Set([
  ".git",
  ".github",
  "app",
  "content",
  "node_modules",
  "scripts",
  "tests",
]);
const forbiddenFileNames = new Set([
  "Makefile",
  "eslint.config.mjs",
  "site.config.yaml",
  "tsconfig.json",
  "vinext.config.ts",
  "wrangler.jsonc",
]);
const forbiddenExtensions = new Set([".map", ".md", ".ts", ".tsx"]);
const deploymentVersionPlaceholder = "00000000-0000-4000-8000-000000000000";

function fail(message) {
  throw new Error(`Pages 产物无效：${message}`);
}

async function assertDirectory(directory, label) {
  let stat;
  try {
    stat = await fs.stat(directory);
  } catch {
    fail(`${label}不存在：${directory}`);
  }
  if (!stat.isDirectory()) fail(`${label}不是目录：${directory}`);
}

async function inspectTree(root, directory = root) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    const stat = await fs.lstat(absolutePath);

    if (stat.isSymbolicLink()) fail(`不允许软链接：${relativePath}`);
    if (forbiddenDirectoryNames.has(entry.name)) {
      fail(`不允许源码目录：${relativePath}`);
    }
    if (entry.name.startsWith(".env")) fail(`不允许环境文件：${relativePath}`);
    if (/^package(?:-lock)?\.json$/u.test(entry.name)) {
      fail(`不允许依赖清单：${relativePath}`);
    }
    if (forbiddenFileNames.has(entry.name)) {
      fail(`不允许源码配置：${relativePath}`);
    }
    if (entry.isFile() && forbiddenExtensions.has(path.extname(entry.name))) {
      fail(`不允许源码或 Source Map：${relativePath}`);
    }
    if (entry.isDirectory()) await inspectTree(root, absolutePath);
  }
}

function normalizeDeploymentVersion(content, replacement) {
  return content
    .replace(
      /("deploymentVersion":")[^"]+(")/gu,
      `$1${replacement}$2`,
    )
    .replace(
      /(\\["]deploymentVersion\\["]:\\["])[^"\\]+(\\["])/gu,
      `$1${replacement}$2`,
    );
}

async function listFiles(root, directory = root) {
  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, absolutePath));
    } else {
      files.push({
        absolutePath,
        relativePath: path.relative(root, absolutePath).split(path.sep).join("/"),
      });
    }
  }
  return files;
}

async function stabilizeDeploymentVersion(root) {
  const hash = crypto.createHash("sha256");
  const normalizedFiles = new Map();

  for (const file of await listFiles(root)) {
    const original = await fs.readFile(file.absolutePath);
    let normalized = original;
    if ([".html", ".rsc"].includes(path.extname(file.relativePath))) {
      const text = original.toString("utf8");
      normalized = Buffer.from(
        normalizeDeploymentVersion(text, deploymentVersionPlaceholder),
        "utf8",
      );
      normalizedFiles.set(file.absolutePath, normalized);
    }
    hash.update(file.relativePath);
    hash.update("\0");
    hash.update(normalized);
    hash.update("\0");
  }

  const digest = hash.digest("hex");
  const version = [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `8${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");

  for (const [filePath, content] of normalizedFiles) {
    const stabilized = normalizeDeploymentVersion(content.toString("utf8"), version);
    await fs.writeFile(filePath, stabilized);
  }
}

export async function validateStaticOutput(sourceDirectory) {
  const source = path.resolve(sourceDirectory);
  await assertDirectory(source, "静态产物目录");
  await fs.access(path.join(source, "index.html")).catch(() => {
    fail(`缺少入口文件：${path.join(source, "index.html")}`);
  });
  await inspectTree(source);
  return source;
}

export async function preparePagesOutput(sourceDirectory, destinationDirectory) {
  const source = await validateStaticOutput(sourceDirectory);
  const destination = path.resolve(destinationDirectory);
  await assertDirectory(destination, "Pages 仓库目录");
  await fs.access(path.join(destination, ".git")).catch(() => {
    fail(`目标不是 Git 仓库：${destination}`);
  });

  const relativeFromDestination = path.relative(destination, source);
  if (!relativeFromDestination.startsWith("..") && !path.isAbsolute(relativeFromDestination)) {
    fail("静态产物目录不能位于目标仓库内部");
  }

  for (const entry of await fs.readdir(destination, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    await fs.rm(path.join(destination, entry.name), { recursive: true, force: true });
  }

  await fs.cp(source, destination, { recursive: true, force: true });
  await fs.writeFile(path.join(destination, ".nojekyll"), "");
  await fs.writeFile(
    path.join(destination, "README.md"),
    "# Garden 静态站点\n\n此仓库只保存 Garden 自动生成的公开静态文件，请勿手工编辑。\n",
  );
  await stabilizeDeploymentVersion(destination);
}

const invokedDirectly = process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const [, , sourceDirectory, destinationDirectory] = process.argv;
  if (!sourceDirectory || process.argv.length > 4) {
    throw new Error("用法：node scripts/prepare-pages-output.mjs <静态产物目录> [Pages 仓库目录]");
  }
  if (destinationDirectory) {
    await preparePagesOutput(sourceDirectory, destinationDirectory);
  } else {
    await validateStaticOutput(sourceDirectory);
  }
}
