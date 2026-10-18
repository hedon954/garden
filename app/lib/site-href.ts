import { withTrailingSlash } from "../../ui/garden/site-href.mjs";

/** Every address inside the site goes through here: page paths end with a slash, ?query and #hash after it. */
export const siteHref = (href: string): string => withTrailingSlash(href);
