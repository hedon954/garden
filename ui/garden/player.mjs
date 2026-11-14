/**
 * In-article YouTube / Bilibili players.
 *
 * Authors paste a platform video URL on its own line. Only exact hostnames and
 * recognized video addresses become a player; lookalike domains, in-sentence
 * links, code, and an explicit `{card}` stay ordinary links or cards.
 * Short links that need a network hop are not resolved at render time.
 */

const YOUTUBE_ID = /^[0-9A-Za-z_-]{11}$/u;
const BVID = /^BV[0-9A-Za-z]{10}$/u;
const AID = /^\d{1,16}$/u;
const MAX_START = 24 * 60 * 60;

/** @typedef {{ ok: true, provider: "youtube" | "bilibili", pageUrl: string, playerUrl: string, label: string }} PlayerSuccess */
/** @typedef {{ ok: false, reason: string }} PlayerFailure */
/** @typedef {PlayerSuccess | PlayerFailure} PlayerResult */

export const PLAYER_IFRAME_ORIGINS = Object.freeze([
  "https://www.youtube-nocookie.com",
  "https://player.bilibili.com",
]);

/**
 * @param {string} hostname
 * @returns {string}
 */
export function normalizedHostname(hostname) {
  return String(hostname ?? "").trim().replace(/\.$/u, "").toLowerCase();
}

/**
 * Exact host match, plus an optional `www.` prefix. Never a substring test.
 * @param {string} hostname
 * @param  {...string} allowed
 */
export function isExactHost(hostname, ...allowed) {
  const host = normalizedHostname(hostname);
  return allowed.some((name) => host === name || host === `www.${name}`);
}

function isYoutubeHost(host) {
  return isExactHost(host, "youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com");
}

function isBilibiliHost(host) {
  const name = normalizedHostname(host);
  return name === "bilibili.com" || name.endsWith(".bilibili.com");
}

/**
 * Bilibili short hosts such as b23.tv need a network redirect to know the
 * video id. Render time does not follow them; the CLI may expand them.
 * @param {string} hostname
 */
export function isUnsupportedVideoShortHost(hostname) {
  return isExactHost(hostname, "b23.tv", "bili22.cn", "bili2233.cn", "bili23.cn", "bili33.cn");
}

function fail(reason) {
  return { ok: false, reason };
}

/**
 * @param {unknown} raw
 * @returns {URL | null}
 */
export function readHttpUrl(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  if (url.username || url.password) return null;
  if (!url.hostname) return null;
  return url;
}

function youtubeIdFrom(url) {
  const host = normalizedHostname(url.hostname);
  const parts = url.pathname.split("/").filter(Boolean);
  if (isExactHost(host, "youtu.be")) {
    return parts.length === 1 ? parts[0] : undefined;
  }
  if (url.searchParams.get("v")) return url.searchParams.get("v") ?? undefined;
  if (parts[0] === "watch" && parts.length === 1) return undefined;
  if (parts.length === 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) return parts[1];
  return undefined;
}

function parseClock(value) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  if (/^\d+$/u.test(text)) {
    const seconds = Number(text);
    return Number.isInteger(seconds) && seconds > 0 && seconds <= MAX_START ? seconds : undefined;
  }
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/iu.exec(text);
  if (!match || match[0] === "") return undefined;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return Number.isInteger(total) && total > 0 && total <= MAX_START ? total : undefined;
}

