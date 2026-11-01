import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { gardenPackageRoot } from "./garden-paths.mjs";

export const TYPORA_PLUGIN_ID = "hedon954.garden-intelligent-ui";
const OFFERED_MARKER = ".install-offered";
const TYPORA_FRAMEWORK_URL =
  "https://github.com/typora-community-plugin/typora-community-plugin/blob/main/docs/en-us/user-guide/1a-installation.md";

const text = {
  zh: {
    askVscode: "安装 VS Code / Cursor 的 Garden Intelligent UI 插件？ [y/N] ",
    askTypora: "安装 Typora 的 Garden Intelligent UI 插件？ [y/N] ",
    hints: `编辑器插件已复制到 .garden/editors/（VS Code / Cursor 的 VSIX，以及 Typora 插件）。
这次没有交互安装：当前不是可交互终端，或 CI=1，或设置了 GARDEN_SKIP_EDITORS=1。
安装到本机编辑器：
  npx garden editors install
只装其中一个，或在脚本里直接装：
  npx garden editors install --vscode
  npx garden editors install --typora
  npx garden editors install --yes
`,
    missing: "没有找到已打包的编辑器插件（editors/dist）。在 Garden 引擎仓库运行 npm run editors:pack 后再安装。\n",
    declined: "没有安装编辑器插件。之后可以运行 npx garden editors install。\n",
    installedCli: (editor, file) => `已用 ${editor} 安装扩展：${file}\n`,
    cliFailed: (editor, file) => `${editor} --install-extension 失败。可改为手动安装：${file}\n`,
    manual: (file) => `没有找到 code 或 cursor 命令。请手动从 VSIX 安装：
  1. 打开 VS Code 或 Cursor。
  2. 打开扩展视图，点右上角「…」，选择 Install from VSIX（从 VSIX 安装）。
  3. 选这个文件：
     ${file}
`,
    noVsix: "没有找到 VSIX。先运行 npm run editors:pack，或确认站点 .garden/editors/vscode/ 里有 .vsix 文件。\n",
    noTypora: "没有找到 Typora 插件产物（manifest.json、main.js、style.css）。\n",
    typoraCopied: (dir) => `已把 Typora 插件复制到：
  ${dir}
`,
    typoraMissingFramework: `没有在常见位置检测到 typora-community-plugin。Typora 没有官方插件接口；若还没装，请先安装这个社区框架：
  ${TYPORA_FRAMEWORK_URL}
`,
    typoraEnable: "打开 Typora，在「设置 → 已安装插件」里勾选 Garden Intelligent UI。\n",
    typoraUpgrade:
      "升级 Typora 会覆盖社区框架改过的程序文件。升级后需要重新安装 typora-community-plugin，再勾选本插件。稿件里的围栏原文还在。\n",
  },
  en: {
    askVscode: "Install the Garden Intelligent UI extension for VS Code / Cursor? [y/N] ",
    askTypora: "Install the Garden Intelligent UI plugin for Typora? [y/N] ",
    hints: `Editor plugins are in .garden/editors/ (a VSIX for VS Code / Cursor, and the Typora plugin).
This run did not ask for an install: there is no interactive terminal, or CI=1, or GARDEN_SKIP_EDITORS=1 is set.
Install them into your editors with:
  npx garden editors install
Install one of them, or install from a script:
  npx garden editors install --vscode
  npx garden editors install --typora
  npx garden editors install --yes
`,
    missing: "Packaged editor plugins were not found (editors/dist). From the Garden engine repository, run npm run editors:pack, then install.\n",
    declined: "Editor plugins were not installed. Run npx garden editors install when you want them.\n",
    installedCli: (editor, file) => `Installed the extension with ${editor}: ${file}\n`,
    cliFailed: (editor, file) => `${editor} --install-extension failed. Install the VSIX manually: ${file}\n`,
    manual: (file) => `No code or cursor command was found. Install from VSIX instead:
  1. Open VS Code or Cursor.
  2. Open the Extensions view, choose the ... menu, then Install from VSIX.
  3. Select this file:
     ${file}
`,
    noVsix: "No VSIX was found. Run npm run editors:pack, or check .garden/editors/vscode/ for a .vsix file.\n",
    noTypora: "Typora plugin files were not found (manifest.json, main.js, style.css).\n",
    typoraCopied: (dir) => `Copied the Typora plugin to:
  ${dir}
`,
    typoraMissingFramework: `typora-community-plugin was not found in the usual locations. Typora has no official plugin API; install that community framework if it is not already installed:
  ${TYPORA_FRAMEWORK_URL}
`,
    typoraEnable: "Open Typora, then enable Garden Intelligent UI under Settings -> Installed plugins.\n",
    typoraUpgrade:
      "A Typora upgrade overwrites the community framework inside the app. Reinstall typora-community-plugin after upgrading, then enable this plugin again. The fences in your posts stay in the Markdown.\n",
  },
};

