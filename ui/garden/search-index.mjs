/**
 * Two search indexes, both plain JSON files next to the site, never part of
 * the page scripts:
 * - search-index.json: titles, sections, tags, dates and short excerpts,
 *   loaded when search is about to open;
 * - search-full.<hash>.json: the plain text of every body, fetched in the
 *   background after the page has loaded and kept in IndexedDB by hash.
 */
import crypto from "node:crypto";
import { contentToSearchText } from "../core/transform.mjs";

/** Plain text of a post body, as search and word counts see it. */
export function searchableText(markdown) {
  return contentToSearchText(markdown)
    .replace(/```[^\n]*\n([\s\S]*?)```/g, " $1 ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~`|[\]{}()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Code blocks longer than this many lines are left out of the full-text index. */
export const MAX_INDEXED_CODE_LINES = 4;

/**
 * Body text for full-text search: markdown, HTML and math blocks stripped,
 * short code blocks kept as words, long ones dropped.
 */
export function fullText(markdown) {
  // Widgets and snapshots become their captions first, so they are not mistaken for long code.
  const withoutLongCode = contentToSearchText(String(markdown ?? ""))
    .replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gmu, (block, _indent, _fence, body) =>
      body.split("\n").filter((line) => line.trim()).length > MAX_INDEXED_CODE_LINES ? "\n" : block)
    .replace(/^\$\$[\s\S]*?^\$\$[ \t]*$/gmu, "\n")
    // List and task markers, callout labels and footnote markers are not words.
    .replace(/^[ \t>]*(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/gmu, "")
    .replace(/\[![A-Za-z]+\][+-]?/gu, " ")
    .replace(/\[\^[^\]\s]+\]:?/gu, " ");
  // Underscores inside identifiers (snake_case) are part of the word, not emphasis.
  return searchableText(withoutLongCode.replace(/(?<=[\p{L}\p{N}])_(?=[\p{L}\p{N}])/gu, "\u0001"))
    .replaceAll("\u0001", "_")
    .replace(/!\[[^\]]*\]\[[^\]]*\]/gu, " ")
    .replace(/https?:\/\/\S+/gu, " ")
    .replace(/&[a-z]+;|&#\d+;/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export const EXCERPT_LENGTH = 240;

const excerpt = (text, length = EXCERPT_LENGTH) => {
  const chars = Array.from(text);
  return chars.length > length ? `${chars.slice(0, length).join("")}…` : text;
};

const columnEntryPath = (entry) =>
  entry.column && entry.path.startsWith(`${entry.column}/`) ? entry.path.slice(entry.column.length + 1) : entry.path;

/** Records in the same order the header has always listed them: posts, column entries, thoughts. */
export function buildSearchIndex({ posts = [], columns = [], thoughts = [] }, { length = EXCERPT_LENGTH } = {}) {
  const record = (item, extra) => {
    const text = searchableText(item.content ?? "");
    return {
      title: item.title,
      description: item.description ?? "",
      date: item.date,
      tags: item.tags ?? [],
      content: excerpt(text, length),
      ...extra(text),
    };
  };
  return [
    ...posts.map((item) => record(item, () => ({ section: "文章", path: `/blog/${item.path}` }))),
    ...columns.map((item) => record(item, () => ({ section: item.columnTitle ?? "专栏", path: `/columns/${item.column}/${columnEntryPath(item)}` }))),
    ...thoughts.map((item) => record(item, (text) => ({ section: "随想", path: `/thoughts/${item.slug}`, description: excerpt(text, length) }))),
  ];
}

/**
 * The full-text file: `{ hash, texts, docs }`, where docs is
 * `[[path, textIndex], ...]` in the small index's order. A post that also
 * sits in a column has one body under two paths, so texts are stored once.
 * The hash is of the contents, so the file name changes exactly when they do.
 */
export function buildFullIndex({ posts = [], columns = [], thoughts = [] }) {
  const items = [...posts, ...columns, ...thoughts];
  const texts = [];
  const seen = new Map();
  const docs = buildSearchIndex({ posts, columns, thoughts }).map((record, index) => {
    const text = fullText(items[index].content ?? "");
    if (!seen.has(text)) {
      seen.set(text, texts.length);
      texts.push(text);
    }
    return [record.path, seen.get(text)];
  });
  const hash = crypto.createHash("sha256").update(JSON.stringify([texts, docs])).digest("hex").slice(0, 10);
  return { hash, texts, docs, fileName: `search-full.${hash}.json`, json: JSON.stringify({ hash, texts, docs }) };
}

