import fs from "node:fs";
import path from "node:path";
import { resolveBookshelfCover } from "../app/components/bookshelf/catalog.mjs";
import { BookshelfConfigError } from "../app/components/bookshelf/schema.mjs";

/**
 * Where a `books[].cover` value sits under `content/covers/`.
 * Full URLs are not local files. `/media/covers/…` is the published name of a file in that directory.
 * Returns null when there is nothing to copy.
 */
export function bookshelfJacketSource(cover) {
  const value = String(cover ?? "").trim();
  if (!value) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//iu.test(value) || value.startsWith("data:")) return null;
  if (value.startsWith("/")) {
    const marker = "/media/covers/";
    const index = value.indexOf(marker);
    if (index < 0) return null;
    return safeCoverRelative(decodeURIComponent(value.slice(index + marker.length)).split(/[?#]/u)[0], value);
  }
  let relative = value.replace(/^\.\//u, "").replaceAll("\\", "/").split(/[?#]/u)[0];
  if (relative.startsWith("covers/")) relative = relative.slice("covers/".length);
  return safeCoverRelative(relative, value);
}

function safeCoverRelative(relative, original) {
  if (!relative || relative.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new BookshelfConfigError("cover", `书衣 ${original} 必须是 content/covers 下的文件。`);
  }
  return relative;
}

/**
 * Copy every local book jacket into `public/media/covers/`, including filenames
 * that no post front matter mentions. Bytes are copied as stored (white borders
 * are cropped in the file itself, not here).
 */
export function publishBookshelfJackets(config, { coversDir, mediaDir }) {
  const copied = [];
  for (const shelf of config.shelves ?? []) {
    for (const book of shelf.books ?? []) {
      if (!book.cover) continue;
      const sourceRel = bookshelfJacketSource(book.cover);
      if (!sourceRel) continue;
      const published = resolveBookshelfCover(book.cover, book.id);
      if (!published?.startsWith("/media/covers/")) continue;
      const publicRel = decodeURIComponent(published.slice("/media/covers/".length)).split(/[?#]/u)[0];
      const source = path.join(coversDir, ...sourceRel.split("/"));
      const destination = path.join(mediaDir, ...publicRel.split("/"));
      if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
        throw new BookshelfConfigError(
          "cover",
          `content/covers 里没有书衣 ${sourceRel}。bookshelf.yaml 的 cover 会原样复制到 /media/covers/。`,
        );
      }
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      copied.push(publicRel);
    }
  }
  return copied;
}
