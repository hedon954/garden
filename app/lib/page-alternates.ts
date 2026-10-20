import { siteHref } from "./site-href";

/** The site feed, linked from every page's head. */
export const FEED_ALTERNATES = { "application/rss+xml": "/rss.xml" } as const;

/**
 * Head links for a page that should be indexed under one address: the canonical
 * URL, shaped like the site's links (trailing slash in a static export) and
 * resolved against metadataBase, plus the feed. A page that sets `alternates`
 * replaces the layout's, so the feed link is repeated here.
 */
export function pageAlternates(pathname: string, languages?: Record<string, string>) {
  return { canonical: siteHref(pathname), types: FEED_ALTERNATES, ...(languages ? { languages } : {}) };
}
