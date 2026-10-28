import type { BookshelfFiller, BookshelfSize } from "./model";

export type { BookshelfFiller, BookshelfSize };

/**
 * One volume on the shelf.
 * `cover: true` uses the approved jacket at `/covers/<id>.jpg`.
 * A string is a cover URL (Douban). Falsy covers are text spines and are omitted in state A.
 * `color` is the spine cloth. It should be sampled from the cover.
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
  catalog?: BookshelfShelf[];
  notes?: Record<string, BookshelfNote>;
};
