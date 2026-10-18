/**
 * Link card refresh (layer 2). The article's cards are complete at build time;
 * this Worker only lets a reader's browser pick up a newer title or
 * description for a card URL the site already lists.
 *
 * Guards: only GET from the site's own origins; only URLs in the site's
 * published allowlist; only public http(s) hosts, redirects re-checked; HTML
 * only, at most 1 MB, 5 s; a per-IP request budget; results cached for a day,
 * failures for ten minutes. It never
 * returns a remote image URL: cards keep their build-time local picture.
 */
import { fetchPageMeta } from "../../scripts/link-meta-core.mjs";

export const DEFAULTS = {
  allowedOrigins: ["https://hedon.top"],
  allowLocalhost: true,
  allowlistTtlMs: 5 * 60 * 1000,
  resultTtlSeconds: 24 * 60 * 60,
  // A page that could not be read is not tried again for this long.
  failureTtlSeconds: 10 * 60,
  timeoutMs: 5000,
  maxBytes: 1024 * 1024,
  ratePerMinute: 30,
};

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/u;

export function originAllowed(origin, { allowedOrigins, allowLocalhost }) {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  return allowLocalhost && LOCAL_ORIGIN.test(origin);
}

/** Fixed one-minute windows per key. Good enough inside one isolate. */
export function createRateLimiter({ perMinute, now = () => Date.now() }) {
  const windows = new Map();
  return (key) => {
    const minute = Math.floor(now() / 60000);
    const entry = windows.get(key);
    if (!entry || entry.minute !== minute) {
      if (windows.size > 10000) windows.clear();
      windows.set(key, { minute, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= perMinute;
  };
}

/** Normalise what the reader asked for, so `?url=` variations share a cache entry. */
export function normaliseTarget(raw) {
  try {
    const url = new URL(raw);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

const json = (body, status, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...headers },
  });

/**
 * Build the request handler. Everything outside is injected: `fetch` for the
 * target pages, `loadAllowlist` for the site's list, `cache` (get/put by key)
 * and `limit` (true when the IP may go on).
 */
export function createHandler({
  fetch: fetcher,
  loadAllowlist,
  cache = null,
  limit,
  options = {},
  now = () => Date.now(),
}) {
  const config = { ...DEFAULTS, ...options };
  const limiter = limit ?? createRateLimiter({ perMinute: config.ratePerMinute, now });
  let allowlist = null;
  let allowlistAt = 0;

  const currentAllowlist = async () => {
    if (allowlist && now() - allowlistAt < config.allowlistTtlMs) return allowlist;
    try {
      const list = await loadAllowlist();
      allowlist = new Set((Array.isArray(list) ? list : list?.urls ?? []).map(normaliseTarget).filter(Boolean));
      allowlistAt = now();
    } catch {
      // Keep the last good list; with none, nothing is allowed.
      allowlist ??= new Set();
    }
    return allowlist;
  };

  return async function handle(request, { ip = "" } = {}) {
    const origin = request.headers.get("origin") ?? "";
    if (!originAllowed(origin, config)) return json({ error: "origin not allowed" }, 403);
    const cors = {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-max-age": "86400",
      vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405, { ...cors, allow: "GET, OPTIONS" });

    if (!(await limiter(ip || "unknown"))) return json({ error: "too many requests" }, 429, { ...cors, "retry-after": "60" });

    const target = normaliseTarget(new URL(request.url).searchParams.get("url") ?? "");
    if (!target) return json({ error: "missing url" }, 400, cors);
    if (!(await currentAllowlist()).has(target)) return json({ error: "url not listed" }, 403, cors);

    const cacheKey = `og:${target}`;
    const cached = await cache?.get(cacheKey);
    if (cached) return json(cached, 200, { ...cors, "cache-control": "public, max-age=3600", "x-cache": "hit" });

    const failureKey = `og-fail:${target}`;
    const failed = await cache?.get(failureKey);
    if (failed) return json(failed, 502, { ...cors, "x-cache": "hit" });
    const fail = async (body) => {
      await cache?.put(failureKey, body, config.failureTtlSeconds);
      return json(body, 502, { ...cors, "x-cache": "miss" });
    };

    let meta;
    try {
      meta = await fetchPageMeta(target, { fetch: fetcher, timeoutMs: config.timeoutMs, maxBytes: config.maxBytes });
    } catch (error) {
      return fail({ error: "could not read page", detail: String(error?.message ?? error).slice(0, 120) });
    }
    if (!meta.title) return fail({ error: "no title" });
    // Text only. Pictures stay the local copies made at build time.
    const body = Object.fromEntries(Object.entries({
      url: target,
      title: meta.title,
      description: meta.description,
      siteName: meta.siteName,
      author: meta.author,
      publishedTime: meta.publishedTime,
    }).filter(([, value]) => value));
    await cache?.put(cacheKey, body, config.resultTtlSeconds);
    return json(body, 200, { ...cors, "cache-control": "public, max-age=3600", "x-cache": "miss" });
  };
}
