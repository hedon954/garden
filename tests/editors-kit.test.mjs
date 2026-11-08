import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { typoraPluginDirs } from "../scripts/editors-kit.mjs";
import { packEditors } from "../scripts/pack-editors.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const garden = path.join(root, "bin/garden.mjs");
const CJK_OR_FULLWIDTH_RE = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/u;

await packEditors();

function writeStub(dir, name) {
  const file = path.join(dir, name);
  writeFileSync(file, "#!/bin/sh\nprintf '%s %s\\n' \"$0\" \"$*\" >> \"$EDITOR_INSTALL_LOG\"\n", { mode: 0o755 });
  return file;
}

function runGarden(args, { cwd, env, timeout = 20_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [garden, ...args], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`garden ${args.join(" ")} kept stdin open past ${timeout}ms\n${Buffer.concat(stdout).toString("utf8")}`));
    }, timeout);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

function siteEnv(parent, extra = {}) {
  const bin = path.join(parent, "bin");
  mkdirSync(bin, { recursive: true });
  return {
    env: {
      ...process.env,
      HOME: parent,
      USERPROFILE: parent,
      PATH: bin,
      EDITOR_INSTALL_LOG: path.join(parent, "install.log"),
      CI: "",
      GARDEN_SKIP_EDITORS: "",
      ...extra,
    },
    bin,
    log: path.join(parent, "install.log"),
  };
}

test("macOS Typora install includes the Application Support plugin directory", () => {
  const dirs = typoraPluginDirs("/Users/demo", "darwin");
  assert.deepEqual(dirs, [
    "/Users/demo/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui",
    "/Users/demo/Library/Application Support/abnerworks.Typora/plugins/plugins/hedon954.garden-intelligent-ui",
  ]);
  assert.deepEqual(typoraPluginDirs("/home/demo", "linux"), [
    "/home/demo/.typora/community-plugins/plugins/hedon954.garden-intelligent-ui",
  ]);
});

test("package files publish editor artifacts without plugin sources", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(manifest.files.includes("editors/dist"));
  assert.equal(manifest.files.includes("editors"), false);
  assert.equal(manifest.files.some((entry) => entry.startsWith("editors/vscode") || entry.startsWith("editors/typora") || entry.startsWith("editors/obsidian")), false);
  assert.equal(manifest.scripts["editors:pack"], "node scripts/pack-editors.mjs");
  assert.match(manifest.scripts.prepack, /pack-editors\.mjs/u);
  const vsixDir = path.join(root, "editors/dist/vscode");
  const name = execFileSync("/usr/bin/python3", ["-c", "import os,sys; print(next(n for n in os.listdir(sys.argv[1]) if n.endswith('.vsix')))", vsixDir], { encoding: "utf8" }).trim();
  const listed = execFileSync("/usr/bin/python3", ["-c", `
import sys, zipfile, json, struct, hashlib
archive = zipfile.ZipFile(sys.argv[1])
names = archive.namelist()
manifest = json.loads(archive.read("extension/package.json"))
version = json.load(open(sys.argv[2]))["version"]
assert manifest["version"] == version
assert manifest["icon"] == "dist/icon.png"
icon = archive.read("extension/" + manifest["icon"])
assert icon[:8] == bytes.fromhex("89504e470d0a1a0a")
assert all(size >= 128 for size in struct.unpack(">II", icon[16:24]))
assert icon == open(sys.argv[3], "rb").read()
assert 'Microsoft.VisualStudio.Services.Icons.Default' in archive.read("extension.vsixmanifest").decode()
assert ('Version="' + version + '"') in archive.read("extension.vsixmanifest").decode()
assert sys.argv[1].endswith("garden-ui-" + version + ".vsix")
need = ["extension/package.json", "extension.vsixmanifest", "[Content_Types].xml"]
missing = [item for item in need if item not in names]
if missing or not any(item.startswith("extension/dist/") for item in names):
    raise SystemExit("bad vsix: " + ",".join(missing or ["extension/dist"]))
`, path.join(vsixDir, name), path.join(root, "package.json"), path.join(root, "public/apple-touch-icon.png")], { encoding: "utf8" });
  assert.equal(listed, "");
});

test("garden help lists editors install", () => {
  const stdout = execFileSync(process.execPath, [garden, "help"], { encoding: "utf8" });
  assert.match(stdout, /garden editors install/u);
  assert.match(stdout, /--vscode/u);
  assert.match(stdout, /--typora/u);
  assert.match(stdout, /--yes/u);
});

