/**
 * Build-time export of `.excalidraw` scenes to a sibling flat SVG.
 *
 * Authors reference the source (`![说明](./assets/foo.excalidraw)`). Content
 * sync calls `ensureExcalidrawSvg`, which deletes a missing or stale sibling
 * `foo.svg` and writes a new one. The SVG is what gets published.
 *
 * Rendering goes through the pinned `excalidraw-image` binary (the official
 * `@excalidraw/excalidraw` export path, fonts inlined as data URIs). There is
 * no Chromium step, and the article bundle never loads Excalidraw. The first
 * export downloads that binary from GitHub Releases into the user cache.
 * `GARDEN_EXCALIDRAW_IMAGE` points at a local binary instead.
 * `GARDEN_OFFLINE=1` refuses to download.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const EXCALIDRAW_IMAGE_VERSION = "0.2.0";

const RELEASE_BASE = `https://github.com/rickardp/excalidraw-image/releases/download/v${EXCALIDRAW_IMAGE_VERSION}`;

/** @type {Record<string, { file: string, sha256: string }>} */
const ASSETS = {
  "darwin-arm64": {
    file: "excalidraw-image-aarch64-apple-darwin.tar.gz",
    sha256: "387f7ef44a75528e4c6cca9f0af4bba34e017986f34581d983bb2a96afb5d9ba",
  },
  "darwin-x64": {
    file: "excalidraw-image-x86_64-apple-darwin.tar.gz",
    sha256: "bef1198f6237123ecc7f63c1fc6a456413e5f6cc91ae4c548dc26d661066fc21",
  },
  "linux-arm64": {
    file: "excalidraw-image-aarch64-unknown-linux-gnu.tar.gz",
    sha256: "c6b222e128965568e281af96edfa437393b2ddb4e3ba360ec2b9b583f273143e",
  },
  "linux-x64": {
    file: "excalidraw-image-x86_64-unknown-linux-gnu.tar.gz",
    sha256: "6a86f5188b55aef092d9cedda786565bfdb399bb58e57a1bea26335ed8f19ac6",
  },
  "win32-x64": {
    file: "excalidraw-image-x86_64-pc-windows-msvc.zip",
    sha256: "19b387b2322d3b52f8003d2e8bea9ab5693086c5886986f86b5ac6c36009aeef",
  },
};

const REASONS = {
  "missing-source": "找不到 Excalidraw 源文件",
  "export-failed": "导出 Excalidraw 失败",
  offline: "离线构建找不到 excalidraw-image",
  "download-failed": "下载 excalidraw-image 失败",
  checksum: "excalidraw-image 校验和不匹配",
  "embedded-scene": "导出的 SVG 仍包含可编辑场景",
  "remote-asset": "导出的 SVG 引用了外部地址",
  "not-svg": "导出结果不是 SVG",
  "unsupported-platform": "当前系统没有 excalidraw-image 预编译包",
  "binary-missing": "GARDEN_EXCALIDRAW_IMAGE 指向的文件不存在",
  "no-output": "导出程序没有写出 SVG",
};

const STAMP = /<!--\s*garden-excalidraw-source:([0-9a-f]{64})\s*-->/u;
const LOCK_WAIT_MS = 5 * 60 * 1000;

export class ExcalidrawExportError extends Error {
  /**
   * @param {keyof typeof REASONS} code
   * @param {string} message
   * @param {string} file
   */
  constructor(code, message, file) {
    super(message);
    this.name = "ExcalidrawExportError";
    this.code = code;
    this.file = file;
  }
}

/**
 * @param {keyof typeof REASONS} code
 * @param {string} file
 * @param {string} [detail]
 */
function failExport(code, file, detail) {
  const lead = REASONS[code];
  if (!lead) {
    const unknown = /** @type {never} */ (code);
    throw new Error(`未知的 Excalidraw 错误码 ${unknown}`);
  }
  const tail = detail ? `（${detail}）` : "";
  return new ExcalidrawExportError(code, `[excalidraw:${code}] ${lead} ${file}${tail}`, file);
}

