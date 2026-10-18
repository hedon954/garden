/**
 * Whether page addresses end with a slash: Next's `trailingSlash`.
 *
 * A static export always uses it: every page is a folder (`/blog/post/`) and
 * the host answers `/blog/post` with a 301 first. A server build uses it only
 * with TRAILING_SLASH=1; without it the server answers `/blog/post/` with a
 * 308 to `/blog/post`, so links must not carry the slash there.
 * next.config.ts and the generated siteLinks both read this.
 */
export function trailingSlashEnabled(env = process.env) {
  return env.STATIC_EXPORT === "1" || env.TRAILING_SLASH === "1";
}

/**
 * The one place that shapes an address inside the site.
 *
 * With `trailing` (the default) every page path ends with a slash; without it
 * the slash is dropped (the root stays `/`). `?query` and `#hash` come after
 * the path either way. Files (a last segment with an extension), pure `#hash`
 * or `?query` links and anything outside the site are left alone.
 */
export function withTrailingSlash(href, trailing = true) {
  if (typeof href !== "string") return href;
  const value = href.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  const hashAt = value.indexOf("#");
  const beforeHash = hashAt < 0 ? value : value.slice(0, hashAt);
  const hash = hashAt < 0 ? "" : value.slice(hashAt);
  const queryAt = beforeHash.indexOf("?");
  let pathname = queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt);
  const search = queryAt < 0 ? "" : beforeHash.slice(queryAt);
  const last = pathname.split("/").filter(Boolean).at(-1) ?? "";
  if (/\.[a-z0-9]{1,8}$/iu.test(last)) return value;
  if (trailing) {
    if (!pathname.endsWith("/")) pathname = `${pathname}/`;
  } else if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/u, "") || "/";
  }
  return `${pathname}${search}${hash}`;
}

const decodeAttribute = (value) =>
  value.replace(/&amp;/gu, "&").replace(/&quot;/gu, '"').replace(/&#x27;|&#39;/gu, "'").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">");

/**
 * Links in a built page whose site path has the wrong shape for the build:
 * `<a>` and `<area>` hrefs that start with one `/` and lack the trailing slash
 * (`trailing`, a static export) or carry one (a server build without it).
 * Files (an extension in the last segment) and pure #hash links are fine.
 */
export function findMisshapenLinks(html, { trailing = true } = {}) {
  const found = [];
  for (const match of String(html ?? "").matchAll(/<(?:a|area)\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/giu)) {
    const href = decodeAttribute(match[1] ?? match[2] ?? "").trim();
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    if (withTrailingSlash(href, trailing) !== href) found.push(href);
  }
  return found;
}

/** Internal page links without the trailing slash (checks a static export). */
export const findSlashlessLinks = (html) => findMisshapenLinks(html, { trailing: true });
