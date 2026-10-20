#!/usr/bin/env node
/**
 * /favicon.ico for browsers, feed readers and crawlers that ask for it
 * regardless of <link rel="icon">. Made from the site's own icon (`brand.favicon`
 * in site.config.yaml, Garden's favicon.svg when unset): 16, 32 and 48 px PNG
 * images in one ICO file. Runs after the build, into dist/client.
 *
 * A favicon.ico the site already has in public/ is left alone. An icon given
 * as a full URL, or a file that is missing or cannot be read, only prints a
 * warning: the page itself still names its icon.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { resolveBrand } from "./brand.mjs";

export const ICO_SIZES = [16, 32, 48];

/** An ICO file holding one PNG image per size (Windows Vista and every current browser read PNG entries). */
export function icoFromPngs(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

/** The icon file behind a brand.favicon URL: public/ first, then what the build copied. Null for remote icons. */
export function faviconSource(siteRoot, outDir, faviconUrl, basePath = "") {
  if (/^(?:[a-z]+:)?\/\//iu.test(faviconUrl) || faviconUrl.startsWith("data:")) return null;
  let local = faviconUrl.split(/[?#]/u)[0];
  if (basePath && local.startsWith(`${basePath}/`)) local = local.slice(basePath.length);
  local = decodeURIComponent(local).replace(/^\/+/u, "");
  for (const root of [path.join(siteRoot, "public"), outDir]) {
    const file = path.resolve(root, local);
    if (file.startsWith(path.resolve(root) + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return "";
}

/** Writes outDir/favicon.ico from the source icon. Returns what happened, for the log and the tests. */
export async function writeFaviconIco({ source, outDir, siteRoot }) {
  const target = path.join(outDir, "favicon.ico");
  if (siteRoot && fs.existsSync(path.join(siteRoot, "public", "favicon.ico"))) return { status: "kept", target };
  if (/\.ico$/iu.test(source)) {
    fs.copyFileSync(source, target);
    return { status: "copied", target };
  }
  const { default: sharp } = await import("sharp");
  const input = fs.readFileSync(source);
  const images = [];
  for (const size of ICO_SIZES) {
    // SVG is rasterised at the target size, not scaled down from a bitmap.
    const density = /\.svg$/iu.test(source) ? Math.max(72, Math.ceil((72 * size) / 16)) : undefined;
    const png = await sharp(input, density ? { density } : {})
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    images.push({ size, png });
  }
  fs.writeFileSync(target, icoFromPngs(images));
  return { status: "written", target, sizes: ICO_SIZES };
}

export async function runFaviconStep({ siteRoot, env = process.env, out = process.stdout }) {
  const outDir = path.join(siteRoot, "dist", "client");
  const warn = (line) => out.write(`警告：${line}\n`);
  if (!fs.existsSync(outDir)) {
    warn(`找不到构建产物 ${path.relative(siteRoot, outDir)}，没有生成 favicon.ico。`);
    return 0;
  }
  const configFile = path.join(siteRoot, "site.config.yaml");
  const config = fs.existsSync(configFile) ? parseYaml(fs.readFileSync(configFile, "utf8")) ?? {} : {};
  const basePath = (env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/u, "");
  const { favicon } = resolveBrand(siteRoot, config, basePath);
  const source = faviconSource(siteRoot, outDir, favicon, basePath);
  if (source === null) {
    warn(`brand.favicon 是外部地址 ${favicon}，没有生成 favicon.ico。`);
    return 0;
  }
  if (!source) {
    warn(`找不到图标文件 ${favicon}，没有生成 favicon.ico。`);
    return 0;
  }
  try {
    const result = await writeFaviconIco({ source, outDir, siteRoot });
    const baseDir = basePath ? path.join(outDir, basePath.replace(/^\/+/u, "")) : "";
    if (baseDir && fs.existsSync(path.join(baseDir, "index.html"))) {
      fs.copyFileSync(result.target, path.join(baseDir, "favicon.ico"));
    }
    if (result.status === "kept") out.write("favicon.ico：使用 public/favicon.ico。\n");
    else out.write(`favicon.ico：由 ${path.relative(siteRoot, source)} 生成${result.sizes ? `（${result.sizes.join("、")} px）` : ""}。\n`);
  } catch (error) {
    warn(`favicon.ico 生成失败（${error.message}），页面仍使用 ${favicon}。`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  process.exitCode = await runFaviconStep({ siteRoot });
}
