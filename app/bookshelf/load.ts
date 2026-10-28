import type { BookshelfMount } from "../components/bookshelf/catalog";
import { bookshelfConfigPath as configPath, loadBookshelf as readShelf } from "./load.mjs";

export type { BookshelfMount };

export function bookshelfConfigPath(root?: string) {
  return configPath(root) as string;
}

/**
 * The site shelf, or null when `content/bookshelf.yaml` is absent.
 * Absent means the package demo. See `load.mjs` for the file contract.
 */
export function loadBookshelf(root?: string): BookshelfMount | null {
  return readShelf(root) as BookshelfMount | null;
}
