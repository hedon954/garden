import { formatInlineLink, replaceInlineLinks } from "./markdown-destination.mjs";

/** One media-destination mapping for the build and authenticated body preview. */
export function rewriteArticleMedia(content, resolve) {
  const images = replaceInlineLinks(content, link => {
    if (!link.image) return undefined;
    const url = resolve(link.url);
    return url === link.url ? undefined : formatInlineLink(link, url);
  });
  return images.replace(/<(?:img|audio|video|source)\b[^>]*>/giu, tag =>
    tag.replace(/(\b(?:src|poster)=["'])([^"']+)(["'])/giu, (_raw, prefix, src, suffix) => `${prefix}${resolve(src)}${suffix}`),
  );
}
