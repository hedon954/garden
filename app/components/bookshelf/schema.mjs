export class BookshelfConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BookshelfConfigError";
    this.code = code;
  }
}

const SIZES = new Set(["thin", "s-short", "s-mid", "s-tall"]);
const NOTE_KINDS = new Set(["overview", "excerpt"]);

function record(value, code, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BookshelfConfigError(code, message);
  return value;
}

function optionalString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseFiller(value, where) {
  if (value == null || value === false) return undefined;
  if (value === true || value === "sand" || value === "cream") return value;
  throw new BookshelfConfigError("filler", `${where} 的 filler 只能是 true、sand 或 cream。`);
}

function parseSize(value, where) {
  if (value == null || value === "") return undefined;
  if (typeof value === "string" && SIZES.has(value)) return value;
  throw new BookshelfConfigError("size", `${where} 的 size 只能是 thin、s-short、s-mid 或 s-tall。`);
}

/** Same path identity as the shelf loader: drop content/posts and .md. */
function postKey(value) {
  return value.trim().replaceAll("\\", "/").replace(/^(?:content\/)?posts\//u, "").replace(/\.md$/u, "");
}

function parsePostEntry(item, where, index) {
  if (typeof item === "string") {
    const path = optionalString(item);
    if (!path) throw new BookshelfConfigError("posts", `${where} 的 posts[${index}] 必须是路径。`);
    return { path };
  }
  const entry = record(item, "posts", `${where} 的 posts[${index}] 必须是路径或映射。`);
  const path = optionalString(entry.path);
  if (!path) throw new BookshelfConfigError("posts", `${where} 的 posts[${index}] 需要 path。`);
  const kind = optionalString(entry.kind);
  if (kind && !NOTE_KINDS.has(kind)) {
    throw new BookshelfConfigError("posts", `${where} 的 posts[${index}] 的 kind 只能是 overview 或 excerpt。`);
  }
  return kind ? { path, kind } : { path };
}

/**
 * `post` is shorthand for one note. `posts` is the list.
 * When `posts` is set it is the list, and `post` may only repeat the first path.
 */
function parsePostList(book, where) {
  const single = optionalString(book.post);
  if (book.posts == null) {
    return single ? { post: single, posts: [{ path: single }] } : { post: undefined, posts: undefined };
  }
  if (!Array.isArray(book.posts)) {
    throw new BookshelfConfigError("posts", `${where} 的 posts 必须是路径数组。`);
  }
  const posts = book.posts.map((item, index) => parsePostEntry(item, where, index));
  if (posts.length === 0) throw new BookshelfConfigError("posts", `${where} 的 posts 不能为空。`);
  const seenPaths = new Set();
  for (const entry of posts) {
    const key = postKey(entry.path);
    if (seenPaths.has(key)) throw new BookshelfConfigError("posts", `${where} 的 posts 重复引用「${entry.path}」。`);
    seenPaths.add(key);
  }
  if (single && postKey(single) !== postKey(posts[0].path)) {
    throw new BookshelfConfigError("posts", `${where} 的 post 与 posts 的第一篇不是同一路径。多篇笔记只写 posts。`);
  }
  return { post: posts[0].path, posts };
}

function parseSources(value, where) {
  if (value == null) return undefined;
  if (!Array.isArray(value)) throw new BookshelfConfigError("sources", `${where} 的 sources 必须是数组。`);
  if (value.length === 0) return undefined;
  return value.map((item, index) => {
    const source = record(item, "sources", `${where} 的 sources[${index}] 必须是映射。`);
    const label = optionalString(source.label);
    const href = optionalString(source.href);
    if (!label || !href) {
      throw new BookshelfConfigError("sources", `${where} 的 sources[${index}] 需要 label 和 href。`);
    }
    if (!/^(?:https?:\/\/|\/\/|\/(?!\/))/iu.test(href)) {
      throw new BookshelfConfigError("sources", `${where} 的 sources[${index}] 只接受 http(s) 或以 / 开头的地址。`);
    }
    return { label, href };
  });
}

function parseBook(value, where, seen) {
  const book = record(value, "book", `${where} 必须是映射。`);
  const id = optionalString(book.id);
  const title = optionalString(book.title);
  if (!id || !title) throw new BookshelfConfigError("book", `${where} 需要 id 和 title。`);
  if (seen.has(id)) throw new BookshelfConfigError("duplicate-id", `${where} 的 id「${id}」重复。`);
  seen.add(id);
  const notes = parsePostList(book, where);
  return {
    id,
    title,
    author: optionalString(book.author),
    spine: optionalString(book.spine),
    size: parseSize(book.size, where),
    cover: optionalString(book.cover),
    color: optionalString(book.color),
    filler: parseFiller(book.filler, where),
    post: notes.post,
    posts: notes.posts,
    sources: parseSources(book.sources, where),
    note: typeof book.note === "string" && book.note.trim() ? book.note.trim() : undefined,
  };
}

function parseShelf(value, index, seen) {
  const where = `shelves[${index}]`;
  const shelf = record(value, "shelf", `${where} 必须是映射。`);
  const id = optionalString(shelf.id);
  const name = optionalString(shelf.name);
  if (!id || !name) throw new BookshelfConfigError("shelf", `${where} 需要 id 和 name。`);
  if (!Array.isArray(shelf.books) || shelf.books.length === 0) {
    throw new BookshelfConfigError("shelf", `${where} 的 books 必须是非空数组。`);
  }
  return {
    id,
    name,
    books: shelf.books.map((book, bookIndex) => parseBook(book, `${where}.books[${bookIndex}]`, seen)),
  };
}

/** Validate `content/bookshelf.yaml`. Throws `BookshelfConfigError` with a stable `code`. */
export function parseBookshelfConfig(input) {
  const data = record(input, "invalid-root", "content/bookshelf.yaml 必须是映射。");
  const title = optionalString(data.title);
  if (!title) throw new BookshelfConfigError("missing-title", "content/bookshelf.yaml 缺少 title。");
  if (!Array.isArray(data.shelves) || data.shelves.length === 0) {
    throw new BookshelfConfigError("shelves", "content/bookshelf.yaml 的 shelves 必须是非空数组。");
  }
  const seen = new Set();
  return {
    title,
    description: optionalString(data.description),
    eyebrow: optionalString(data.eyebrow),
    shelves: data.shelves.map((shelf, index) => parseShelf(shelf, index, seen)),
  };
}
