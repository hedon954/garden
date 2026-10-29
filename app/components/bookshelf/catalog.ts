import type { BookshelfNote, BookshelfShelf } from "./types";

/**
 * Site shelf ready for `<Bookshelf catalog notes />`.
 * The runtime lives in `catalog.mjs` (node tests and the page share it).
 * The package demo is not an input.
 *
 * A book's `cover` is the jacket. A post's `cover` on `BookshelfPostSource` is
 * that note's hero and is used as the jacket only when the yaml book omits
 * `cover`. Multi-note books set `hub` (`/bookshelf/<id>`) and do not fill `notes`.
 */
export type BookshelfMount = {
  title: string;
  description?: string;
  eyebrow?: string;
  catalog: BookshelfShelf[];
  notes: Record<string, BookshelfNote>;
};

/** A post the shelf can turn into a note. `path` is relative to `content/posts`, without `.md`. */
export type BookshelfPostSource = {
  path: string;
  title?: string;
  description?: string;
  cover?: string;
  content: string;
};
