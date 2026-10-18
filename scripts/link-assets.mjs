/**
 * Build-time link assets: each external site's favicon, downloaded into the
 * site's own static files so readers never ask a third party for it.
 *
 * Results are cached in `link-assets.json` (commit it). Every build refetches;
 * when a fetch fails the cached copy stays, and when there is none the link
 * simply shows no icon. Network trouble never fails the build.
 */
import { lookup } from "node:dns/promises";
import crypto from "node:crypto";
import fs from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { fetchFavicon, isPublicUrl, linkHost } from "./link-meta-core.mjs";
import { markdownLinks } from "../ui/garden/markdown-links.mjs";

export const CACHE_FILE = "link-assets.json";
export const ASSET_DIR = path.join("public", "link-assets");
export const ASSET_URL = "/link-assets";

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

export function emptyCache() {
  return { version: 1, favicons: {} };
}

export function readLinkCache(siteRoot) {
  const cache = readJson(path.join(siteRoot, CACHE_FILE), emptyCache());
  return { ...emptyCache(), ...cache, favicons: { ...(cache.favicons ?? {}) } };
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

/** External links across every post: the sites (for favicons) and the URLs. */
export function collectSiteLinks(siteRoot) {
  const hosts = new Map();
  for (const file of markdownFiles(path.join(siteRoot, "content"))) {
    const { content } = matter(fs.readFileSync(file, "utf8"));
    for (const { url } of markdownLinks(content)) {
      if (!isPublicUrl(url)) continue;
      const host = linkHost(url);
      if (host && !hosts.has(host)) hosts.set(host, url);
    }
  }
  return { hosts };
}

/** In Node we can also resolve the name and refuse private addresses. */
export async function assertPublicDns(hostname) {
  const host = hostname.replace(/^\[|\]$/gu, "");
  if (isIP(host)) return;
  const addresses = await lookup(host, { all: true });
  for (const { address } of addresses) {
    // 198.18.0.0/15 is what fake-IP proxies (Clash, Surge) hand out for every name.
    if (/^198\.1[89]\./u.test(address)) continue;
    if (!isPublicUrl(`http://${address.includes(":") ? `[${address}]` : address}/`)) {
      throw new Error(`${hostname} resolves to a private address`);
    }
  }
}

function guardedFetch(fetcher) {
  return async (url, init) => {
    await assertPublicDns(new URL(url).hostname);
    return fetcher(url, init);
  };
}

async function pool(items, size, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

const fileSafe = (host) => host.replace(/[^a-z0-9.-]/giu, "_");
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 10);

/**
 * Refetch every favicon. Never throws: on any failure the cached entry (when
 * its file is still there) is kept; otherwise the site gets no icon.
 */
export async function refreshLinkAssets({
  siteRoot,
  fetch: fetcher = globalThis.fetch,
  dnsCheck = true,
  concurrency = 8,
  timeoutMs = 5000,
  log = () => {},
} = {}) {
  const cache = readLinkCache(siteRoot);
  const next = emptyCache();
  const stats = { fetched: 0, cached: 0, missing: 0 };
  let hosts;
  try {
    ({ hosts } = collectSiteLinks(siteRoot));
  } catch (error) {
    log(`链接资源：读取文章失败，沿用缓存（${error.message}）`);
    return { cache, stats };
  }
  const assetRoot = path.join(siteRoot, ASSET_DIR);
  const fetchImpl = dnsCheck ? guardedFetch(fetcher) : fetcher;
  const keepCached = (host) => {
    const old = cache.favicons[host];
    if (old?.file && fs.existsSync(path.join(siteRoot, "public", old.file.replace(/^\//u, "")))) {
      next.favicons[host] = old;
      stats.cached += 1;
    } else {
      stats.missing += 1;
    }
  };

  await pool([...hosts], concurrency, async ([host, url]) => {
    try {
      const icon = await fetchFavicon(url, { fetch: fetchImpl, timeoutMs });
      if (!icon) return keepCached(host);
      const name = `${fileSafe(host)}-${digest(icon.bytes)}.${icon.ext}`;
      fs.mkdirSync(path.join(assetRoot, "fav"), { recursive: true });
      fs.writeFileSync(path.join(assetRoot, "fav", name), icon.bytes);
      next.favicons[host] = { file: `${ASSET_URL}/fav/${name}` };
      stats.fetched += 1;
    } catch {
      keepCached(host);
    }
  });

  next.favicons = Object.fromEntries(Object.entries(next.favicons).sort(([a], [b]) => a.localeCompare(b)));
  try {
    fs.writeFileSync(path.join(siteRoot, CACHE_FILE), `${JSON.stringify(next, null, 2)}\n`);
    pruneAssets(siteRoot, next);
  } catch (error) {
    log(`链接资源：写缓存失败（${error.message}）`);
  }
  log(`链接图标：新取 ${stats.fetched}，沿用缓存 ${stats.cached}，没有图标 ${stats.missing}`);
  return { cache: next, stats };
}

/** Drop icon files no entry points to any more. */
function pruneAssets(siteRoot, cache) {
  const keep = new Set(Object.values(cache.favicons).map((entry) => entry.file));
  const dir = path.join(siteRoot, ASSET_DIR, "fav");
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!keep.has(`${ASSET_URL}/fav/${name}`)) fs.rmSync(path.join(dir, name), { force: true });
  }
}

/** What the article renderer needs: site host → icon path (with base path). */
export function linkAssetsForRender(siteRoot, basePath = "") {
  const cache = readLinkCache(siteRoot);
  const favicons = {};
  for (const [host, entry] of Object.entries(cache.favicons)) {
    if (entry?.file && fs.existsSync(path.join(siteRoot, "public", entry.file.replace(/^\//u, "")))) {
      favicons[host] = `${basePath}${entry.file}`;
    }
  }
  return { favicons };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  if (process.env.GARDEN_OFFLINE === "1") {
    process.stdout.write("链接资源：离线模式，沿用缓存\n");
  } else {
    await refreshLinkAssets({ siteRoot, log: (line) => process.stdout.write(`${line}\n`) }).catch((error) => {
      process.stdout.write(`链接资源：跳过（${error.message}）\n`);
    });
  }
}
