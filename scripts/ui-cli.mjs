import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { applyBlock, ApplyError } from "../ui/core/apply.mjs";
import { catalogSchema } from "../ui/core/catalog.mjs";
import { buildFixPrompt } from "../ui/core/fix-prompt.mjs";
import { scanMarkdown } from "../ui/core/scan.mjs";
import { buildPrompt, RECIPE_FILES } from "../ui/prompt/build.mjs";
import { canonicalSiteDate } from "./site-date.mjs";
import { gardenPackageRoot, gardenSiteRoot } from "./garden-paths.mjs";

const siteRoot = gardenSiteRoot();
const [command, ...rest] = process.argv.slice(2);

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function flag(name) {
  return rest.includes(`--${name}`);
}

function option(name) {
  const index = rest.indexOf(`--${name}`);
  if (index < 0) return null;
  const value = rest[index + 1];
  if (!value || value.startsWith("--")) fail(`--${name} 需要一个值`);
  return value;
}

function positional() {
  const values = [];
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value.startsWith("--")) {
      if (["id", "at", "intent-hash", "base", "file", "out"].includes(value.slice(2))) index += 1;
      continue;
    }
    values.push(value);
  }
  return values;
}

const promptRoot = path.join(gardenPackageRoot, "ui", "prompt");

function promptText({ studio = false } = {}) {
  return buildPrompt({
    rules: fs.readFileSync(path.join(promptRoot, "rules.md"), "utf8"),
    recipes: RECIPE_FILES.map((file) => fs.readFileSync(path.join(promptRoot, "recipes", file), "utf8")),
    studio: studio ? fs.readFileSync(path.join(promptRoot, "studio.md"), "utf8") : null,
  });
}

const toPosix = (value) => value.split(path.sep).join("/");

function git(args, { input, allowFail = false } = {}) {
  const result = spawnSync("git", args, { cwd: siteRoot, encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    if (allowFail) return null;
    fail(`git ${args.join(" ")} 失败：${(result.stderr || "").trim()}`);
  }
  return result.stdout;
}

function isDraft(markdown) {
  try {
    const { data } = matter(markdown, { engines: { yaml: { parse: (input) => parseYaml(input) ?? {} } } });
    if (data.draft === true) return true;
    const publish = canonicalSiteDate(data.publishAt ?? data.date);
    return Boolean(publish) && Date.parse(publish) > Date.now();
  } catch {
    return false;
  }
}

function listContentFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return listContentFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

/** Files to check, each with a reader for itself and its same-name directory. */
function targets() {
  if (flag("staged")) {
    const top = git(["rev-parse", "--show-toplevel"]).trim();
    const names = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]).split("\0").filter(Boolean);
    return names
      .filter((name) => name.endsWith(".md"))
      .map((name) => ({ absolute: path.join(top, name), repoPath: name }))
      .filter((item) => toPosix(path.relative(siteRoot, item.absolute)).startsWith("content/"))
      .map((item) => ({
        file: toPosix(path.relative(siteRoot, item.absolute)),
        read: () => git(["show", `:${item.repoPath}`]),
        readSibling: (relative) => {
          const repoRelative = toPosix(path.join(path.dirname(item.repoPath), relative));
          return git(["show", `:${repoRelative}`], { allowFail: true }) ?? undefined;
        },
      }));
  }
  const files = flag("all") ? listContentFiles(path.join(siteRoot, "content")) : positional().map((file) => path.resolve(siteRoot, file));
  return files.map((absolute) => ({
    file: toPosix(path.relative(siteRoot, absolute)),
    read: () => {
      if (!fs.existsSync(absolute)) fail(`找不到文件 ${absolute}`);
      return fs.readFileSync(absolute, "utf8");
    },
    readSibling: (relative) => {
      const target = path.resolve(path.dirname(absolute), relative);
      return fs.existsSync(target) && fs.statSync(target).isFile() ? fs.readFileSync(target, "utf8") : undefined;
    },
  }));
}

function scanTarget(target) {
  const markdown = target.read();
  const blocks = scanMarkdown(markdown, { markdownPath: target.file, readData: target.readSibling });
  return { markdown, blocks, draft: isDraft(markdown) };
}

