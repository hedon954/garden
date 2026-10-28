import type { BookshelfFiller, BookshelfSize } from "./model";
import { BookshelfConfigError as ConfigError, parseBookshelfConfig as parseConfig } from "./schema.mjs";

export type BookshelfConfigCode =
  | "invalid-root"
  | "missing-title"
  | "shelves"
  | "shelf"
  | "book"
  | "duplicate-id"
  | "size"
  | "filler"
  | "cover"
  | "post";

export interface BookshelfConfigError extends Error {
  readonly code: BookshelfConfigCode;
}

/** Runtime class lives in `schema.mjs` so node tests and the site build share one instance. */
export const BookshelfConfigError = ConfigError as unknown as new (
  code: BookshelfConfigCode,
  message: string,
) => BookshelfConfigError;

/**
 * One volume in `content/bookshelf.yaml`.
 *
 * Site contract (what a blog drops in to replace the package demo):
 * - `post` is a path under `content/posts/`, without `.md`. The shelf renders that
 *   post as the open-book note (front matter `description` is the short summary).
 * - `cover` is either a full URL (`https://…`, `//…`, or a site path starting
 *   with `/`) or a file name. A file name is published at `/media/covers/<file>`,
 *   the same URL `content/covers/` gets when a post's `cover` names that file.
 *   Omit `cover` to reuse the post's own cover.
 * - `color` (`#rgb` or `#rrggbb`) is the spine cloth and the open-page palette.
 * - `note` is Markdown used only when `post` is absent.
 */
export type BookshelfFileBook = {
  id: string;
  title: string;
  author?: string;
  spine?: string;
  size?: BookshelfSize;
  cover?: string;
  color?: string;
  filler?: BookshelfFiller;
  post?: string;
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

/** Validate `content/bookshelf.yaml`. Throws `BookshelfConfigError` with a stable `code`. */
export function parseBookshelfConfig(input: unknown): BookshelfFile {
  return parseConfig(input) as BookshelfFile;
}
