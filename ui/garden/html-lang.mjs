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
 * Rewrites a rendered 404 HTML document into the English 404 page (head meta
 * tags, <html lang="en">, and visible chrome/body copy) without hardcoding any
 * site-owner values.
 */
export function toEnglishNotFoundHtml(html) {
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

  // Rewrite visible body/chrome strings when rendered from a Chinese site locale
  out = out
    .replace(/>跳到正文</gu, ">Skip to content<")
    .replace(/aria-label="站点导航"/gu, 'aria-label="Site navigation"')
    .replace(/aria-label="站点导航（移动端）"/gu, 'aria-label="Site navigation (mobile)"')
    .replace(/>文章</gu, ">Posts<")
    .replace(/>随想</gu, ">Thoughts<")
    .replace(/>专栏</gu, ">Columns<")
    .replace(/>标签</gu, ">Tags<")
    .replace(/>关于</gu, ">About<")
    .replace(/aria-label="搜索文章"/gu, 'aria-label="Search posts"')
    .replace(/>搜索</gu, ">Search<")
    .replace(/aria-label="切换到深色模式"/gu, 'aria-label="Switch to dark mode"')
    .replace(/aria-label="切换到浅色模式"/gu, 'aria-label="Switch to light mode"')
    .replace(/aria-label="打开菜单"/gu, 'aria-label="Open menu"')
    .replace(/aria-label="关闭菜单"/gu, 'aria-label="Close menu"')
    .replace(/>深色模式</gu, ">Dark mode<")
    .replace(
      /<main\b[^>]*\bid="garden-not-found"[^>]*>[\s\S]*?<\/main>/u,
      (mainHtml) =>
        mainHtml
          .replace(/<h1[^>]*>[\s\S]*?<\/h1>/u, "<h1>Page not found</h1>")
          .replace(
            /<p class="sh-deck"[^>]*>[\s\S]*?<\/p>/u,
            '<p class="sh-deck" data-not-found-deck="">The address may be wrong, or the page has moved.</p>',
          )
          .replace(
            /(<a\b[^>]*\bdata-not-found-home=""[^>]*>)[\s\S]*?(<\/a>)/u,
            "$1Back to home$2",
          ),
    )
    .replace(/>找不到这一页</gu, ">Page not found<")
    .replace(/>地址可能写错了，或者这篇已经不在了。</gu, ">The address may be wrong, or the page has moved.<")
    .replace(/>返回首页</gu, ">Back to home<")
    .replace(/<footer class="sh-footer">[\s\S]*?<\/footer>/u, (footer) =>
      footer.replace(
        /<p>[\s\S]*?<\/p>/u,
        '<p><span class="footer-framework">Built with <a href="https://github.com/hedon954/garden" target="_blank" rel="noreferrer">Garden</a></span></p>',
      ),
    );

  return out;
}

/**
 * Rewrites a rendered 404 HTML document into the full Chinese 404 copy when
 * loaded at a non-/garden/en/ path.
 */
export function toChineseNotFoundHtml(html) {
  return String(html).replace(
    /<main\b[^>]*\bid="garden-not-found"[^>]*>[\s\S]*?<\/main>/u,
    (mainHtml) =>
      mainHtml
        .replace(/<h1[^>]*>[\s\S]*?<\/h1>/u, "<h1>找不到这一页</h1>")
        .replace(
          /<p class="sh-deck"[^>]*>[\s\S]*?<\/p>/u,
          '<p class="sh-deck" data-not-found-deck="">地址可能写错了，或者这篇已经不在了。</p>',
        )
        .replace(
          /(<a\b[^>]*\bdata-not-found-home=""[^>]*>)[\s\S]*?(<\/a>)/u,
          "$1返回首页$2",
        ),
  );
}

/**
 * Simulates loading the single root 404.html at `pathname` (with optional
 * `basePath` override) and running its inline language-selection script.
 */
export function applyRoot404ForPath(html, pathname, basePath) {
  const rawHtml = String(html);
  const scriptBaseMatch = /data-not-found-script="[^"]*"[^>]*>[\s\S]*?var b=("[^"]*");/u.exec(rawHtml);
  const configuredBase =
    basePath !== undefined
      ? basePath
      : scriptBaseMatch
        ? JSON.parse(scriptBaseMatch[1])
        : "";
  const lang = pickNotFoundLang(pathname, configuredBase);
  return lang === "en" ? toEnglishNotFoundHtml(rawHtml) : toChineseNotFoundHtml(rawHtml);
}
