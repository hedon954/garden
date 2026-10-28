import type { BookshelfFiller, BookshelfSize } from "./model";

export type BookshelfConfigCode =
  | "invalid-root"
  | "missing-title"
  | "shelves"
  | "shelf"
  | "book"
  | "duplicate-id"
  | "size"
  | "filler";

export class BookshelfConfigError extends Error {
  readonly code: BookshelfConfigCode;

  constructor(code: BookshelfConfigCode, message: string) {
    super(message);
    this.name = "BookshelfConfigError";
    this.code = code;
  }
}

export type BookshelfFileBook = {
  id: string;
  title: string;
  author?: string;
  spine?: string;
  size?: BookshelfSize;
  /** Douban or same-site cover URL. Absent → text placeholder. */
  cover?: string;
  /** Spine and cloth color. Sample this from the cover when you have one. */
  color?: string;
  filler?: BookshelfFiller;
  /** Path under content/posts, without `.md`. */
  post?: string;
  /** Markdown note used when `post` is absent. */
  note?: string;
};

export type BookshelfFileShelf = {
  id: string;
  name: string;
  books: BookshelfFileBook[];
};

export type BookshelfFile = {
  title: string;
  description?: string;
  eyebrow?: string;
  shelves: BookshelfFileShelf[];
};

const SIZES = new Set<BookshelfSize>(["thin", "s-short", "s-mid", "s-tall"]);

function record(value: unknown, code: BookshelfConfigCode, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BookshelfConfigError(code, message);
  return value as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseFiller(value: unknown, where: string): BookshelfFiller | undefined {
  if (value == null || value === false) return undefined;
  if (value === true || value === "sand" || value === "cream") return value;
  throw new BookshelfConfigError("filler", `${where} 的 filler 只能是 true、sand 或 cream。`);
}

function parseSize(value: unknown, where: string): BookshelfSize | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "string" && SIZES.has(value as BookshelfSize)) return value as BookshelfSize;
  throw new BookshelfConfigError("size", `${where} 的 size 只能是 thin、s-short、s-mid 或 s-tall。`);
}

function parseBook(value: unknown, where: string, seen: Set<string>): BookshelfFileBook {
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

function parseShelf(value: unknown, index: number, seen: Set<string>): BookshelfFileShelf {
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
export function parseBookshelfConfig(input: unknown): BookshelfFile {
  const data = record(input, "invalid-root", "content/bookshelf.yaml 必须是映射。");
  const title = optionalString(data.title);
  if (!title) throw new BookshelfConfigError("missing-title", "content/bookshelf.yaml 缺少 title。");
  if (!Array.isArray(data.shelves) || data.shelves.length === 0) {
    throw new BookshelfConfigError("shelves", "content/bookshelf.yaml 的 shelves 必须是非空数组。");
  }
  const seen = new Set<string>();
  return {
    title,
    description: optionalString(data.description),
    eyebrow: optionalString(data.eyebrow),
    shelves: data.shelves.map((shelf, index) => parseShelf(shelf, index, seen)),
  };
}
