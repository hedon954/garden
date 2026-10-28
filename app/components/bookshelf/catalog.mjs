import { marked } from "marked";
import { BookshelfConfigError } from "./schema.mjs";

/**
 * Site shelf for `<Bookshelf catalog notes />`.
 * Built only from `content/bookshelf.yaml` and the posts it names.
 * The package demo is a separate path: this module never reads it.
 *
 * `post` is a `content/posts` path without `.md`. Its front matter description
 * leads the note HTML so the open book's right page is that summary.
 * A cover file name is published at `/media/covers/<file>` (same stem cleanup
 * as content sync). A full URL or a path starting with `/` is kept.
 */

const WIDGET_FENCE = /```(?:garden|ui-error|ui|intent|widget)(?:[ \t]+[^\n]*)?\r?\n[\s\S]*?```/gu;

export function resolveBookshelfCover(cover, where = "cover") {
  if (!cover?.trim()) return undefined;
  const value = cover.trim();
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//iu.test(value) || value.startsWith("/") || value.startsWith("data:")) {
    return value;
  }
  let relative = value.replace(/^\.\//u, "");
  if (relative.startsWith("covers/")) relative = relative.slice("covers/".length);
  const parts = relative.split("/");
  if (!relative || parts.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new BookshelfConfigError("cover", `${where} 的 cover 必须是文件名或完整 URL。`);
  }
  return `/media/covers/${parts.map(publishCoverSegment).join("/")}`;
}

/** `content/posts` path, without `.md`. Rejects anything that leaves that directory. */
export function normalizeBookshelfPostPath(value) {
  const relative = value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^(?:content\/)?posts\//u, "")
    .replace(/\.md$/u, "");
  if (
    !relative
    || relative.startsWith("/")
    || relative.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new BookshelfConfigError("post", `post「${value}」必须是 content/posts 下的路径，不带 .md。`);
  }
  return relative;
}

export function bookshelfMountFromFile(file, posts) {
  const byPath = new Map(posts.map((post) => [normalizeBookshelfPostPath(post.path), post]));
  const notes = {};
  const catalog = file.shelves.map((shelf) => ({
    id: shelf.id,
    name: shelf.name,
    books: shelf.books.map((book) => toCatalogBook(book, byPath, notes)),
  }));
  return {
    title: file.title,
    description: file.description,
    eyebrow: file.eyebrow,
    catalog,
    notes,
  };
}

function toCatalogBook(book, byPath, notes) {
  const post = book.post ? byPath.get(normalizeBookshelfPostPath(book.post)) : undefined;
  if (book.post && !post) {
    throw new BookshelfConfigError("post", `书架引用的博文 ${book.post} 没有读到。`);
  }
  const cover = resolveBookshelfCover(book.cover, book.id) ?? (post ? resolveBookshelfCover(post.cover, book.id) : undefined);
  const body = post
    ? renderNoteHtml(post.content, post.description)
    : book.note
      ? renderNoteHtml(book.note)
      : "";
  const note = body ? book.id : null;
  if (note) notes[book.id] = { title: book.title, body, summary: post?.description };
  return {
    id: book.id,
    title: book.title,
    author: book.author ?? "",
    spine: book.spine ?? book.title,
    size: book.size ?? (book.filler ? "thin" : "s-mid"),
    cover: cover ?? false,
    color: book.color,
    filler: book.filler,
    post: book.post ? normalizeBookshelfPostPath(book.post) : undefined,
    note,
  };
}

function renderNoteHtml(markdown, description) {
  const prose = markdown.replace(WIDGET_FENCE, "\n").trim();
  const parsed = prose ? marked.parse(prose, { async: false }).trim() : "";
  const summary = description?.trim();
  if (!summary || prose.includes(summary)) return parsed;
  return `<p>${escapeHtml(summary)}</p>${parsed ? `\n${parsed}` : ""}`;
}

function publishCoverSegment(segment, index, all) {
  const isFile = index === all.length - 1;
  if (!isFile) return encodeURIComponent(segment.replace(/[^\w\u3400-\u9fff.-]+/gu, "-"));
  const dot = segment.lastIndexOf(".");
  const ext = dot >= 0 ? segment.slice(dot).toLowerCase() : "";
  const stem = dot >= 0 ? segment.slice(0, dot) : segment;
  return encodeURIComponent(`${stem.replace(/[^\w\u3400-\u9fff.-]+/gu, "-")}${ext}`);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
