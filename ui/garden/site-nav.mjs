/**
 * The header's site navigation. Hrefs carry the trailing slash: a static
 * export serves these pages at /blog/ and so on, and the host answers /blog
 * with a 301 first (new tab, no JavaScript, crawlers).
 *
 * /tags/ stays as a deep route (article tag chips still link there) but is
 * not listed in the primary nav.
 */
export const SITE_NAV = [
  { href: "/blog/", label: "文章" },
  { href: "/thoughts/", label: "随想" },
  { href: "/columns/", label: "专栏" },
  { href: "/about/", label: "关于" },
];

const trim = (value) => (value.length > 1 ? value.replace(/\/+$/u, "") : value);

/**
 * Whether a nav item is the current section. The pathname may come with or
 * without the trailing slash; articles count as 文章 (/blog/…, /a2/…).
 */
export function isCurrentNav(pathname, href) {
  const path = trim(pathname || "/");
  const section = trim(href);
  if (section === "/blog") return path === "/blog" || path.startsWith("/blog/") || path.startsWith("/a2/");
  return path === section || path.startsWith(`${section}/`);
}
