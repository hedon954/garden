#!/usr/bin/env node
/**
 * Intrinsic sizes of the images in post bodies, so every <img> can carry
 * width and height and the page does not jump as lazy images load.
 *
 * - Local images are read at build time with image-size (see build-content).
 * - Remote images are probed here: only the first bytes are downloaded, never
 *   the whole file. Results go into `image-sizes.json` (commit it), so later
 *   builds do not fetch them again. A failed probe is logged and retried next
 *   time; the image simply renders without a size. The build never fails.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { imageSize } from "image-size";
import { isPublicUrl } from "./link-meta-core.mjs";
import { assertPublicDns, pool } from "./link-assets.mjs";
import { mapOutsideCode } from "../ui/garden/markdown-links.mjs";

export const CACHE_FILE = "image-sizes.json";
const HEAD_BYTES = [64 * 1024, 512 * 1024];
const TIMEOUT_MS = 8000;

// A destination may hold balanced parentheses, as in `image (9).png` written as `image%20(9).png`.
const MD_IMAGE = /!\[[^\]]*\]\(\s*(?:<([^>\n]+)>|((?:[^()\s]|\([^()\s]*\))+))(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/gu;
const HTML_IMAGE = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/giu;

/** Image sources written in a Markdown body, outside code, in order, without repeats. */
export function imageSources(markdown) {
  const found = [];
  mapOutsideCode(markdown, (text) => {
    for (const match of text.matchAll(MD_IMAGE)) found.push(match[1] ?? match[2]);
    for (const match of text.matchAll(HTML_IMAGE)) found.push(match[1]);
    return text;
  });
  return [...new Set(found)];
}

const svgLength = (value) => {
  const match = /^\s*([\d.]+)\s*(px)?\s*$/iu.exec(value ?? "");
  return match ? Number(match[1]) : 0;
};

/**
 * An SVG's size from its opening tag, even when the tag is cut off: drawing
 * tools can put a huge attribute (draw.io's `content`) inside it.
 */
export function svgSizeFromHead(text) {
  const tag = /<svg\b[^>]*/iu.exec(text)?.[0];
  if (!tag) return null;
  const attr = (name) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "iu").exec(tag)?.[1];
  const width = svgLength(attr("width"));
  const height = svgLength(attr("height"));
  if (width > 0 && height > 0) return { width: Math.round(width), height: Math.round(height) };
  const box = (attr("viewBox") ?? "").trim().split(/[\s,]+/u).map(Number);
  if (box.length === 4 && box[2] > 0 && box[3] > 0) {
    if (width > 0) return { width: Math.round(width), height: Math.round((width * box[3]) / box[2]) };
    return { width: Math.round(box[2]), height: Math.round(box[3]) };
  }
  return null;
}

/** `{ width, height }` from the first bytes of an image, or null. */
export function sizeFromBytes(bytes) {
  const head = new TextDecoder().decode(bytes.subarray(0, 4096));
  if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?<svg\b/iu.test(head)) return svgSizeFromHead(head);
  try {
    const result = imageSize(bytes);
    // EXIF orientation 5–8 turns the picture a quarter: the browser swaps the sides.
    const turned = result.orientation >= 5 && result.orientation <= 8;
    const width = turned ? result.height : result.width;
    const height = turned ? result.width : result.height;
    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

export function readImageCache(siteRoot) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(siteRoot, CACHE_FILE), "utf8"));
    return { images: data?.images && typeof data.images === "object" ? data.images : {} };
  } catch {
    return { images: {} };
  }
}

/** Read at most `limit` bytes of the response body, then stop the download. */
async function readHead(response, limit) {
  if (!response.body) return new Uint8Array(await response.arrayBuffer()).slice(0, limit);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(Math.min(total, limit));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, Math.min(chunk.length, bytes.length - offset));
    bytes.set(part, offset);
    offset += part.length;
    if (offset >= bytes.length) break;
  }
  return bytes;
}

/** Fetch the head of an image, following up to 3 redirects to public hosts only. */
async function fetchHead(url, limit, fetcher, checkHost) {
  let current = url;
  for (let hop = 0; hop < 4; hop += 1) {
    if (!isPublicUrl(current)) throw new Error("not a public URL");
    await checkHost(new URL(current).hostname);
    const response = await fetcher(current, {
      redirect: "manual",
      headers: { range: `bytes=0-${limit - 1}`, accept: "image/*", "user-agent": "Mozilla/5.0 (compatible; GardenImageSize/1.0)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      await response.body?.cancel().catch(() => {});
      current = new URL(response.headers.get("location"), current).toString();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`HTTP ${response.status}`);
    }
    return readHead(response, limit);
  }
  throw new Error("too many redirects");
}

export async function probeRemoteSize(url, { fetch: fetcher = globalThis.fetch, checkHost = assertPublicDns } = {}) {
  let lastError = "unreadable";
  for (const limit of HEAD_BYTES) {
    try {
      const size = sizeFromBytes(await fetchHead(url, limit, fetcher, checkHost));
      if (size) return size;
    } catch (error) {
      lastError = error?.message ?? String(error);
      break;
    }
  }
  throw new Error(lastError);
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return /\.mdx?$/iu.test(entry.name) ? [full] : [];
  });
}

/** Remote image URLs across every Markdown file under content/. */
export function collectRemoteImages(siteRoot) {
  const urls = new Set();
  for (const file of markdownFiles(path.join(siteRoot, "content"))) {
    const { content } = matter(fs.readFileSync(file, "utf8"));
    for (const src of imageSources(content)) if (/^https?:\/\//iu.test(src)) urls.add(src);
  }
  return [...urls].sort();
}

export async function refreshImageSizes({ siteRoot, fetch: fetcher, checkHost, log = () => {}, concurrency = 6 }) {
  const cache = readImageCache(siteRoot);
  const urls = collectRemoteImages(siteRoot);
  const images = {};
  const missing = [];
  for (const url of urls) {
    if (cache.images[url]?.width > 0 && cache.images[url]?.height > 0) images[url] = cache.images[url];
    else missing.push(url);
  }
  let failed = 0;
  await pool(missing, concurrency, async (url) => {
    try {
      images[url] = await probeRemoteSize(url, { fetch: fetcher, checkHost });
    } catch (error) {
      failed += 1;
      log(`警告：读不到图片尺寸，这张图不带宽高：${url}（${error.message}）`);
    }
  });
  const sorted = Object.fromEntries(Object.keys(images).sort().map((url) => [url, images[url]]));
  const next = `${JSON.stringify({ version: 1, images: sorted }, null, 2)}\n`;
  const file = path.join(siteRoot, CACHE_FILE);
  const previous = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (next !== previous && (urls.length || previous)) fs.writeFileSync(file, next);
  log(`图片尺寸：${urls.length} 张远程图片，新读取 ${missing.length - failed} 张，失败 ${failed} 张。`);
  return { images: sorted, probed: missing.length - failed, failed };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  await refreshImageSizes({ siteRoot, log: (line) => process.stdout.write(`${line}\n`) }).catch((error) => {
    process.stdout.write(`警告：图片尺寸没有更新（${error.message}），继续构建。\n`);
  });
}
