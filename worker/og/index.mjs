/**
 * Cloudflare Worker entry for link card refresh. See README.md.
 *
 * Vars: SITE_ORIGIN (where /link-allowlist.json lives), ALLOWED_ORIGINS
 * (comma separated), ALLOW_LOCALHOST ("1" to accept http://localhost:*),
 * RATE_PER_MINUTE. Optional binding: RATE_LIMITER (Workers rate limiting).
 */
import { createHandler, DEFAULTS } from "./handler.mjs";

let handler;
let handlerEnv;

function edgeCache() {
  const store = globalThis.caches?.default;
  if (!store) return null;
  const keyUrl = (key) => `https://og-cache.internal/${encodeURIComponent(key)}`;
  return {
    async get(key) {
      const hit = await store.match(keyUrl(key));
      return hit ? hit.json() : null;
    },
    async put(key, value, ttl) {
      await store.put(keyUrl(key), new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttl}` },
      }));
    },
  };
}

function build(env) {
  const siteOrigin = String(env.SITE_ORIGIN ?? "https://hedon.top").replace(/\/+$/u, "");
  const allowedOrigins = String(env.ALLOWED_ORIGINS ?? siteOrigin).split(",").map((value) => value.trim()).filter(Boolean);
  const binding = env.RATE_LIMITER;
  return createHandler({
    fetch: (url, init) => fetch(url, init),
    loadAllowlist: async () => {
      const response = await fetch(`${siteOrigin}/link-allowlist.json`, { cf: { cacheTtl: 300 } });
      if (!response.ok) throw new Error(`allowlist HTTP ${response.status}`);
      return response.json();
    },
    cache: edgeCache(),
    limit: binding ? async (key) => (await binding.limit({ key })).success : undefined,
    options: {
      allowedOrigins,
      allowLocalhost: env.ALLOW_LOCALHOST === "1",
      ratePerMinute: Number(env.RATE_PER_MINUTE) || DEFAULTS.ratePerMinute,
    },
  });
}

const worker = {
  async fetch(request, env) {
    if (!handler || handlerEnv !== env) {
      handler = build(env);
      handlerEnv = env;
    }
    return handler(request, { ip: request.headers.get("cf-connecting-ip") ?? "" });
  },
};

export default worker;
