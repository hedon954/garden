export class BookshelfConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BookshelfConfigError";
    this.code = code;
  }
}

const SIZES = new Set(["thin", "s-short", "s-mid", "s-tall"]);

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

function parseBook(value, where, seen) {
  const book = record(value, "book", `${where} 必须是映射。`);
  const id = optionalString(book.id);
  const title = optionalString(book.title);
  if (!id || !title) throw new BookshelfConfigError("book", `${where} 需要 id 和 title。`);
  if (seen.has(id)) throw new BookshelfConfigError("duplicate-id", `${where} 的 id「${id}」重复。`);
  seen.add(id);
  return {
    id,
    title,
    author: optionalString(book.author),
    spine: optionalString(book.spine),
    size: parseSize(book.size, where),
    cover: optionalString(book.cover),
    color: optionalString(book.color),
    filler: parseFiller(book.filler, where),
    post: optionalString(book.post),
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
