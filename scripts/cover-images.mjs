/**
 * Resized WebP copies of cover images, made at build time with `sharp` when
 * the site has it. Originals stay untouched; the copies go next to the
 * published original under public/media, with a content hash in the name so
 * they can be cached for a long time.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const COVER_WIDTHS = [480, 960, 1440];

export async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    return null;
  }
}

const RASTER = /\.(jpe?g|png|webp|avif|tiff?)$/iu;

/** Which widths to make: those below the original, plus the original width when it is under the largest. */
export function coverWidths(naturalWidth, widths = COVER_WIDTHS) {
  if (!naturalWidth) return [];
  const below = widths.filter((width) => width < naturalWidth);
  if (naturalWidth <= widths[widths.length - 1] && !below.includes(naturalWidth)) below.push(naturalWidth);
  return below;
}

/**
 * `{ src, srcset, width, height }` for one published cover, or null when it
 * cannot be resized (no sharp, not a raster image, unreadable file).
 */
export async function coverImageSet({ sharp, source, destination, url, widths = COVER_WIDTHS, quality = 78 }) {
  if (!sharp || !RASTER.test(source)) return null;
  try {
    const bytes = fs.readFileSync(source);
    const meta = await sharp(bytes).metadata();
    if (!meta.width || !meta.height) return null;
    // EXIF-rotated images swap their sides.
    const rotated = (meta.orientation ?? 1) >= 5;
    const width = rotated ? meta.height : meta.width;
    const height = rotated ? meta.width : meta.height;
    const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 8);
    const stem = path.basename(destination).replace(/\.[^.]+$/u, "");
    const urlDir = url.slice(0, url.lastIndexOf("/") + 1);
    const variants = [];
    for (const target of coverWidths(width, widths)) {
      const name = `${stem}.${hash}-${target}.webp`;
      const file = path.join(path.dirname(destination), name);
      if (!fs.existsSync(file)) {
        const out = await sharp(bytes).rotate().resize({ width: target, withoutEnlargement: true }).webp({ quality }).toBuffer();
        fs.writeFileSync(file, out);
      }
      variants.push({ width: target, url: `${urlDir}${encodeURIComponent(name)}` });
    }
    if (!variants.length) return null;
    const fallback = variants.find((variant) => variant.width >= 960) ?? variants[variants.length - 1];
    return {
      src: fallback.url,
      srcset: variants.map((variant) => `${variant.url} ${variant.width}w`).join(", "),
      width,
      height,
    };
  } catch {
    return null;
  }
}
