import type { BookshelfNote, BookshelfShelf } from "./types";

/**
 * Site shelf ready for `<Bookshelf catalog notes />`.
 * The runtime lives in `catalog.mjs` (node tests and the page share it).
 * The package demo is not an input.
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
