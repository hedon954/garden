/**
 * The <html lang> of a page, plus English 404 HTML rewriting for missing
 * /garden/en/* routes. The root layout is shared by every route and is
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
