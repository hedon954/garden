/** Spine thickness. Fillers are `thin`; real books default to `s-mid`. */
export type BookshelfSize = "thin" | "s-short" | "s-mid" | "s-tall";

/** `sand` and `cream` are the light filler spines. `true` is sand. */
export type BookshelfFiller = boolean | "sand" | "cream";

export type ShelfRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function isFiller(book: { filler?: BookshelfFiller }): boolean {
  return Boolean(book.filler);
}