function strings(lang) {
  return text[lang === "en" ? "en" : "zh"];
}

function write(message) {
  stdout.write(message.endsWith("\n") ? message : `${message}\n`);
}

/** Automatic init/sync prompts only. An explicit `garden editors install` ignores this. */
export function editorsPromptAllowed() {
  if (process.env.GARDEN_SKIP_EDITORS === "1") return false;
  if (process.env.CI === "1" || process.env.CI === "true") return false;
  return Boolean(stdin.isTTY && stdout.isTTY);
}

function editorDist() {
  return path.join(gardenPackageRoot, "editors", "dist");
}

function siteEditors(siteRoot) {
  return path.join(siteRoot, ".garden", "editors");
}

function offeredMarker(siteRoot) {
  return path.join(siteEditors(siteRoot), OFFERED_MARKER);
}

function markOffered(siteRoot) {
  const marker = offeredMarker(siteRoot);
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  if (!fs.existsSync(marker)) fs.writeFileSync(marker, "offered\n");
}

export function copyEditorArtifacts(siteRoot) {
  const from = editorDist();
  const groups = ["vscode", "typora"].filter((name) => fs.existsSync(path.join(from, name)));
  if (!groups.length) return false;
  const to = siteEditors(siteRoot);
  fs.mkdirSync(to, { recursive: true });
  for (const name of groups) {
    const dest = path.join(to, name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(from, name), dest, { recursive: true });
  }
  return true;
}

function samePackageSite(siteRoot) {
  return path.resolve(siteRoot) === path.resolve(gardenPackageRoot);
}

function firstVsix(directory) {
  if (!fs.existsSync(directory)) return null;
  const names = fs.readdirSync(directory).filter((name) => name.endsWith(".vsix")).sort();
  if (!names.length) return null;
  return path.join(directory, names[names.length - 1]);
}

function locateVsix(siteRoot) {
  return firstVsix(path.join(siteEditors(siteRoot), "vscode")) ?? firstVsix(path.join(editorDist(), "vscode"));
}

function locateTyporaSource(siteRoot) {
  const candidates = [path.join(siteEditors(siteRoot), "typora"), path.join(editorDist(), "typora")];
  for (const directory of candidates) {
    if (["manifest.json", "main.js", "style.css"].every((name) => fs.existsSync(path.join(directory, name)))) {
      return directory;
    }
  }
  return null;
}

function commandPath(name) {
  const entries = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const suffixes = process.platform === "win32" ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";") : [""];
  for (const directory of entries) {
    for (const suffix of suffixes) {
      const candidate = path.join(directory, suffix ? `${name}${suffix}` : name);
      try {
        const stat = fs.statSync(candidate);
        if (!stat.isFile()) continue;
        if (process.platform !== "win32" && (stat.mode & 0o111) === 0) continue;
        return candidate;
      } catch {
        // Try the next PATH entry.
      }
    }
  }
  return null;
}

function editorClis() {
  const found = [];
  for (const name of ["cursor", "code"]) {
    const bin = commandPath(name);
    if (bin) found.push({ name, bin });
  }
  return found;
}

async function confirm(question) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(question)).trim().toLowerCase();
    return answer === "y" || answer === "yes" || answer === "是";
  } catch {
    return false;
  } finally {
    rl.close();
  }
}

function installVsix(siteRoot, lang) {
  const copy = strings(lang);
  const vsix = locateVsix(siteRoot);
  if (!vsix) {
    write(copy.noVsix);
    return false;
  }
  const clis = editorClis();
  if (!clis.length) {
    write(copy.manual(vsix));
    return true;
  }
  let ok = true;
  for (const cli of clis) {
    write(`${cli.name} --install-extension ${vsix}`);
    const result = spawnSync(cli.bin, ["--install-extension", vsix], { stdio: "inherit" });
    if (result.status === 0) write(copy.installedCli(cli.name, vsix));
    else {
      ok = false;
      write(copy.cliFailed(cli.name, vsix));
    }
  }
  return ok;
}

