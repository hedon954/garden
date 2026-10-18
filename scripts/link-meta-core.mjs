/**
 * Link metadata: read a page's <head> and pull out its icon and Open Graph
 * fields. No Node APIs here, so the build and the og Worker share it. Every
 * network call takes an injected `fetch`, which keeps it testable.
 */

export const DEFAULT_TIMEOUT_MS = 5000;
export const DEFAULT_MAX_HTML_BYTES = 1024 * 1024;
export const DEFAULT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_ICON_BYTES = 1024 * 1024;
/** Icons kept on disk stay under this; a multi-size .ico is cut down first. */
export const MAX_STORED_ICON_BYTES = 200 * 1024;
const MAX_REDIRECTS = 4;

/** The site a link points to: its host without a leading "www.". */
export function linkHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./u, "");
  } catch {
    return "";
  }
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u;

function privateIPv4(host) {
  const match = IPV4.exec(host);
  if (!match) return false;
  const [a, b] = match.slice(1, 3).map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19));
}

function privateIPv6(host) {
  const value = host.replace(/^\[|\]$/gu, "").toLowerCase();
  if (!value.includes(":")) return false;
  if (value === "::" || value === "::1") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/u.exec(value);
  if (mapped) return privateIPv4(mapped[1]);
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/u.exec(value);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1], 16);
    const low = Number.parseInt(mappedHex[2], 16);
    return privateIPv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  // NAT64 and IPv4-compatible forms can hide a private IPv4 address.
  if (/^(64:ff9b::|::[0-9a-f]{1,4}:[0-9a-f]{1,4}$)/u.test(value)) return true;
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/u.test(value);
}

/**
 * Only public web addresses may be fetched: http(s), default or standard
 * ports, no loopback, private, link-local or internal hosts.
 */
export function isPublicUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;
  if (url.port && !["80", "443"].includes(url.port)) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/u, "");
  if (!host || !host.includes(".") && !host.includes(":")) return false;
  if (host === "localhost" || /\.(localhost|local|internal|lan|home|arpa|test|invalid)$/u.test(host)) return false;
  if (host === "metadata.google.internal") return false;
  if (privateIPv4(host) || privateIPv6(host)) return false;
  // Decimal or hex IPv4 spellings (http://2130706433/) are refused outright.
  if (/^(0x[0-9a-f]+|\d+)$/iu.test(host)) return false;
  return true;
}

const withTimeout = (timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
};

/** Fetch with manual redirects, re-checking every hop against isPublicUrl. */
export async function safeFetch(url, { fetch: fetcher = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isPublicUrl(current)) throw new Error(`blocked address: ${current}`);
    const timer = withTimeout(timeoutMs);
    let response;
    try {
      response = await fetcher(current, {
        redirect: "manual",
        signal: timer.signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; GardenLinkPreview/1.0)", accept: "text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5", ...headers },
      });
    } finally {
      timer.done();
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`redirect without location: ${current}`);
      current = new URL(location, current).toString();
      continue;
    }
    return { response, url: current };
  }
  throw new Error(`too many redirects: ${url}`);
}

/** Read at most maxBytes; for HTML stop once </head> has arrived. */
export async function readCapped(response, maxBytes, { untilHead = false } = {}) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes && !untilHead) throw new Error("response too large");
  if (!response.body?.getReader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes && !untilHead) throw new Error("response too large");
    return buffer.slice(0, maxBytes);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  let tail = "";
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (untilHead) {
      tail = (tail + decoder.decode(value, { stream: true })).slice(-4096);
      if (/<\/head\s*>|<body[\s>]/iu.test(tail)) break;
    }
    if (size > maxBytes) {
      if (!untilHead) {
        await reader.cancel().catch(() => {});
        throw new Error("response too large");
      }
      break;
    }
  }
  await reader.cancel().catch(() => {});
  const out = new Uint8Array(Math.min(size, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, Math.max(0, out.byteLength - offset));
    out.set(part, offset);
    offset += part.byteLength;
    if (offset >= out.byteLength) break;
  }
  return out;
}