function youtubeStart(url) {
  return parseClock(url.searchParams.get("start")) ?? parseClock(url.searchParams.get("t")) ?? parseClock(url.hash.replace(/^#t=/u, ""));
}

function youtubePageUrl(id, start) {
  const url = new URL(`https://www.youtube.com/watch?v=${id}`);
  if (start) url.searchParams.set("t", String(start));
  return url.toString();
}

function youtubePlayerUrl(id, start) {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  if (start) url.searchParams.set("start", String(start));
  return url.toString();
}

function bilibiliIdFrom(url) {
  const host = normalizedHostname(url.hostname);
  if (isExactHost(host, "player.bilibili.com")) {
    const bvid = url.searchParams.get("bvid");
    const aid = url.searchParams.get("aid");
    if (bvid && BVID.test(normalizeBvid(bvid))) return { key: "bvid", value: normalizeBvid(bvid) };
    if (aid && AID.test(aid)) return { key: "aid", value: aid };
    return undefined;
  }
  const match = url.pathname.match(/\/video\/(BV[0-9A-Za-z]{10}|av\d{1,16}|AV\d{1,16})\b/u);
  if (!match) return undefined;
  const token = match[1];
  if (BVID.test(normalizeBvid(token))) return { key: "bvid", value: normalizeBvid(token) };
  const aid = token.replace(/^av/iu, "");
  if (AID.test(aid)) return { key: "aid", value: aid };
  return undefined;
}

function normalizeBvid(value) {
  const text = String(value ?? "");
  return text.length >= 2 ? `BV${text.slice(2)}` : text;
}

function bilibiliPageUrl(id) {
  return id.key === "bvid"
    ? `https://www.bilibili.com/video/${id.value}`
    : `https://www.bilibili.com/video/av${id.value}`;
}

function bilibiliPlayerUrl(id) {
  const url = new URL("https://player.bilibili.com/player.html");
  url.searchParams.set(id.key, id.value);
  url.searchParams.set("high_quality", "1");
  url.searchParams.set("danmaku", "0");
  url.searchParams.set("autoplay", "0");
  return url.toString();
}

/**
 * @param {unknown} raw
 * @returns {PlayerResult}
 */
export function resolvePlayer(raw) {
  const url = readHttpUrl(raw);
  if (!url) return fail("not-http-url");
  const host = url.hostname;
  if (isUnsupportedVideoShortHost(host)) return fail("short-link");
  if (isYoutubeHost(host)) {
    const id = youtubeIdFrom(url);
    if (!id || !YOUTUBE_ID.test(id)) return fail("unsupported-youtube-url");
    const start = youtubeStart(url);
    return {
      ok: true,
      provider: "youtube",
      pageUrl: youtubePageUrl(id, start),
      playerUrl: youtubePlayerUrl(id, start),
      label: "YouTube",
    };
  }
  if (isBilibiliHost(host)) {
    const id = bilibiliIdFrom(url);
    if (!id) return fail("unsupported-bilibili-url");
    return {
      ok: true,
      provider: "bilibili",
      pageUrl: bilibiliPageUrl(id),
      playerUrl: bilibiliPlayerUrl(id),
      label: "Bilibili",
    };
  }
  return fail("unsupported-host");
}

export function isPlayablePlayerUrl(raw) {
  return resolvePlayer(raw).ok;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Safe player markup. The iframe src is always a whitelisted player URL
 * produced by resolvePlayer, never the author's raw address.
 * @param {PlayerSuccess} player
 * @param {{ title?: string }} [options]
 */
export function renderPlayerHtml(player, options = {}) {
  if (!player?.ok) return "";
  if (!PLAYER_IFRAME_ORIGINS.some((origin) => player.playerUrl.startsWith(`${origin}/`))) return "";
  const title = String(options.title ?? "").trim() || `${player.label} video`;
  const open = player.provider === "youtube" ? "在 YouTube 打开" : "在 Bilibili 打开";
  return [
    `<figure class="g-player g-player-${player.provider}">`,
    `<div class="g-player-frame">`,
    `<iframe src="${escapeAttribute(player.playerUrl)}" title="${escapeAttribute(title)}" loading="lazy" allow="fullscreen; picture-in-picture; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`,
    `</div>`,
    `<figcaption><a class="ext" href="${escapeAttribute(player.pageUrl)}" target="_blank" rel="noopener noreferrer">${escapeText(open)}</a></figcaption>`,
    `</figure>`,
  ].join("");
}

export function renderPlayerError(message) {
  const text = String(message ?? "无法嵌入这个视频。请检查链接是否为可播放的 YouTube 或 Bilibili 地址。").trim();
  return `<p class="g-player-error">${escapeText(text)}</p>`;
}

function yamlScalar(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const unquoted = text.replace(/^['"]|['"]$/gu, "");
  return unquoted;
}

/**
 * Parse a historical ```embed fence. Playable URLs become players; anything
 * else is a visible fallback, never an arbitrary iframe.
 * @param {string} source
 */
export function renderLegacyEmbed(source) {
  const text = String(source ?? "").trim();
  const urlMatch = /(?:^|\n)\s*url\s*:\s*(\S[^\n]*)/iu.exec(text);
  const titleMatch = /(?:^|\n)\s*title\s*:\s*([^\n]+)/iu.exec(text);
  const rawUrl = yamlScalar(urlMatch?.[1] ?? "");
  const title = yamlScalar(titleMatch?.[1] ?? "");
  if (!rawUrl) {
    return renderPlayerError("无法解析这段历史 embed 围栏，请改成单独一行的 YouTube 或 Bilibili 链接。");
  }
  const player = resolvePlayer(rawUrl);
  if (player.ok) return renderPlayerHtml(player, { title });
  const url = readHttpUrl(rawUrl);
  if (url) {
    const label = title || url.toString();
    return `<p class="g-player-fallback"><a href="${escapeAttribute(url.toString())}" target="_blank" rel="noopener noreferrer">${escapeText(label)}</a></p>`;
  }
  return renderPlayerError("无法解析这段历史 embed 围栏里的地址。");
}

/**
 * Paste-ready author line for the CLI. Playable URLs are normalized; other
 * addresses are returned unchanged. Metadata belongs on stderr, not in a fence.
 * @param {unknown} raw
 */
export function authorPasteUrl(raw) {
  const player = resolvePlayer(raw);
  if (player.ok) return player.pageUrl;
  const url = readHttpUrl(raw);
  return url ? url.toString() : "";
}
