/**
 * Article address for a shelf click that should leave the page.
 *
 * A single note with an article address returns that post. Two or more notes
 * return null: the shelf flies onto the hub instead of assigning a URL.
 * A book with no article address also returns null and opens its in-page note.
 */
export type ShelfLeave = { readonly kind: "article"; readonly href: string };

type ShelfPost = { href?: string | null };

export type ShelfOpenBook = {
  filler?: unknown;
  posts?: readonly ShelfPost[] | null;
  hub?: string | null;
  href?: string | null;
};

function trimmed(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function singlePostHref(posts: readonly ShelfPost[]) {
  const entry = posts[0];
  if (!entry) return "";
  return trimmed(entry.href);
}

/** Article URL for a shelf click. `null` means stay on the shelf (hub flight or in-page note). */
export function shelfLeaveHref(book: ShelfOpenBook | null | undefined): ShelfLeave | null {
  if (!book || book.filler) return null;
  const posts = Array.isArray(book.posts) ? book.posts : [];
  if (posts.length >= 2) return null;
  const href = trimmed(book.href) || singlePostHref(posts);
  if (!href) return null;
  return { kind: "article", href };
}
