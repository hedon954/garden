/**
 * In-site links in article bodies.
 *
 * `redirects` in site.config.yaml maps old addresses to where pages live now,
 * and a static export answers the old address with a small meta-refresh page
 * (scripts/redirects.mjs). A client navigation cannot follow that page: there
 * is no RSC payload at the old address. So when an article links to an old
 * address, the rendered link points straight at the new one, keeping the
 * link's own ?query and #hash.
 *
 * `internalRoute` returns the address to give the framework Link, or null to
 * keep a plain anchor: a link that leaves the site, ends on a file, runs into a
 * redirect loop or an external target, or lands on no known page.
 */
import { clientRoute } from "./same-site.mjs";

/** Valid `{ from, to }` pairs from the config; anything malformed is reported and skipped. */
export function readRedirects(config = {}, warn = () => {}) {
  const map = config?.redirects;
  if (!map) return [];
  if (typeof map !== "object" || Array.isArray(map)) {
    warn("redirects 应写成「旧路径: 新地址」的映射，已忽略。");
    return [];
  }
  const pairs = [];
  for (const [rawFrom, rawTo] of Object.entries(map)) {
    let from = String(rawFrom).trim();
    const to = String(rawTo ?? "").trim();
    try {
      from = decodeURI(from);
    } catch {
      // keep as written
    }
    if (!from.startsWith("/") || from.startsWith("//") || from === "/" || /(^|\/)\.\.?(\/|$)/u.test(from) || /[?#]/u.test(from)) {
      warn(`redirects：旧路径 ${rawFrom} 必须是站内路径（以 / 开头，不带 ?、# 和 ..），已跳过。`);
      continue;
    }
    if (!(to.startsWith("/") && !to.startsWith("//")) && !/^https?:\/\//iu.test(to)) {
      warn(`redirects：${rawFrom} 的新地址 ${rawTo} 应以 / 开头或是完整网址，已跳过。`);
      continue;
    }
    pairs.push({ from, to });
  }
  return pairs;
}

/** `/columns/<slug>/` → `/columns/#<slug>` for every valid column slug in columns.yaml. */
export function columnRedirects(columnsConfig = {}) {
  const columns = Array.isArray(columnsConfig?.columns) ? columnsConfig.columns : [];
  return columns
    .map((column) => (column && typeof column.slug === "string" ? column.slug.trim() : ""))
    .filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug))
    .map((slug) => ({ from: `/columns/${slug}/`, to: `/columns/#${slug}` }));
}

/** One key per page address: decoded, without a trailing slash (`/` stays `/`). */
export function routeKey(pathname) {
  let value = String(pathname ?? "");
  try {
    value = decodeURI(value);
  } catch {
    // keep as written
  }
  return value.length > 1 ? value.replace(/\/+$/u, "") || "/" : value;
}

const splitHref = (href) => {
  const hashAt = href.indexOf("#");
  const beforeHash = hashAt < 0 ? href : href.slice(0, hashAt);
  const hash = hashAt < 0 ? "" : href.slice(hashAt);
  const queryAt = beforeHash.indexOf("?");
  return { pathname: queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt), search: queryAt < 0 ? "" : beforeHash.slice(queryAt), hash };
};

/**
 * Build the resolver once per render.
 * - redirects: `{ from, to }` pairs (readRedirects + columnRedirects).
 * - routes: every page address the site builds, without the base path.
 * - basePath: NEXT_PUBLIC_BASE_PATH; Link adds it back.
 * - format: shapes the route it returns (the app passes siteHref, which adds the trailing slash).
 */
export function internalLinkResolver({ redirects = [], routes = [], basePath = "", format = (href) => href } = {}) {
  const moved = new Map();
  for (const { from, to } of redirects) if (!moved.has(routeKey(from))) moved.set(routeKey(from), to);
  const pages = new Set([...routes].map(routeKey));
  const base = String(basePath ?? "").trim().replace(/\/+$/u, "");
  return function internalRoute(href) {
    if (typeof href !== "string") return null;
    let value = href.trim();
    if (!value.startsWith("/") || value.startsWith("//")) return null;
    if (base) {
      if (value !== base && !value.startsWith(`${base}/`) && !value.startsWith(`${base}?`) && !value.startsWith(`${base}#`)) return null;
      value = value.slice(base.length) || "/";
      if (!value.startsWith("/")) value = `/${value}`;
    }
    const own = splitHref(value);
    let target = own;
    const seen = new Set();
    while (moved.has(routeKey(target.pathname))) {
      const key = routeKey(target.pathname);
      if (seen.has(key) || seen.size > 16) return null;
      seen.add(key);
      const to = moved.get(key);
      if (!to.startsWith("/") || to.startsWith("//")) return null;
      const next = splitHref(to);
      // The link's own ?query and #hash win; otherwise the redirect target's.
      target = { pathname: next.pathname || "/", search: own.search || next.search, hash: own.hash || next.hash };
    }
    if (!pages.has(routeKey(target.pathname))) return null;
    const route = clientRoute(`${target.pathname}${target.search}${target.hash}`);
    return route ? format(route) : route;
  };
}
