/**
 * Build-time link assets, downloaded into the site's own static files so
 * readers never ask a third party for them:
 * - each external site's favicon;
 * - for links written as `[text](url){card}`, the page's title, description,
 *   site name, author, date and a local copy of its og:image.
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
import { fetchFavicon, fetchImage, fetchPageMeta, isPublicUrl, linkHost } from "./link-meta-core.mjs";
import { parse as parseYaml } from "yaml";
import { markdownLinks } from "../ui/garden/markdown-links.mjs";
import { configuredSiteAddress, sameSiteMatcher } from "../ui/garden/same-site.mjs";

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
  return { version: 1, favicons: {}, cards: {} };
}

export function readLinkCache(siteRoot) {
  const cache = readJson(path.join(siteRoot, CACHE_FILE), emptyCache());
  return { ...emptyCache(), ...cache, favicons: { ...(cache.favicons ?? {}) }, cards: { ...(cache.cards ?? {}) } };
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

function readSiteConfig(siteRoot) {
  try {
    return parseYaml(fs.readFileSync(path.join(siteRoot, "site.config.yaml"), "utf8")) ?? {};
  } catch {
    return {};
  }
}

/** External links across every post: the sites (for favicons) and the URLs. */
export function collectSiteLinks(siteRoot, env = process.env) {
  const config = readSiteConfig(siteRoot);
  // Links back to this site are internal: no favicon, no card.
  const sameSite = sameSiteMatcher(configuredSiteAddress(config, env), env.NEXT_PUBLIC_BASE_PATH ?? "");
  const hosts = new Map();
  const cards = new Set();
  const urls = new Set();
  for (const file of markdownFiles(path.join(siteRoot, "content"))) {
    const { content } = matter(fs.readFileSync(file, "utf8"));
    for (const { url, card } of markdownLinks(content)) {
      if (!isPublicUrl(url) || sameSite(url)) continue;
      urls.add(url);
      if (card) cards.add(url);
      const host = linkHost(url);
      if (host && !hosts.has(host)) hosts.set(host, url);
    }
  }
  return { hosts, cards, urls };
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
  const cardStats = { fetched: 0, cached: 0, missing: 0 };
  let hosts;
  let cards;
  try {
    ({ hosts, cards } = collectSiteLinks(siteRoot));
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

  const assetExists = (file) => Boolean(file) && fs.existsSync(path.join(siteRoot, "public", file.replace(/^\//u, "")));
  const keepCachedCard = (url) => {
    const old = cache.cards[url];
    if (old?.title) {
      next.cards[url] = old.image && !assetExists(old.image) ? { ...old, image: undefined } : old;
      cardStats.cached += 1;
    } else {
      cardStats.missing += 1;
    }
  };
  await pool([...cards], concurrency, async (url) => {
    try {
      const meta = await fetchPageMeta(url, { fetch: fetchImpl, timeoutMs });
      if (!meta.title) return keepCachedCard(url);
      let image;
      if (meta.image) {
        try {
          const picture = await shrinkImage(await fetchImage(meta.image, { fetch: fetchImpl, timeoutMs: timeoutMs * 2 }));
          const name = `${digest(Buffer.from(url))}-${digest(picture.bytes)}.${picture.ext}`;
          fs.mkdirSync(path.join(assetRoot, "og"), { recursive: true });
          fs.writeFileSync(path.join(assetRoot, "og", name), picture.bytes);
          image = `${ASSET_URL}/og/${name}`;
        } catch {
          // A card without a picture is fine; keep the old one if we had it.
          const old = cache.cards[url]?.image;
          image = assetExists(old) ? old : undefined;
        }
      }
      next.cards[url] = Object.fromEntries(Object.entries({
        title: meta.title,
        description: meta.description,
        siteName: meta.siteName,
        author: meta.author,
        publishedTime: meta.publishedTime,
        image,
      }).filter(([, value]) => value));
      cardStats.fetched += 1;
    } catch {
      keepCachedCard(url);
    }
  });
  next.cards = Object.fromEntries(Object.entries(next.cards).sort(([a], [b]) => a.localeCompare(b)));

  next.favicons = Object.fromEntries(Object.entries(next.favicons).sort(([a], [b]) => a.localeCompare(b)));
  try {
    fs.writeFileSync(path.join(siteRoot, CACHE_FILE), `${JSON.stringify(next, null, 2)}\n`);
    pruneAssets(siteRoot, next);
  } catch (error) {
    log(`链接资源：写缓存失败（${error.message}）`);
  }
  log(`链接图标：新取 ${stats.fetched}，沿用缓存 ${stats.cached}，没有图标 ${stats.missing}`);
  if (cards.size) log(`链接卡片：新取 ${cardStats.fetched}，沿用缓存 ${cardStats.cached}，没有信息 ${cardStats.missing}`);
  return { cache: next, stats, cardStats };
}

/** Drop files no entry points to any more. */
function pruneAssets(siteRoot, cache) {
  const keep = new Set([
    ...Object.values(cache.favicons).map((entry) => entry.file),
    ...Object.values(cache.cards).map((entry) => entry.image).filter(Boolean),
  ]);
  for (const kind of ["fav", "og"]) {
    const dir = path.join(siteRoot, ASSET_DIR, kind);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!keep.has(`${ASSET_URL}/${kind}/${name}`)) fs.rmSync(path.join(dir, name), { force: true });
    }
  }
}

/**
 * Card pictures are shown at most ~170px wide (full column on phones). When
 * the site has `sharp` installed, store a 720px WebP; otherwise keep the file.
 */
async function shrinkImage(picture) {
  if (picture.ext === "svg" || picture.ext === "ico") return picture;
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    return picture;
  }
  try {
    const bytes = await sharp(Buffer.from(picture.bytes), { animated: false })
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return bytes.byteLength < picture.bytes.byteLength ? { bytes, ext: "webp", type: "image/webp" } : picture;
  } catch {
    return picture;
  }
}

/** What the article renderer needs: icons by site host, card details by URL (paths with base path). */
export function linkAssetsForRender(siteRoot, basePath = "") {
  const cache = readLinkCache(siteRoot);
  const exists = (file) => Boolean(file) && fs.existsSync(path.join(siteRoot, "public", file.replace(/^\//u, "")));
  const favicons = {};
  for (const [host, entry] of Object.entries(cache.favicons)) {
    if (exists(entry?.file)) favicons[host] = `${basePath}${entry.file}`;
  }
  const cards = {};
  for (const [url, entry] of Object.entries(cache.cards)) {
    if (!entry?.title) continue;
    const { image, ...rest } = entry;
    cards[url] = exists(image) ? { ...rest, image: `${basePath}${image}` } : rest;
  }
  return { favicons, cards };
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
