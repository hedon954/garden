/**
 * The one place that shapes an address inside the site.
 *
 * A static export serves every page as a folder (`/blog/post/`), and the host
 * answers `/blog/post` with a 301 first: a new tab, a reader without
 * JavaScript and a crawler all pay for it. So every page path ends with a
 * slash, and `?query` and `#hash` come after it. Files (a last segment with an
 * extension), pure `#hash` or `?query` links and anything outside the site
 * are left alone.
 */
export function withTrailingSlash(href) {
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
  if (!pathname.endsWith("/")) pathname = `${pathname}/`;
  return `${pathname}${search}${hash}`;
}

const decodeAttribute = (value) =>
  value.replace(/&amp;/gu, "&").replace(/&quot;/gu, '"').replace(/&#x27;|&#39;/gu, "'").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">");

/**
 * Links in a built page whose site path does not end with a slash: `<a>` and
 * `<area>` hrefs that start with one `/`. Files (an extension in the last
 * segment) and pure #hash links are fine. Used to check a static export.
 */
export function findSlashlessLinks(html) {
  const found = [];
  for (const match of String(html ?? "").matchAll(/<(?:a|area)\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/giu)) {
    const href = decodeAttribute(match[1] ?? match[2] ?? "").trim();
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    if (withTrailingSlash(href) !== href) found.push(href);
  }
  return found;
}
