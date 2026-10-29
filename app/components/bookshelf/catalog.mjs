import { marked } from "marked";
import { searchableText } from "../../../ui/garden/search-index.mjs";
import { BookshelfConfigError } from "./schema.mjs";

/**
 * Site shelf for `<Bookshelf catalog notes />`.
 * Built only from `content/bookshelf.yaml` and the posts it names.
 * The package demo is a separate path: this module never reads it.
 *
 * `post` is shorthand for one note. `posts` is the list. A single note's
 * article stays at `/blog/<path>`: the shelf navigates there. The rendered
 * note stays in `notes` for a book with no article address. Two or more notes
 * fly onto the hub at `/bookshelf/<id>`.
 *
 * The jacket is yaml `cover` only. A post cover is that note's hero and is
 * copied onto the book only when yaml `cover` is omitted, and then only from
 * the first note. A file name is published at `/media/covers/<file>`.
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

/** Book hub for a multi-note volume. One path segment, the book id. */
export function bookshelfHubPath(id) {
  if (typeof id !== "string" || !id || /[\\/]/.test(id) || id === "." || id === "..") {
    throw new BookshelfConfigError("book", `本书页的 id「${id ?? ""}」必须是单一路径段。`);
  }
  return `/bookshelf/${encodeURIComponent(id)}`;
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

function bookPostRefs(book) {
  if (Array.isArray(book.posts) && book.posts.length > 0) {
    return book.posts.map((entry) => (
      typeof entry === "string" ? { path: entry } : { path: entry?.path, kind: entry?.kind }
    ));
  }
  if (typeof book.post === "string" && book.post.trim()) return [{ path: book.post.trim() }];
  return [];
}

/** Same count the article page prints (`estimateWordCount`). */
function noteWordCount(markdown) {
  const text = searchableText(markdown ?? "");
  const han = text.match(/[\u3400-\u9fff]/gu)?.length ?? 0;
  const other = text.replace(/[\u3400-\u9fff]/gu, " ").match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return han + other;
}

/** Jacket: yaml cover when set. Otherwise the first note's cover, never a later note's. */
function jacketFor(book, primary) {
  if (book.cover) return resolveBookshelfCover(book.cover, book.id);
  if (primary?.cover) return resolveBookshelfCover(primary.cover, book.id);
  return undefined;
}

function toCatalogBook(book, byPath, notes) {
  const refs = bookPostRefs(book);
  const paths = refs.map((ref) => normalizeBookshelfPostPath(ref.path));
  const sources = paths.map((relative, index) => {
    const post = byPath.get(relative);
    if (!post) throw new BookshelfConfigError("post", `书架引用的博文 ${refs[index].path} 没有读到。`);
    return post;
  });
  const primary = sources[0];
  const multi = sources.length > 1;
  const cover = jacketFor(book, primary);
  // A multi-note book opens on the hub. Its note bodies stay on the article pages.
  const body = !multi && primary
    ? renderNoteHtml(primary.content, primary.description)
    : !multi && book.note
      ? renderNoteHtml(book.note)
      : "";
  const note = body ? book.id : null;
  if (note) notes[book.id] = { title: book.title, body, summary: primary?.description };
  const posts = sources.map((source, index) => {
    const words = noteWordCount(source.content);
    const title = (typeof source.title === "string" && source.title.trim()) || (index === 0 ? book.title : paths[index]);
    const summary = typeof source.description === "string" ? source.description.trim() : "";
    const date = typeof source.date === "string" ? source.date.trim() : "";
    return {
      path: paths[index],
      title,
      ...(refs[index].kind ? { kind: refs[index].kind } : {}),
      ...(summary ? { summary } : {}),
      ...(date ? { date } : {}),
      ...(words > 0 ? { words } : {}),
    };
  });
  return {
    id: book.id,
    title: book.title,
    author: book.author ?? "",
    spine: book.spine ?? book.title,
    size: book.size ?? (book.filler ? "thin" : "s-mid"),
    cover: cover ?? false,
    color: book.color,
    filler: book.filler,
    post: !multi && paths[0] ? paths[0] : undefined,
    posts: posts.length ? posts : undefined,
    hub: multi ? bookshelfHubPath(book.id) : undefined,
    sources: Array.isArray(book.sources) && book.sources.length ? book.sources : undefined,
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
