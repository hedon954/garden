import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { gardenSiteRoot } from "../../scripts/garden-paths.mjs";
import { BookshelfConfigError, parseBookshelfConfig, type BookshelfFile } from "../components/bookshelf/schema";

export function bookshelfConfigPath(root = gardenSiteRoot()) {
  return path.join(root, "content", "bookshelf.yaml");
}

/** Site shelf, or null when the site has no `content/bookshelf.yaml`. */
export function loadBookshelf(): BookshelfFile | null {
  const file = bookshelfConfigPath();
  if (!fs.existsSync(file)) return null;
  let parsed: unknown;
  try {
    parsed = parseYaml(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "无法解析";
    throw new BookshelfConfigError("invalid-root", `content/bookshelf.yaml 无法解析：${detail}`);
  }
  return parseBookshelfConfig(parsed);
}
