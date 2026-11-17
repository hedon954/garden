import { formatInlineLink, replaceInlineLinks } from "./markdown-destination.mjs";

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/u;

function rewriteChunk(text, resolve) {
  const images = replaceInlineLinks(text, (link) => {
    if (!link.image) return undefined;
    const url = resolve(link.url);
    return url === link.url ? undefined : formatInlineLink(link, url);
  });
  return images.replace(/<(?:img|audio|video|source)\b[^>]*>/giu, (tag) =>
    tag.replace(/(\b(?:src|poster)=["'])([^"']+)(["'])/giu, (_raw, prefix, src, suffix) => `${prefix}${resolve(src)}${suffix}`),
  );
}

function rewriteNonCodeLineRange(text, resolve) {
  let result = "";
  let index = 0;
  const pattern = /(`+)[\s\S]*?(?<!`)\1(?!`)/gu;
  for (const match of text.matchAll(pattern)) {
    result += rewriteChunk(text.slice(index, match.index), resolve) + match[0];
    index = match.index + match[0].length;
  }
  return result + rewriteChunk(text.slice(index), resolve);
}

/**
 * One media-destination mapping for the build and authenticated body preview.
 * Skips literal code fences (except `garden` fences, whose islands may hold article media)
 * and inline code spans so documentation examples are never treated as missing files.
 */
export function rewriteArticleMedia(content, resolve) {
  const lines = String(content ?? "").split("\n");
  const out = [];
  let fence = null;
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    out.push(rewriteNonCodeLineRange(buffer.join("\n"), resolve));
    buffer = [];
  };

  for (const line of lines) {
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.marker[0]}{${fence.marker.length},}\\s*$`, "u").test(line)) {
        if (fence.isGarden) {
          out.push(rewriteChunk(fence.lines.join("\n"), resolve));
        } else {
          out.push(...fence.lines);
        }
        out.push(line);
        fence = null;
      } else {
        fence.lines.push(line);
      }
      continue;
    }
    const open = FENCE_OPEN.exec(line);
    if (open) {
      flush();
      const lang = open[2].trim().split(/\s+/u)[0]?.toLowerCase() ?? "";
      fence = { marker: open[1], isGarden: lang === "garden", lines: [] };
      out.push(line);
      continue;
    }
    buffer.push(line);
  }
  if (fence) {
    out.push(...fence.lines);
  }
  flush();
  return out.join("\n");
}
