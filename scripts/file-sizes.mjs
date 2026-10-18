#!/usr/bin/env node
/**
 * Sizes of remote files named in `garden file` fences (OSS and other https
 * links), so the card can say 「ZIP · 48 MB」 without the page asking anyone.
 *
 * Every build sends one HEAD request per URL (a one-byte range request when
 * HEAD gives no length). Results go into `file-sizes.json`; commit it. When a
 * request fails, the last known size is kept. A file that never answered has
 * no size on its card. The build never fails here.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { isPublicUrl } from "./link-meta-core.mjs";
import { assertPublicDns, pool } from "./link-assets.mjs";
import { scanFences, parseGardenBlock } from "../ui/garden/parse.mjs";
import { isRemoteSrc, maskHtmlComments, readFileProps } from "../ui/garden/file-block.mjs";

export const CACHE_FILE = "file-sizes.json";
const TIMEOUT_MS = 8000;
const HEADERS = { "user-agent": "Mozilla/5.0 (compatible; GardenFileSize/1.0)" };

export function readFileSizeCache(siteRoot) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(siteRoot, CACHE_FILE), "utf8"));
    return { files: data?.files && typeof data.files === "object" ? data.files : {} };
  } catch {
    return { files: {} };
  }
}

/** Remote `src` values in the `garden file` fences of one Markdown body. */
export function remoteFileSources(markdown) {
  const found = [];
  for (const fence of scanFences(maskHtmlComments(markdown))) {
    if (!/^garden\s+file\b/iu.test(fence.info ?? "")) continue;
    const block = parseGardenBlock(fence.info, fence.body);
    if (!block || block.error) continue;
    for (const file of readFileProps(block.props).files) if (isRemoteSrc(file.src)) found.push(file.src);
  }
  return [...new Set(found)];
}

const lengthOf = (response) => {
  const range = /\/(\d+)\s*$/u.exec(response.headers.get("content-range") ?? "")?.[1];
  if (range) return Number(range);
  const length = Number(response.headers.get("content-length"));
  return Number.isFinite(length) && length > 0 && response.status !== 206 ? length : 0;
};

async function request(url, method, fetcher, checkHost) {
  let current = url;
  for (let hop = 0; hop < 4; hop += 1) {
    if (!isPublicUrl(current)) throw new Error("not a public URL");
    await checkHost(new URL(current).hostname);
    const response = await fetcher(current, {
      method,
      redirect: "manual",
      headers: method === "GET" ? { ...HEADERS, range: "bytes=0-0" } : HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await response.body?.cancel().catch(() => {});
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      current = new URL(response.headers.get("location"), current).toString();
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return lengthOf(response);
  }
  throw new Error("too many redirects");
}

/** Size in bytes of a remote file: HEAD first, then a one-byte range GET. */
export async function probeFileSize(url, { fetch: fetcher = globalThis.fetch, checkHost = assertPublicDns } = {}) {
  let headError = null;
  try {
    const size = await request(url, "HEAD", fetcher, checkHost);
    if (size > 0) return size;
  } catch (error) {
    headError = error;
    if (error?.message === "not a public URL") throw error;
  }
  const size = await request(url, "GET", fetcher, checkHost).catch((error) => {
    throw headError ?? error;
  });
  if (size > 0) return size;
  throw new Error("no length");
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return /\.mdx?$/iu.test(entry.name) ? [full] : [];
  });
}

export function collectRemoteFiles(siteRoot) {
  const urls = new Set();
  for (const file of markdownFiles(path.join(siteRoot, "content"))) {
    const { content } = matter(fs.readFileSync(file, "utf8"));
    for (const src of remoteFileSources(content)) urls.add(src);
  }
  return [...urls].sort();
}

/**
 * Asks every remote file for its size and writes the cache. A failed request
 * keeps the cached size; a URL that never answered stays out of the cache.
 */
export async function refreshFileSizes({ siteRoot, fetch: fetcher, checkHost, log = () => {}, concurrency = 6 }) {
  const cache = readFileSizeCache(siteRoot);
  const urls = collectRemoteFiles(siteRoot);
  const files = {};
  let failed = 0;
  await pool(urls, concurrency, async (url) => {
    try {
      files[url] = { size: await probeFileSize(url, { fetch: fetcher, checkHost }) };
    } catch (error) {
      failed += 1;
      const cached = cache.files[url];
      if (cached?.size > 0) {
        files[url] = cached;
        log(`警告：读不到文件大小，沿用上次的结果：${url}（${error.message}）`);
      } else {
        log(`警告：读不到文件大小，这个文件不显示大小：${url}（${error.message}）`);
      }
    }
  });
  const sorted = Object.fromEntries(Object.keys(files).sort().map((url) => [url, files[url]]));
  const next = `${JSON.stringify({ version: 1, files: sorted }, null, 2)}\n`;
  const file = path.join(siteRoot, CACHE_FILE);
  const previous = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (next !== previous && (urls.length || previous)) fs.writeFileSync(file, next);
  log(`文件大小：${urls.length} 个远程文件，读到 ${urls.length - failed} 个，失败 ${failed} 个。`);
  return { files: sorted, failed };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  await refreshFileSizes({ siteRoot, log: (line) => process.stdout.write(`${line}\n`) }).catch((error) => {
    process.stdout.write(`警告：文件大小没有更新（${error.message}），继续构建。\n`);
  });
}
