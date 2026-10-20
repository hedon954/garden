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
import { inlineLinkPattern } from "./markdown-destination.mjs";

const INLINE_LINK = inlineLinkPattern();

/** Plain text of a post body, as search and word counts see it. */
export function searchableText(markdown) {
  return contentToSearchText(markdown)
    .replace(/```[^\n]*\n([\s\S]*?)```/g, " $1 ")
    // Links and images leave their text; the address goes whole, even with
    // parentheses or in <…> (ui/garden/markdown-destination.mjs).
    .replace(INLINE_LINK, (...match) => ` ${match[2]} `)
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

const entryKey = (item) => item.sourcePath ?? item.path;
const columnKey = (item) => item.sourcePath ?? columnEntryPath(item);

/**
 * One search entry per piece of writing, as `{ item, record }`, in the order
 * the header lists them: posts, then column entries that are not also posts,
 * then thoughts. A post that sits in a column is listed once, at its /blog/
 * URL, with the column's title as its section; a post in no column has an
 * empty section. A column entry is only listed on its own when no post has
 * the same source (a column-only page).
 */
function searchEntries({ posts = [], columns = [], thoughts = [] }, { length = EXCERPT_LENGTH, lang = "zh" } = {}) {
  const defaultColumnSection = lang === "en" ? "Columns" : "专栏";
  const defaultThoughtSection = lang === "en" ? "Thoughts" : "随想";
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
  const postKeys = new Set(posts.map(entryKey));
  const columnOf = new Map();
  for (const item of columns) {
    const key = columnKey(item);
    if (postKeys.has(key) && !columnOf.has(key)) columnOf.set(key, item.columnTitle ?? defaultColumnSection);
  }
  return [
    ...posts.map((item) => ({ item, record: record(item, () => ({ section: columnOf.get(entryKey(item)) ?? "", path: `/blog/${item.path}` })) })),
    ...columns
      .filter((item) => !postKeys.has(columnKey(item)))
      .map((item) => ({ item, record: record(item, () => ({ section: item.columnTitle ?? defaultColumnSection, path: `/columns/${item.column}/${columnEntryPath(item)}` })) })),
    ...thoughts.map((item) => ({ item, record: record(item, (text) => ({ section: defaultThoughtSection, path: `/thoughts/${item.slug}`, description: excerpt(text, length) })) })),
  ];
}

/** The small index: one record per piece of writing (see searchEntries). */
export function buildSearchIndex(content, options) {
  return searchEntries(content, options).map(({ record }) => record);
}

/**
 * The full-text file: `{ hash, texts, docs }`, where docs is
 * `[[path, textIndex], ...]` in the small index's order. Identical bodies
 * are stored once.
 * The hash is of the contents, so the file name changes exactly when they do.
 */
export function buildFullIndex({ posts = [], columns = [], thoughts = [] }) {
  const texts = [];
  const seen = new Map();
  const docs = searchEntries({ posts, columns, thoughts }).map(({ item, record }) => {
    const text = fullText(item.content ?? "");
    if (!seen.has(text)) {
      seen.set(text, texts.length);
      texts.push(text);
    }
    return [record.path, seen.get(text)];
  });
  const hash = crypto.createHash("sha256").update(JSON.stringify([texts, docs])).digest("hex").slice(0, 10);
  return { hash, texts, docs, fileName: `search-full.${hash}.json`, json: JSON.stringify({ hash, texts, docs }) };
}

