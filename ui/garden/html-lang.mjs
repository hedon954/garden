/**
 * The <html lang> of a page. The root layout is shared by every route and is
 * rendered once with the site language; the English handbook (/garden/en/)
 * gets lang="en" here: in the worker response and in the static export.
 */
const EN_HANDBOOK = /(^|\/)garden\/en(\/|$)/u;

/** "en" for an English handbook path (with or without a basePath in front), else null. */
export function handbookHtmlLang(pathname) {
  return EN_HANDBOOK.test(String(pathname ?? "").replace(/^\/+/u, "")) ? "en" : null;
}

/** Sets the lang attribute of the first <html> tag. */
export function withHtmlLang(html, lang) {
  return String(html).replace(/<html\b([^>]*?)\slang="[^"]*"/u, `<html$1 lang="${lang}"`);
}
