import { siteLinks } from "@garden/site-config";
import { withTrailingSlash } from "../../ui/garden/site-href.mjs";

/**
 * Every address inside the site goes through here. Page paths follow Next's
 * trailingSlash (always on in a static export, TRAILING_SLASH=1 on a server);
 * ?query and #hash come after the path.
 */
export const siteHref = (href: string): string => withTrailingSlash(href, siteLinks?.trailingSlash === true);
