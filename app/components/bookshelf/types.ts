import type { BookshelfFiller, BookshelfSize } from "./model";

export type { BookshelfFiller, BookshelfSize };

/**
 * One volume on the shelf.
 * `cover: true` uses the package-demo jacket at `/covers/<id>.jpg`.
 * A string is a cover URL (`/media/covers/…` for a site shelf, or any absolute URL).
 * Falsy covers are text spines and are omitted in state A.
 * `color` is the spine cloth and the open-page palette. Sample it from the cover.
 */
export type BookshelfBook = {
  id: string;
  title: string;
  author?: string;
  spine: string;
  size?: BookshelfSize;
  cover?: boolean | string;
  color?: string;
  filler?: BookshelfFiller;
  /** Key into the notes map. Null means the demo placeholder paragraph. */
  note?: string | null;
};

export type BookshelfShelf = {
  id: string;
  name: string;
  books: BookshelfBook[];
};

export type BookshelfNote = {
  title: string;
  body: string;
};

export type BookshelfProps = {
  /** Site shelf. Omit both `catalog` and `notes` for the package demo. */
  catalog?: BookshelfShelf[];
  notes?: Record<string, BookshelfNote>;
  /** Heading on the shelf. Omit for the package-demo title. */
  title?: string;
  /** Small line above the heading. Omit for the package-demo brand. */
  eyebrow?: string;
};