/** sha256 of the `.excalidraw` bytes. Any edit changes the stamp. */
export function sourceHash(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

/** `flow.excalidraw` → `flow.svg` beside it. The extension match is case-insensitive. */
export function siblingSvgPath(excalidrawPath) {
  return String(excalidrawPath).replace(/\.excalidraw$/iu, ".svg");
}

/** True for a Markdown path whose file is an `.excalidraw` source, not an `.excalidraw.svg`. */
export function isExcalidrawPath(value) {
  const clean = String(value ?? "").split(/[?#]/u, 1)[0];
  return /\.excalidraw$/iu.test(clean);
}

function readStamp(svg) {
  return STAMP.exec(svg)?.[1] ?? "";
}

function stampSvg(svg, hash) {
  const stripped = svg.replace(/<!--\s*garden-excalidraw-source:[0-9a-f]{64}\s*-->/gu, "");
  const at = stripped.search(/<svg[\s>]/iu);
  if (at < 0) throw failExport("not-svg", "");
  return `${stripped.slice(0, at)}<!-- garden-excalidraw-source:${hash} -->${stripped.slice(at)}`;
}

/**
 * A published figure must be a flat SVG: no embedded scene, no host the
 * reader's browser would have to call.
 * @param {string} svg
 * @param {string} svgPath
 */
function assertFlatSvg(svg, svgPath) {
  if (!/<svg[\s>]/iu.test(svg)) throw failExport("not-svg", svgPath);
  if (/payload-start|application\/vnd\.excalidraw\+json/iu.test(svg)) {
    throw failExport("embedded-scene", svgPath);
  }
  const urls = [...svg.matchAll(/https?:\/\/[^"')\s]+/giu)]
    .map((match) => match[0])
    .filter((url) => !/^https?:\/\/www\.w3\.org\//iu.test(url));
  if (urls.length) throw failExport("remote-asset", svgPath, urls.slice(0, 3).join(" "));
}

function svgIsCurrent(svg, hash) {
  if (readStamp(svg) !== hash) return false;
  try {
    assertFlatSvg(svg, "");
    return true;
  } catch {
    return false;
  }
}

function platformKey() {
  return `${process.platform}-${process.arch}`;
}

function platformAsset() {
  const asset = ASSETS[platformKey()];
  if (!asset) {
    throw failExport(
      "unsupported-platform",
      `${process.platform} ${process.arch}`,
      "设置 GARDEN_EXCALIDRAW_IMAGE 指向本机的 excalidraw-image",
    );
  }
  return asset;
}

/**
 * @param {{ homedir?: string }} [options]
 */
function cachePath(options = {}) {
  const home = options.homedir ?? os.homedir();
  const exe = process.platform === "win32" ? "excalidraw-image.exe" : "excalidraw-image";
  return path.join(home, ".cache", "garden", "excalidraw-image", EXCALIDRAW_IMAGE_VERSION, platformKey(), exe);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withLock(lockDir, fn) {
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let stale = false;
      try {
        stale = Date.now() - fs.statSync(lockDir).mtimeMs > LOCK_WAIT_MS;
      } catch {
        stale = true;
      }
      if (stale) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        continue;
      }
      if (Date.now() > deadline) throw failExport("download-failed", lockDir, "等待下载锁超时");
      sleep(100);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

function run(command, args, { timeout = 120_000 } = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
}

function commandFailure(result, fallback) {
  if (result.error) return result.error.message;
  return (result.stderr || result.stdout || fallback).trim();
}

function findExportedBinary(dir) {
  const names = new Set(["excalidraw-image", "excalidraw-image.exe"]);
  const found = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) break;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (names.has(entry.name)) found.push(full);
    }
  }
  if (found.length !== 1) {
    throw failExport("download-failed", dir, `压缩包里应有一个 excalidraw-image，实际 ${found.length} 个`);
  }
  return found[0];
}

/**
 * @param {{ homedir?: string, env?: NodeJS.ProcessEnv }} options
 */
function installBinary(options) {
  const asset = platformAsset();
  const cached = cachePath(options);
  return withLock(`${cached}.lock`, () => {
    if (fs.existsSync(cached)) return cached;
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "garden-excalidraw-"));
    try {
      const archive = path.join(work, asset.file);
      const url = `${RELEASE_BASE}/${asset.file}`;
      console.error(`正在下载 excalidraw-image ${EXCALIDRAW_IMAGE_VERSION}（${asset.file}）…`);
      const curl = run("curl", ["-fsSL", "--retry", "3", "--retry-delay", "2", "-o", archive, url]);
      if (curl.status !== 0) throw failExport("download-failed", url, commandFailure(curl, "curl 失败"));
      const got = crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
      if (got !== asset.sha256) throw failExport("checksum", asset.file, `期望 ${asset.sha256}，实际 ${got}`);
      const unpacked = path.join(work, "unpacked");
      fs.mkdirSync(unpacked, { recursive: true });
      const extracted = run("tar", ["-xf", archive, "-C", unpacked]);
      if (extracted.status !== 0) {
        throw failExport("download-failed", archive, commandFailure(extracted, "tar 无法解压"));
      }
      const bin = findExportedBinary(unpacked);
      fs.mkdirSync(path.dirname(cached), { recursive: true });
      const partial = `${cached}.partial`;
      fs.copyFileSync(bin, partial);
      fs.chmodSync(partial, 0o755);
      const version = run(partial, ["--version"]);
      if (version.status !== 0 || !/excalidraw-image/u.test(version.stdout || "")) {
        fs.rmSync(partial, { force: true });
        throw failExport("download-failed", partial, commandFailure(version, "excalidraw-image --version 失败"));
      }
      fs.renameSync(partial, cached);
      return cached;
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });
}

/**
 * @param {{ homedir?: string, env?: NodeJS.ProcessEnv }} [options]
 */
function resolveBinary(options = {}) {
  const env = options.env ?? process.env;
  const override = env.GARDEN_EXCALIDRAW_IMAGE?.trim();
  if (override) {
    if (!fs.existsSync(override)) throw failExport("binary-missing", override);
    return override;
  }
  platformAsset();
  const cached = cachePath(options);
  if (fs.existsSync(cached)) return cached;
  if (env.GARDEN_OFFLINE === "1") throw failExport("offline", cached);
  return installBinary(options);
}

let defaultBinary = "";

/**
 * @param {string} input
 * @param {string} output
 * @param {{ homedir?: string, env?: NodeJS.ProcessEnv }} [options]
 */
function renderWithBinary(input, output, options = {}) {
  const custom = options.env !== undefined || options.homedir !== undefined;
  const bin = !custom && defaultBinary && fs.existsSync(defaultBinary) ? defaultBinary : resolveBinary(options);
  if (!custom) defaultBinary = bin;
  const result = run(bin, [input, "--non-editable", "--format", "svg", "-o", output]);
  if (result.status !== 0) {
    throw failExport("export-failed", input, commandFailure(result, `退出码 ${result.status}`).slice(0, 800));
  }
}

/**
 * Write a current flat SVG next to `sourcePath`.
 * A sibling SVG is reused only when it carries this source's hash and is flat.
 * Otherwise it is deleted, then exported again. Export failure leaves no SVG.
 *
 * @param {string} sourcePath
 * @param {{ render?: (input: string, output: string) => void, homedir?: string, env?: NodeJS.ProcessEnv }} [options]
 * @returns {string} absolute path of the sibling SVG
 */
export function ensureExcalidrawSvg(sourcePath, options = {}) {
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw failExport("missing-source", sourcePath);
  }
  const svgPath = siblingSvgPath(sourcePath);
  if (svgPath === sourcePath) throw failExport("not-svg", sourcePath, "无法把源文件路径换成 .svg");
  const hash = sourceHash(fs.readFileSync(sourcePath));
  if (fs.existsSync(svgPath)) {
    const current = fs.readFileSync(svgPath, "utf8");
    if (svgIsCurrent(current, hash)) return svgPath;
    fs.rmSync(svgPath, { force: true });
  }
  const render = options.render ?? ((input, output) => renderWithBinary(input, output, options));
  try {
    render(sourcePath, svgPath);
    if (!fs.existsSync(svgPath) || !fs.statSync(svgPath).isFile()) throw failExport("no-output", svgPath);
    const raw = fs.readFileSync(svgPath, "utf8");
    assertFlatSvg(raw, svgPath);
    fs.writeFileSync(svgPath, stampSvg(raw, hash));
  } catch (error) {
    fs.rmSync(svgPath, { force: true });
    if (error instanceof ExcalidrawExportError) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    throw failExport("export-failed", sourcePath, reason);
  }
  return svgPath;
}
