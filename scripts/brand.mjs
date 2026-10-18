/**
 * The site's logo and icons, from `brand` in site.config.yaml:
 *
 *   brand:
 *     logo: brand/logo.svg          # SVG file in the site, shown before the name; false hides it
 *     favicon: /favicon.svg         # URL under public/
 *     appleTouchIcon: /apple-touch-icon.png
 *
 * The logo is inlined so it follows the text colour: draw it with
 * `stroke="currentColor"` or `fill="currentColor"`.
 */
import fs from "node:fs";
import path from "node:path";

// Garden's own mark: a leaf on an h, cropped to its strokes.
export const DEFAULT_LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 2 18 27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 27V10"/><path d="M10 10C10 5.5 13.5 3.5 18 3.5C18 7.5 15 10 10 10Z"/><path d="M10 19C10 15.5 12.5 13.5 15.5 13.5S21 15.5 21 19V27"/></svg>';

/** Keep only the `<svg>` element, without scripts, event handlers or external references. */
export function cleanSvg(markup) {
  const match = String(markup ?? "").match(/<svg\b[\s\S]*<\/svg>/iu);
  if (!match) return "";
  return match[0]
    .replace(/<!--[\s\S]*?-->/gu, "")
    .replace(/<(script|foreignObject)\b[\s\S]*?<\/\1>/giu, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/\s+(?:xlink:)?href\s*=\s*("[^"#][^"]*"|'[^'#][^']*')/giu, "")
    // The header sets the size; the file's own width and height would fight it.
    .replace(/^<svg\b([^>]*)>/iu, (whole, attrs) => `<svg${attrs.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/giu, "")} aria-hidden="true" focusable="false">`)
    .replace(/\s*\n\s*/gu, "");
}

const publicUrl = (value, basePath) => {
  const url = String(value);
  if (/^(https?:)?\/\//iu.test(url) || url.startsWith("data:")) return url;
  return `${basePath}${url.startsWith("/") ? url : `/${url}`}`;
};

export function resolveBrand(siteRoot, config = {}, basePath = "", warn = () => {}) {
  const brand = config?.brand ?? {};
  let logo = "";
  if (brand.logo !== false && brand.logo !== "none") {
    let markup = DEFAULT_LOGO;
    if (typeof brand.logo === "string" && brand.logo.trim()) {
      const resolved = path.resolve(siteRoot, brand.logo.replace(/^\//u, ""));
      if (!resolved.startsWith(path.resolve(siteRoot) + path.sep) || !fs.existsSync(resolved)) {
        warn(`brand.logo 找不到文件 ${brand.logo}，使用默认图标。`);
      } else {
        markup = fs.readFileSync(resolved, "utf8");
      }
    }
    logo = cleanSvg(markup);
    if (!logo) warn(`brand.logo 不是 SVG：${brand.logo}，不显示图标。`);
  }
  return {
    logo,
    favicon: publicUrl(brand.favicon || "/favicon.svg", basePath),
    appleTouchIcon: brand.appleTouchIcon === false ? "" : publicUrl(brand.appleTouchIcon || "/apple-touch-icon.png", basePath),
  };
}
