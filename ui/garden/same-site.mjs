/**
 * Links to the site's own address. A post may write a full URL such as
 * `https://example.com/blog/post/`; it is still an internal link.
 *
 * The site address comes from `url` in site.config.yaml, falling back to the
 * SITE_URL the build already uses. Both http and https count, and so do the
 * host with and without `www.`. Any other subdomain is a different site.
 */

/** The configured site address, or "" when none is set. */
export function configuredSiteAddress(config = {}, env = {}) {
  const value = config?.url ?? config?.siteUrl ?? env.SITE_URL ?? env.NEXT_PUBLIC_SITE_URL ?? "";
  return String(value).trim();
}

const hostKey = (hostname) => hostname.toLowerCase().replace(/\.$/u, "").replace(/^www\./u, "");
const normalizeBase = (basePath) => {
  const trimmed = String(basePath ?? "").trim().replace(/\/+$/u, "");
  return !trimmed ? "" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

/**
 * Returns `href => path | null`. The path is root-relative and keeps the base
 * path, query and hash; null means the link points somewhere else.
 */
export function sameSiteMatcher(siteAddress, basePath = "") {
  let site;
  try {
    site = siteAddress ? new URL(siteAddress) : null;
  } catch {
    site = null;
  }
  if (!site || !/^https?:$/u.test(site.protocol)) return () => null;
  const key = hostKey(site.hostname);
  const port = site.port;
  // A base path written into the site address counts the same as NEXT_PUBLIC_BASE_PATH.
  const base = normalizeBase(basePath) || normalizeBase(site.pathname);
  return (href) => {
    if (typeof href !== "string" || !/^(https?:)?\/\//iu.test(href.trim())) return null;
    let url;
    try {
      url = new URL(href.trim(), `${site.protocol}//${site.host}/`);
    } catch {
      return null;
    }
    if (!/^https?:$/u.test(url.protocol) || url.username || url.password) return null;
    if (hostKey(url.hostname) !== key || url.port !== port) return null;
    const pathname = url.pathname || "/";
    if (base && pathname !== base && !pathname.startsWith(`${base}/`)) return null;
    return `${pathname}${url.search}${url.hash}`;
  };
}

/**
 * How an article link renders: a link back to the site becomes its
 * root-relative path and opens in place; other full URLs are external.
 */
export function articleLink(href, sameSite) {
  if (!href) return { href, external: false };
  const local = sameSite(href);
  if (local !== null) return { href: local, external: false };
  return { href, external: /^(https?:)?\/\//iu.test(href) };
}

/** Static files the site serves next to its pages; these always load as files. */
const FILE_PREFIXES = ["/api/", "/assets/", "/images/", "/media/", "/link-assets/", "/_next/", "/fonts/"];

/**
 * The route to hand to the framework Link for an in-article link, or null to
 * keep a plain anchor. Only a root-relative page address qualifies: no
 * protocol or host, not just a hash, no file extension in the last segment,
 * none of the static file folders. Link adds the base path itself, so it is
 * taken off here; a path outside the base path stays a plain anchor.
 */
export function clientRoute(href, basePath = "") {
  if (typeof href !== "string") return null;
  const value = href.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  const base = normalizeBase(basePath);
  const [pathname] = value.split(/[?#]/u);
  let route = pathname;
  if (base) {
    if (route !== base && !route.startsWith(`${base}/`)) return null;
    route = route.slice(base.length) || "/";
  }
  if (FILE_PREFIXES.some((prefix) => route.startsWith(prefix) || `${route}/` === prefix)) return null;
  const last = route.split("/").filter(Boolean).at(-1) ?? "";
  if (/\.[a-z0-9]{1,8}$/iu.test(last)) return null;
  return `${route}${value.slice(pathname.length)}`;
}