test("non-TTY init copies editor artifacts, prints the install hint, and does not install", async () => {
  for (const extra of [{}, { CI: "1" }, { GARDEN_SKIP_EDITORS: "1" }]) {
    const parent = mkdtempSync(path.join(tmpdir(), "garden-editors-"));
    const site = path.join(parent, "blog");
    const { env, bin, log } = siteEnv(parent, extra);
    writeStub(bin, "code");
    writeStub(bin, "cursor");
    try {
      const result = await runGarden(["init", site], { cwd: parent, env });
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /npx garden editors install/u);
      assert.match(result.stdout, /GARDEN_SKIP_EDITORS=1/u);
      assert.equal(existsSync(log), false);
      assert.equal(existsSync(path.join(parent, ".typora")), false);
      const manifest = JSON.parse(readFileSync(path.join(site, ".garden/editors/typora/manifest.json"), "utf8"));
      assert.equal(manifest.id, "hedon954.garden-intelligent-ui");
      assert.ok(existsSync(path.join(site, ".garden/editors/typora/main.js")));
      assert.ok(existsSync(path.join(site, ".garden/editors/typora/style.css")));
      const vsix = path.join(site, ".garden/editors/vscode");
      assert.ok(existsSync(vsix));
      assert.equal(readFileSync(path.join(site, ".garden/editors/.install-offered"), "utf8"), "offered\n");
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  }
});

