import type { BookshelfShelf } from "./types";

export const MID_W = 132;
export const MID_H = 198;

/** Places `fromRect` onto `toRect`. `extra` is the demo's rotateZ term. */
export function flipTransform(
  fromRect: { left: number; top: number; width: number; height: number },
  toRect: { left: number; top: number; width: number; height: number },
  extra = "",
): string {
  const sx = fromRect.width / toRect.width;
  const sy = fromRect.height / toRect.height;
  const tx = fromRect.left - toRect.left;
  const ty = fromRect.top - toRect.top;
  return `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})${extra ? " " + extra : ""}`;
}

/**
 * Page-level density from the approved demo.
 * If any row's covers cannot fit the text column, every row is spines.
 */
export function pageDensity(catalog: readonly Pick<BookshelfShelf, "books">[], viewportWidth: number): "covers" | "spines" {
  const col = Math.min(viewportWidth - 32, 740);
  const coverW = viewportWidth <= 640 ? 102 + 10 : 118 + 14;
  for (const cat of catalog) {
    const n = cat.books.filter((b) => b.cover).length;
    const need = n * coverW;
    if (need > col - 8) return "spines";
  }
  return "covers";
}