function copyToClipboard(text) {
  const candidates = process.platform === "darwin"
    ? [["pbcopy", []]]
    : process.platform === "win32"
      ? [["clip", []]]
      : [["wl-copy", []], ["xclip", ["-selection", "clipboard"]], ["xsel", ["--clipboard", "--input"]]];
  for (const [binary, args] of candidates) {
    const result = spawnSync(binary, args, { input: text });
    if (result.status === 0) return true;
  }
  return false;
}

function commandScan() {
  const files = targets();
  if (!files.length) fail("用法：garden ui scan content/posts/文章.md");
  const output = files.map((target) => {
    const { blocks, draft } = scanTarget(target);
    return {
      file: target.file,
      draft,
      blocks: blocks.map((block) => Object.fromEntries(Object.entries(block).filter(([key]) => key !== "raw"))),
    };
  });
  process.stdout.write(`${JSON.stringify(output.length === 1 ? output[0] : output, null, 2)}\n`);
}

function commandCheck() {
  const files = targets();
  if (!files.length) {
    if (flag("staged")) process.exit(0);
    fail("用法：garden ui check content/posts/文章.md [--staged] [--all] [--standalone]");
  }
  const problems = [];
  const warnings = [];
  for (const target of files) {
    const { blocks, draft } = scanTarget(target);
    for (const block of blocks) {
      const errors = block.diagnostics.filter((item) => item.severity === "error");
      for (const item of block.diagnostics.filter((entry) => entry.severity === "warning")) {
        warnings.push(`${target.file}:${item.line}  ${block.id ?? "-"}  ${item.code}  ${item.message}`);
      }
      if ((block.lang === "intent" || block.lang === "garden-idea") && !draft) problems.push({ file: target.file, block, diagnostics: [] });
      else if (errors.length) problems.push({ file: target.file, block, diagnostics: errors });
    }
  }
  for (const line of warnings) process.stderr.write(`提醒  ${line}\n`);
  if (!problems.length) {
    if (!flag("quiet")) process.stdout.write(`检查通过（${files.length} 个文件）\n`);
    return;
  }
  for (const problem of problems) {
    if (problem.block.lang === "intent") {
      process.stderr.write(`${problem.file}:${problem.block.startLine}  ${problem.block.id ?? "-"}  intent-uncompiled  还有没编译的 intent 块\n`);
    }
    if (problem.block.lang === "garden-idea") {
      process.stderr.write(`${problem.file}:${problem.block.startLine}  -  garden-idea  还有没编译的想法\n`);
    }
    for (const item of problem.diagnostics) {
      process.stderr.write(`${problem.file}:${item.line}  ${problem.block.id ?? "-"}  ${item.code}  ${item.message}\n`);
    }
  }
  const prompt = buildFixPrompt(problems, { standaloneReference: flag("standalone") ? promptText() : null });
  const separator = "─".repeat(24);
  process.stderr.write(`\n${separator} 发给 AI 的修复提示词 ${separator}\n${prompt}${separator}${separator}${"─".repeat(12)}\n`);
  const promptFile = path.join(siteRoot, ".garden", "ui-fix-prompt.md");
  fs.mkdirSync(path.dirname(promptFile), { recursive: true });
  fs.writeFileSync(promptFile, prompt);
  const copied = !flag("no-copy") && process.env.GARDEN_UI_NO_COPY !== "1" && copyToClipboard(prompt);
  process.stderr.write(`已写入 ${toPosix(path.relative(siteRoot, promptFile))}${copied ? "，并已复制到剪贴板" : ""}。确实要先提交，可以用 git commit --no-verify。\n`);
  process.exit(1);
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function commandApply() {
  const [file] = positional();
  if (!file) fail("用法：garden ui apply content/posts/文章.md --id <id> [--base <哈希>] [--file 新内容.md]");
  const absolute = path.resolve(siteRoot, file);
  if (!fs.existsSync(absolute)) fail(`找不到文件 ${file}`);
  const source = option("file");
  const replacement = source ? fs.readFileSync(path.resolve(process.cwd(), source), "utf8") : readStdin();
  if (!replacement.trim()) fail("没有拿到新内容：用 --file 指定，或从标准输入传入");
  const target = { id: option("id"), at: option("at"), intentHash: option("intent-hash") };
  try {
    const markdown = fs.readFileSync(absolute, "utf8");
    const result = applyBlock(markdown, target, replacement, {
      base: option("base"),
      markdownPath: toPosix(path.relative(siteRoot, absolute)),
      readData: (relative) => {
        const sibling = path.resolve(path.dirname(absolute), relative);
        return fs.existsSync(sibling) ? fs.readFileSync(sibling, "utf8") : undefined;
      },
    });
    fs.writeFileSync(absolute, result.markdown);
    process.stdout.write(`${JSON.stringify({ ok: true, file: toPosix(path.relative(siteRoot, absolute)), kind: result.kind, line: result.block.startLine })}\n`);
  } catch (error) {
    if (!(error instanceof ApplyError)) throw error;
    process.stderr.write(`${JSON.stringify({ ok: false, code: error.code, message: error.message, diagnostics: error.diagnostics }, null, 2)}\n`);
    process.exit(1);
  }
}

function openPath(target) {
  const opener = process.platform === "darwin" ? ["open", [target]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", target]] : ["xdg-open", [target]];
  spawnSync(opener[0], opener[1], { stdio: "ignore" });
}

function commandCatalog() {
  const dist = path.join(gardenPackageRoot, "ui", "preview", "dist");
  const script = path.join(dist, "garden-ui.iife.js");
  const style = path.join(dist, "garden-ui.css");
  if (!fs.existsSync(script) || !fs.existsSync(style)) {
    fail("缺少编辑器预览包。在引擎仓库运行 npm run ui:build 后再试。");
  }
  const recipes = RECIPE_FILES.map((file) => ({ file, markdown: fs.readFileSync(path.join(promptRoot, "recipes", file), "utf8") }));
  const json = JSON.stringify(recipes).replaceAll("<", "\\u003c");
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Garden 组件清单</title>
<style>body{margin:0;background:#f8f8f6;color:#202124}main{max-width:760px;margin:0 auto;padding:32px 20px 80px}@media (prefers-color-scheme: dark){body{background:#171819;color:#ededeb}}</style>
<style>${fs.readFileSync(style, "utf8")}</style>
</head>
<body>
<main id="catalog"></main>
<script>${fs.readFileSync(script, "utf8").replaceAll("</script", "<\\/script")}</script>
<script>
const root = document.getElementById("catalog");
if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");
GardenUI.renderCatalog(root, { recipes: ${json} });
</script>
</body>
</html>
`;
  const out = path.resolve(siteRoot, option("out") ?? path.join(".garden", "ui-catalog.html"));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  process.stdout.write(`组件清单已生成：${toPosix(path.relative(siteRoot, out))}\n`);
  if (!flag("no-open")) openPath(out);
}

switch (command) {
  case "scan":
    commandScan();
    break;
  case "check":
    commandCheck();
    break;
  case "apply":
    commandApply();
    break;
  case "prompt":
    process.stdout.write(promptText({ studio: flag("studio") }));
    break;
  case "schema":
    process.stdout.write(`${JSON.stringify(catalogSchema(), null, 2)}\n`);
    break;
  case "catalog":
    commandCatalog();
    break;
  default:
    fail(`用法：garden ui <scan|check|apply|prompt|schema|catalog>

  garden ui scan <稿件.md>                 列出块、状态、行号和哈希（JSON）
  garden ui check <稿件.md>... | --staged | --all [--standalone]
                                           检查 garden 想法和 garden interactive（以及旧的 ui / intent 块），失败时给出修复提示词
  garden ui apply <稿件.md> --id <id> [--base <哈希>] [--file 新内容.md]
                                           只替换一块，围栏外逐字节不变
  garden ui prompt [--studio]              打印写作规则、组件参考和配方
  garden ui schema                         打印组件目录 JSON
  garden ui catalog [--out 文件] [--no-open] 生成离线组件清单并打开`);
}