test("English init hints contain no CJK", async () => {
  const parent = mkdtempSync(path.join(tmpdir(), "garden-editors-en-"));
  const site = path.join(parent, "blog");
  const { env } = siteEnv(parent);
  try {
    const result = await runGarden(["init", site, "--locale", "en"], { cwd: parent, env });
    assert.equal(result.code, 0, result.stderr);
    assert.doesNotMatch(result.stdout, CJK_OR_FULLWIDTH_RE, result.stdout);
    assert.match(result.stdout, /Install from VSIX|npx garden editors install/u);
    assert.equal(existsSync(path.join(parent, ".typora")), false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("first sync prints the editor hint once and does not hang", async () => {
  const parent = mkdtempSync(path.join(tmpdir(), "garden-editors-sync-"));
  const site = path.join(parent, "blog");
  const { env, bin, log } = siteEnv(parent);
  writeStub(bin, "code");
  try {
    const created = await runGarden(["init", site], { cwd: parent, env });
    assert.equal(created.code, 0, created.stderr);
    rmSync(path.join(site, ".garden/editors/.install-offered"));
    const first = await runGarden(["sync"], { cwd: site, env, timeout: 180_000 });
    assert.equal(first.code, 0, first.stderr);
    assert.match(first.stdout, /npx garden editors install/u);
    assert.equal(existsSync(log), false);
    assert.equal(readFileSync(path.join(site, ".garden/editors/.install-offered"), "utf8"), "offered\n");
    const second = await runGarden(["sync"], { cwd: site, env, timeout: 180_000 });
    assert.equal(second.code, 0, second.stderr);
    assert.doesNotMatch(second.stdout, /npx garden editors install/u);
    assert.equal(existsSync(log), false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("garden editors install --yes installs the VSIX and Typora plugin under a fake home", () => {
  const parent = mkdtempSync(path.join(tmpdir(), "garden-editors-yes-"));
  const site = path.join(parent, "blog");
  const { env, bin, log } = siteEnv(parent, { GARDEN_SKIP_EDITORS: "1", CI: "1" });
  writeStub(bin, "code");
  writeStub(bin, "cursor");
  try {
    execFileSync(process.execPath, [garden, "init", site], { cwd: parent, env, encoding: "utf8" });
    const plugin = path.join(parent, ".typora/community-plugins/plugins/hedon954.garden-intelligent-ui");
    assert.equal(existsSync(plugin), false);
    const stdout = execFileSync(process.execPath, [garden, "editors", "install", "--yes"], {
      cwd: site,
      env,
      encoding: "utf8",
    });
    assert.match(stdout, /typora-community-plugin/u);
    assert.match(stdout, /https:\/\/github.com\/typora-community-plugin\/typora-community-plugin/u);
    assert.match(stdout, /升级 Typora/u);
    assert.match(stdout, /已安装插件/u);
    const installed = readFileSync(log, "utf8");
    assert.match(installed, /code --install-extension /u);
    assert.match(installed, /cursor --install-extension /u);
    assert.match(installed, /\.vsix/u);
    const manifest = JSON.parse(readFileSync(path.join(plugin, "manifest.json"), "utf8"));
    assert.equal(manifest.id, "hedon954.garden-intelligent-ui");
    assert.ok(existsSync(path.join(plugin, "main.js")));
    assert.ok(existsSync(path.join(plugin, "style.css")));
    execFileSync(process.execPath, [garden, "editors", "install", "--yes"], { cwd: site, env, encoding: "utf8" });
    assert.equal(JSON.parse(readFileSync(path.join(plugin, "manifest.json"), "utf8")).id, manifest.id);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("editors install flags select one editor, and a missing CLI prints Install from VSIX", () => {
  const parent = mkdtempSync(path.join(tmpdir(), "garden-editors-flags-"));
  const site = path.join(parent, "blog");
  const cursorOnly = siteEnv(parent);
  writeStub(cursorOnly.bin, "cursor");
  const empty = mkdtempSync(path.join(tmpdir(), "garden-editors-empty-"));
  try {
    execFileSync(process.execPath, [garden, "init", site], { cwd: parent, env: cursorOnly.env, encoding: "utf8" });
    const typoraOut = execFileSync(process.execPath, [garden, "editors", "install", "--typora"], {
      cwd: site,
      env: cursorOnly.env,
      encoding: "utf8",
    });
    assert.match(typoraOut, /hedon954\.garden-intelligent-ui/u);
    assert.equal(existsSync(cursorOnly.log), false);
    const cursorOut = execFileSync(process.execPath, [garden, "editors", "install", "--vscode"], {
      cwd: site,
      env: cursorOnly.env,
      encoding: "utf8",
    });
    assert.match(readFileSync(cursorOnly.log, "utf8"), /cursor --install-extension /u);
    assert.doesNotMatch(readFileSync(cursorOnly.log, "utf8"), /\bcode --install-extension/u);
    assert.match(cursorOut, /cursor --install-extension /u);

    const manualEnv = siteEnv(empty, { PATH: empty });
    const manual = execFileSync(process.execPath, [garden, "editors", "install", "--vscode", "--yes"], {
      cwd: site,
      env: manualEnv.env,
      encoding: "utf8",
    });
    assert.match(manual, /Install from VSIX/u);
    assert.match(manual, /\.vsix/u);
    assert.equal(existsSync(path.join(empty, ".typora")), false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  }
});

test("editors install without flags does not hang when stdin stays open", async () => {
  const parent = mkdtempSync(path.join(tmpdir(), "garden-editors-open-"));
  const site = path.join(parent, "blog");
  const { env, bin, log } = siteEnv(parent);
  writeStub(bin, "code");
  try {
    execFileSync(process.execPath, [garden, "init", site], { cwd: parent, env, encoding: "utf8" });
    const result = await runGarden(["editors", "install"], { cwd: site, env });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /npx garden editors install/u);
    assert.equal(existsSync(log), false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("unknown editors options fail", () => {
  const result = spawn(process.execPath, [garden, "editors", "install", "--nope"], { stdio: ["ignore", "pipe", "pipe"] });
  return new Promise((resolve, reject) => {
    let stderr = "";
    result.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    result.on("exit", (code) => {
      try {
        assert.equal(code, 1);
        assert.match(stderr, /--nope/u);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
});

test("a TTY init installs only the editors the user accepts", async () => {
  const python = `
import os, pty, select, sys, time
cmd = sys.argv[1:]
answers = [part.encode() + b"\\n" for part in os.environ.get("EDITOR_ANSWERS", "n,n").split(",")]
log_path = os.environ["EDITOR_PTY_LOG"]
pid, fd = pty.fork()
if pid == 0:
    os.execvpe(cmd[0], cmd, os.environ)
buf = b""
sent = 0
status = None
deadline = time.time() + float(os.environ.get("EDITOR_PTY_TIMEOUT", "30"))
while time.time() < deadline:
    ready, _, _ = select.select([fd], [], [], 0.2)
    if ready:
        try:
            chunk = os.read(fd, 65536)
        except OSError:
            chunk = b""
        if not chunk:
            break
        buf += chunk
        while sent < len(answers) and buf.count(b"[y/N]") > sent:
            os.write(fd, answers[sent])
            sent += 1
    done, status_now = os.waitpid(pid, os.WNOHANG)
    if done:
        status = status_now
        break
else:
    os.kill(pid, 15)
    open(log_path, "wb").write(buf)
    sys.stderr.write("pty timeout\\n")
    sys.exit(124)
if status is None:
    _, status = os.waitpid(pid, 0)
open(log_path, "wb").write(buf)
if sent < len(answers):
    sys.stderr.write("saw %s of %s prompts\\n" % (sent, len(answers)))
    sys.exit(2)
sys.exit(os.waitstatus_to_exitcode(status))
`;
  const cases = [
    { answers: "n,n", installsCode: false, installsTypora: false },
    { answers: "y,n", installsCode: true, installsTypora: false },
    { answers: "n,y", installsCode: false, installsTypora: true },
  ];
  for (const item of cases) {
    const parent = mkdtempSync(path.join(tmpdir(), "garden-editors-pty-"));
    const site = path.join(parent, "blog");
    const { env, bin, log } = siteEnv(parent);
    writeStub(bin, "code");
    const ptyLog = path.join(parent, "pty.log");
    try {
      execFileSync("/usr/bin/python3", ["-c", python, process.execPath, garden, "init", site], {
        cwd: parent,
        env: { ...env, EDITOR_ANSWERS: item.answers, EDITOR_PTY_LOG: ptyLog, EDITOR_PTY_TIMEOUT: "30" },
        encoding: "utf8",
      });
      const transcript = readFileSync(ptyLog, "utf8");
      assert.match(transcript, /安装 VS Code/u);
      assert.match(transcript, /安装 Typora/u);
      assert.equal(existsSync(log), item.installsCode);
      if (item.installsCode) assert.match(readFileSync(log, "utf8"), /--install-extension /u);
      const plugin = path.join(parent, ".typora/community-plugins/plugins/hedon954.garden-intelligent-ui/manifest.json");
      assert.equal(existsSync(plugin), item.installsTypora);
      assert.ok(existsSync(path.join(site, ".garden/editors/.install-offered")));
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  }
});
