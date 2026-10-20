/**
 * The <html lang> of a page, plus 404 language resolution for missing
 * /garden/en/* routes. The root layout is shared by every route and is
 * rendered once with the site language; the English handbook (/garden/en/)
 * gets lang="en" here: in the worker response and in the static export.
 */
const EN_HANDBOOK = /(^|\/)garden\/en(\/|$)/u;

/**
 * Strip a configured basePath (e.g. "/garden-docs-v6") from the front of a
 * browser pathname. Returns a leading-slash pathname.
 */
export function stripConfiguredBasePath(pathname, basePath = "") {
  const raw = `/${String(pathname ?? "").replace(/^\/+/u, "")}`;
  const base = String(basePath ?? "").replace(/\/+$/u, "").replace(/^\/+/u, "");
  if (!base) return raw;
  const prefix = `/${base}`;
  if (raw === prefix) return "/";
  if (raw.startsWith(`${prefix}/`)) return raw.slice(prefix.length);
  return raw;
}

/**
 * Normalize a browser or router pathname to an in-app route by stripping a
 * configured basePath or a leading deployment prefix before /garden.
 */
export function inAppPath(pathname, basePath = "") {
  if (!pathname) return "/";
  const stripped = stripConfiguredBasePath(pathname, basePath);
  const gardenMatch = /^\/[^/]+(\/garden(?:\/.*)?)$/u.exec(stripped);
  if (gardenMatch) return gardenMatch[1];
  return stripped;
}

/** True when pathname (with or without a basePath) is under /garden. */
export function isHandbookPath(pathname, basePath = "") {
  const p = inAppPath(pathname, basePath);
  return p === "/garden" || p.startsWith("/garden/");
}

/**
 * Pick the 404 page language ("en" or "zh") from a pathname after stripping
 * the configured basePath. If the stripped path starts with /garden/en/ (or
 * equals /garden/en), returns "en"; otherwise returns "zh".
 */
export function pickNotFoundLang(pathname, basePath = "") {
  const stripped = stripConfiguredBasePath(pathname, basePath);
  return /^\/garden\/en(\/|$)/u.test(stripped) ? "en" : "zh";
}

/** "en" for an English handbook path (with or without a basePath in front), else null. */
export function handbookHtmlLang(pathname) {
  return EN_HANDBOOK.test(String(pathname ?? "").replace(/^\/+/u, "")) ? "en" : null;
}

/** Sets the lang attribute of the first <html> tag. */
export function withHtmlLang(html, lang) {
  return String(html).replace(/<html\b([^>]*?)\slang="[^"]*"/u, `<html$1 lang="${lang}"`);
}

function replaceMetaContent(html, attrName, attrValue, nextContent) {
  const escapedVal = attrValue.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const forwardRe = new RegExp(`(<meta\\b[^>]*\\b${attrName}="${escapedVal}"[^>]*\\bcontent=")[^"]*(")`, "gu");
  const reverseRe = new RegExp(`(<meta\\b[^>]*\\bcontent=")[^"]*("[^>]*\\b${attrName}="${escapedVal}")`, "gu");
  return html.replace(forwardRe, `$1${nextContent}$2`).replace(reverseRe, `$1${nextContent}$2`);
}

/**
 * Updates <html lang="en"> and <head> metadata on a server-rendered English 404
 * response so the initial HTTP response has English <title> and <meta> tags.
 */
export function withEnglishNotFoundHead(html) {
  let out = withHtmlLang(String(html), "en");
  const titleMatch = /<title>([^<]*)<\/title>/u.exec(out);
  const siteName = titleMatch ? titleMatch[1].split(" · ").at(-1)?.trim() || "Garden" : "Garden";
  const enTitle = `Page not found · ${siteName}`;
  const enDesc = "The address may be wrong, or the page has moved.";

  out = out.replace(/<title>[^<]*<\/title>/u, `<title>${enTitle}</title>`);
  out = replaceMetaContent(out, "name", "description", enDesc);
  out = replaceMetaContent(out, "property", "og:title", enTitle);
  out = replaceMetaContent(out, "property", "og:description", enDesc);
  out = replaceMetaContent(out, "property", "og:locale", "en_US");
  out = replaceMetaContent(out, "property", "og:image:alt", enTitle);
  out = replaceMetaContent(out, "name", "twitter:title", enTitle);
  out = replaceMetaContent(out, "name", "twitter:description", enDesc);
  return out;
}
