import type { BookshelfFiller, BookshelfSize } from "./model";

export type { BookshelfFiller, BookshelfSize };

/** `overview` prints as 总览 on the hub. `excerpt` prints as 摘抄. */
export type BookshelfNoteKind = "overview" | "excerpt";

/** One reading note on a volume. Order is the yaml order. */
export type BookshelfBookPost = {
  /** `content/posts` path without `.md`. */
  path: string;
  title: string;
  kind?: BookshelfNoteKind;
  /** Front matter description. The hub card summary. */
  summary?: string;
  date?: string;
  /** Same count the article page shows. */
  words?: number;
  /** Article address. The shelf page fills this. */
  href?: string;
};

/** Quiet source chip on the book hub (豆瓣, PDF). */
export type BookshelfSource = {
  label: string;
  href: string;
};

/**
 * One volume on the shelf.
 * `cover` is the book jacket only: shelf face, open/close flyer, and the hub card.
 * `cover: true` uses the package-demo jacket at `/covers/<id>.jpg`.
 * A string is a cover URL (`/media/covers/…` for a site shelf, or any absolute URL).
 * Falsy covers are text spines and are omitted in state A.
 * A note's own hero stays on the article page. It is never this field when yaml `cover` is set.
 * `color` is the spine cloth and the open-page palette. Sample it from the jacket.
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
  /**
   * Key into the notes map for a single-note book.
   * Null on a multi-note book: that book opens `/bookshelf/<id>` instead.
   */
  note?: string | null;
  /** Primary note path. Set only when the book has one note. */
  post?: string;
  /** Every note on this volume, primary first. */
  posts?: BookshelfBookPost[];
  /** `/bookshelf/<id>`. Set only when `posts` has two or more notes. */
  hub?: string;
  sources?: BookshelfSource[];
  /** Full-note address, shaped for this build. Set when `post` is set. */
  href?: string;
};

export type BookshelfShelf = {
  id: string;
  name: string;
  books: BookshelfBook[];
};

export type BookshelfNote = {
  title: string;
  body: string;
  /** The post's front matter description. The open book's right page. */
  summary?: string;
};

export type BookshelfProps = {
  /** Site shelf. Omit both `catalog` and `notes` for the package demo. */
  catalog?: BookshelfShelf[];
  notes?: Record<string, BookshelfNote>;
  /** Heading on the shelf. Omit for the package-demo title. */
  title?: string;
  /** Small line above the heading. Omit for the package-demo brand. */
  eyebrow?: string;
  /**
   * Site page: the shelf sits in the blog column. The package demo leaves this
   * unset and keeps its own full-viewport frame.
   */
  embedded?: boolean;
  /**
   * Open `/bookshelf/<id>` already on the hub, with the shelf parked under it
   * so the return flyer can run. A shelf click does not use this.
   */
  initialHub?: string;
};
