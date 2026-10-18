/**
 * The search index the header loads on demand: titles, sections, tags, dates
 * and short excerpts. Post bodies never ship to the browser.
 */
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
