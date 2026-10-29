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
  | "post"
  | "posts"
  | "sources";

export interface BookshelfConfigError extends Error {
  readonly code: BookshelfConfigCode;
}

/** Runtime class lives in `schema.mjs` so node tests and the site build share one instance. */
export const BookshelfConfigError = ConfigError as unknown as new (
  code: BookshelfConfigCode,
  message: string,
) => BookshelfConfigError;

/** `overview` is the reading note (总览). `excerpt` is the quotation note (摘抄). */
export type BookshelfNoteKind = "overview" | "excerpt";

/** One note bound to a volume. A string in yaml is shorthand for `{ path }`. */
export type BookshelfFilePost = {
  /** Path under `content/posts/`, without `.md`. */
  path: string;
  kind?: BookshelfNoteKind;
};

/** Outbound source on the book card. Rendered as a quiet chip, not a button. */
export type BookshelfFileSource = {
  label: string;
  href: string;
};

/**
 * One volume in `content/bookshelf.yaml`. One yaml entry is one spine.
 *
 * Covers stay on two paths:
 * - yaml `cover` is the book jacket (Douban). It is the only image for the
 *   shelf face, the open/close flyer, and the book-hub card.
 * - a post's front matter `cover` is that note's hero on the article page.
 *   Never copy a note hero into the jacket slot.
 * - omit yaml `cover` and the jacket falls back to the first note's cover.
 *
 * Notes:
 * - `post: path` is shorthand for `posts: [path]`.
 * - `posts` is the note list, in order. `kind: overview | excerpt` labels the
 *   hub card 总览 or 摘抄. A bare string is a path with no kind.
 * - when `posts` is set, `post` is optional. If both are set, `post` must be
 *   the same path as `posts[0]`. Otherwise the shelf is rejected.
 * - one note: the shelf opens that note as it does today (extract flyer, note,
 *   return flyer). There is no book hub.
 * - two or more notes: a spine click leaves the shelf for `/bookshelf/<id>`
 *   (本书). It does not open `posts[0]` and it does not play the flyer.
 *   The hub card is the locked book-multi layout: the jacket slot is 148px
 *   wide, the image fills that width, and the height follows the file's ratio.
 *   There is no plate behind the jacket. A Douban scan's white border is
 *   cropped in the jacket file before it is committed; the build copies that
 *   file into `/media/covers/` unchanged.
 *   「我的笔记」 lists the notes. A note card is an ordinary link to that
 *   article; article ↔ list does not play the flyer. The flyer runs only when
 *   a single-note book is extracted from the shelf and put back.
 * - `sources` are optional `{ label, href }` chips. The hub shows 豆瓣 and PDF
 *   only. The PDF chip carries the caption 「（仅分享，侵权删）」. No chapter list.
 * - `note` is Markdown used only when the book has no posts.
 * - `color` (`#rgb` or `#rrggbb`) is the spine cloth and the open-page palette.
 */
export type BookshelfFileBook = {
  id: string;
  title: string;
  author?: string;
  spine?: string;
  size?: BookshelfSize;
  /** Book jacket. File name under `content/covers/`, or a full URL. */
  cover?: string;
  color?: string;
  filler?: BookshelfFiller;
  /** Shorthand for a single note. Equal to `posts[0].path` after parsing. */
  post?: string;
  posts?: BookshelfFilePost[];
  sources?: BookshelfFileSource[];
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
