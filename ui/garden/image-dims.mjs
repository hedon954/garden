import { figureLayout } from "./enhance.mjs";

const decode = (value) => {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
};

/** The build-time size for an image src, whether or not the renderer percent-encoded it. */
export function lookupImageSize(sizes, src) {
  if (!src || !sizes) return null;
  const size = sizes[src] ?? sizes[decode(src)] ?? sizes[encodeURI(decode(src))];
  return size?.width > 0 && size?.height > 0 ? size : null;
}

/**
 * Attributes that give an article image its box before the file loads:
 * width and height (the browser takes the aspect ratio from them; CSS keeps
 * height:auto so it stays responsive) and an inline width matching what the
 * image would show once loaded. An author-written width wins and only gains
 * the matching height. Without a known size nothing is added.
 */
export function imageDimensions({ width, height } = {}, size) {
  if (!size) return {};
  const authoredWidth = Number(width) > 0 ? Number(width) : 0;
  const authoredHeight = Number(height) > 0 ? Number(height) : 0;
  // Author-written sizes are never replaced; only the missing side is filled in from the ratio.
  if (authoredWidth || authoredHeight) {
    const w = authoredWidth || Math.round((authoredHeight * size.width) / size.height);
    const h = authoredHeight || Math.round((authoredWidth * size.height) / size.width);
    return { width: w, height: h, "data-nw": size.width, "data-aw": w };
  }
  const { width: shown } = figureLayout({ naturalWidth: size.width });
  return {
    width: size.width,
    height: size.height,
    "data-nw": size.width,
    "data-bw": shown,
    style: { width: `${shown}px` },
  };
}