function fileHas(file, needle) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024) return false;
    return fs.readFileSync(file, "utf8").includes(needle);
  } catch {
    return false;
  }
}

function typoraFrameworkFound(home) {
  if (fs.existsSync(path.join(home, ".typora", "community-plugins"))) return true;
  const apps = [];
  if (process.platform === "darwin") {
    apps.push(
      "/Applications/Typora.app/Contents/Resources/TypeMark/index.html",
      "/Applications/Typora.app/Contents/Resources/app/index.html",
      path.join(home, "Applications/Typora.app/Contents/Resources/TypeMark/index.html"),
    );
  } else if (process.platform === "win32") {
    for (const base of [process.env.LOCALAPPDATA, process.env.ProgramFiles, process.env["ProgramFiles(x86)"]]) {
      if (!base) continue;
      apps.push(
        path.join(base, "Typora", "resources", "TypeMark", "index.html"),
        path.join(base, "Programs", "Typora", "resources", "TypeMark", "index.html"),
      );
    }
  } else {
    apps.push(
      "/usr/share/typora/resources/TypeMark/index.html",
      "/usr/lib/typora/resources/TypeMark/index.html",
      "/opt/Typora/resources/TypeMark/index.html",
    );
  }
  return apps.some((file) => fileHas(file, "typora-community-plugin"));
}

function typoraDestination(home) {
  return path.join(home, ".typora", "community-plugins", "plugins", TYPORA_PLUGIN_ID);
}

function installTypora(siteRoot, lang) {
  const copy = strings(lang);
  const source = locateTyporaSource(siteRoot);
  if (!source) {
    write(copy.noTypora);
    return false;
  }
  const home = os.homedir();
  // Check before copy: copying the plugin creates ~/.typora/community-plugins.
  const framework = typoraFrameworkFound(home);
  const destination = typoraDestination(home);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
  if (!framework) write(copy.typoraMissingFramework);
  write(copy.typoraCopied(destination));
  write(copy.typoraEnable);
  write(copy.typoraUpgrade);
  return true;
}

async function installChosen(siteRoot, lang, { vscode, typora }) {
  let ok = true;
  if (vscode) ok = installVsix(siteRoot, lang) && ok;
  if (typora) ok = installTypora(siteRoot, lang) && ok;
  return ok;
}

/** Copies artifacts, then asks once. Later syncs only refresh the files. */
export async function offerEditorsOnce(siteRoot, lang) {
  if (fs.existsSync(offeredMarker(siteRoot))) {
    copyEditorArtifacts(siteRoot);
    return;
  }
  const copied = copyEditorArtifacts(siteRoot);
  if (!copied) {
    if (!samePackageSite(siteRoot)) write(strings(lang).missing);
    return;
  }
  const copy = strings(lang);
  if (!editorsPromptAllowed()) {
    write(copy.hints);
    markOffered(siteRoot);
    return;
  }
  const vscode = await confirm(copy.askVscode);
  const typora = await confirm(copy.askTypora);
  if (vscode || typora) await installChosen(siteRoot, lang, { vscode, typora });
  else write(copy.declined);
  markOffered(siteRoot);
}

/**
 * `garden editors install`. Flags are explicit consent. With no flags, a TTY
 * asks separately; otherwise this prints the same hint as init/sync and returns.
 */
export async function editorsInstall(siteRoot, lang, flags) {
  const explicit = flags.vscode || flags.typora;
  const copied = copyEditorArtifacts(siteRoot);
  const copy = strings(lang);
  if (!explicit && !flags.yes && !editorsPromptAllowed()) {
    write(copied ? copy.hints : copy.missing);
    return 0;
  }
  let vscode = explicit ? flags.vscode : true;
  let typora = explicit ? flags.typora : true;
  if (!explicit && !flags.yes) {
    vscode = await confirm(copy.askVscode);
    typora = await confirm(copy.askTypora);
  }
  if (!vscode && !typora) {
    write(copy.declined);
    markOffered(siteRoot);
    return 0;
  }
  if (!copied) {
    write(copy.missing);
    return 1;
  }
  const ok = await installChosen(siteRoot, lang, { vscode, typora });
  markOffered(siteRoot);
  return ok ? 0 : 1;
}