export const isHtmlType = (type) => /^(text\/html|application\/xhtml\+xml)\b/iu.test(type ?? "");
export const isImageType = (type) => /^image\/(png|jpeg|gif|webp|avif|svg\+xml|x-icon|vnd\.microsoft\.icon)\b/iu.test(type ?? "");

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };
const decodeEntities = (value) => value
  .replace(/&#x([0-9a-f]+);/giu, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/gu, (_, dec) => String.fromCodePoint(Number(dec)))
  .replace(/&([a-z0-9#]+);/giu, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);

function attributes(tag) {
  const out = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gu)) {
    out[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? "");
  }
  return out;
}

const clean = (value, max = 300) => {
  const text = decodeEntities(String(value ?? "")).replace(/\s+/gu, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const absolute = (value, base) => {
  if (!value) return "";
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
};

/** Title, description, image, site name, author, date and icon candidates from a page's head. */
export function parseHead(html, baseUrl) {
  const head = (/<head[\s>][\s\S]*?(<\/head>|$)/iu.exec(html)?.[0]) ?? html.slice(0, 200_000);
  const meta = {};
  for (const tag of head.match(/<meta\b[^>]*>/giu) ?? []) {
    const attrs = attributes(tag);
    const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (key && attrs.content !== undefined && meta[key] === undefined) meta[key] = attrs.content;
  }
  const icons = [];
  for (const tag of head.match(/<link\b[^>]*>/giu) ?? []) {
    const attrs = attributes(tag);
    const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/u);
    if (!rel.includes("icon") && !rel.includes("apple-touch-icon")) continue;
    const href = absolute(attrs.href, baseUrl);
    if (!href) continue;
    const size = Number(/(\d+)x\d+/u.exec(attrs.sizes ?? "")?.[1] ?? 0);
    // Prefer a small icon close to 32px, then the apple icon as a last resort.
    const score = (rel.includes("apple-touch-icon") ? 1000 : 0) + (size ? Math.abs(size - 32) : 16);
    icons.push({ href, score });
  }
  icons.sort((left, right) => left.score - right.score);
  const title = /<title[^>]*>([\s\S]*?)<\/title>/iu.exec(head)?.[1];
  const published = meta["article:published_time"] || meta["og:published_time"] || meta.date || meta.datepublished || meta["parsely-pub-date"] || "";
  const publishedTime = published && !Number.isNaN(Date.parse(published)) ? new Date(Date.parse(published)).toISOString().slice(0, 10) : "";
  const author = meta["article:author"] || meta.author || meta["twitter:creator"] || "";
  return {
    title: clean(meta["og:title"] || meta["twitter:title"] || title, 200),
    description: clean(meta["og:description"] || meta["twitter:description"] || meta.description, 300),
    image: absolute(meta["og:image:secure_url"] || meta["og:image"] || meta["og:image:url"] || meta["twitter:image"], baseUrl),
    siteName: clean(meta["og:site_name"] || meta["application-name"], 80),
    // article:author is sometimes a profile URL; only keep readable names.
    author: /^https?:\/\//iu.test(author) ? "" : clean(author, 80),
    publishedTime,
    icons: icons.map((icon) => icon.href),
  };
}

/** A page's head, fetched safely: HTML only, at most maxBytes, stopping at </head>. */
export async function fetchHead(url, { fetch: fetcher, timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = DEFAULT_MAX_HTML_BYTES } = {}) {
  const { response, url: finalUrl } = await safeFetch(url, { fetch: fetcher, timeoutMs });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type");
  if (!isHtmlType(type)) throw new Error(`not HTML: ${type}`);
  const bytes = await readCapped(response, maxBytes, { untilHead: true });
  return { html: new TextDecoder().decode(bytes), url: finalUrl };
}

/** Open Graph fields for a page. */
export async function fetchPageMeta(url, options = {}) {
  const { html, url: finalUrl } = await fetchHead(url, options);
  return { ...parseHead(html, finalUrl), url: finalUrl };
}

const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

/** Download an image (bytes plus a file extension), or throw. */
export async function fetchImage(url, { fetch: fetcher, timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = DEFAULT_MAX_IMAGE_BYTES } = {}) {
  const { response } = await safeFetch(url, { fetch: fetcher, timeoutMs });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  // Many servers send /favicon.ico as octet-stream.
  if (!isImageType(type) && /\.ico(\?|$)/iu.test(url) && /^(application\/octet-stream|)$/u.test(type)) type = "image/x-icon";
  if (!isImageType(type)) throw new Error(`not an image: ${type}`);
  const bytes = await readCapped(response, maxBytes);
  if (!bytes.byteLength) throw new Error("empty image");
  return { bytes, ext: EXTENSIONS[type] ?? "img", type };
}

/**
 * A multi-size .ico can be hundreds of KB. Keep just the image closest to
 * 32px, as a one-image .ico. Returns the input when it is not a valid .ico.
 */
export function trimIco(bytes, target = 32) {
  if (bytes.byteLength < 22) return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) return bytes;
  const count = view.getUint16(4, true);
  if (!count || 6 + count * 16 > bytes.byteLength) return bytes;
  let best = null;
  for (let index = 0; index < count; index += 1) {
    const at = 6 + index * 16;
    const width = bytes[at] || 256;
    const size = view.getUint32(at + 8, true);
    const offset = view.getUint32(at + 12, true);
    if (!size || offset + size > bytes.byteLength) continue;
    const bits = view.getUint16(at + 6, true);
    // Closest to the target, never smaller than 16 when there is a choice, then deeper colour.
    const score = Math.abs(width - target) + (width < 16 ? 100 : 0) - bits / 100;
    if (!best || score < best.score) best = { at, size, offset, score };
  }
  if (!best || count === 1) return bytes;
  const out = new Uint8Array(22 + best.size);
  const outView = new DataView(out.buffer);
  outView.setUint16(2, 1, true);
  outView.setUint16(4, 1, true);
  out.set(bytes.subarray(best.at, best.at + 12), 6);
  outView.setUint32(18, 22, true);
  out.set(bytes.subarray(best.offset, best.offset + best.size), 22);
  return out;
}

/** A site's icon: the <link rel=icon> candidates first, then /favicon.ico. */
export async function fetchFavicon(pageUrl, { fetch: fetcher, timeoutMs = DEFAULT_TIMEOUT_MS, head } = {}) {
  const origin = new URL(pageUrl).origin;
  let candidates = head?.icons ?? [];
  if (!head) {
    try {
      const { html, url } = await fetchHead(`${origin}/`, { fetch: fetcher, timeoutMs });
      candidates = parseHead(html, url).icons;
    } catch {
      candidates = [];
    }
  }
  for (const candidate of [...candidates, `${origin}/favicon.ico`]) {
    try {
      const icon = await fetchImage(candidate, { fetch: fetcher, timeoutMs, maxBytes: DEFAULT_MAX_ICON_BYTES });
      const bytes = icon.ext === "ico" ? trimIco(icon.bytes) : icon.bytes;
      if (bytes.byteLength > MAX_STORED_ICON_BYTES) continue;
      return { ...icon, bytes, source: candidate };
    } catch {
      // try the next candidate
    }
  }
  return null;
}
