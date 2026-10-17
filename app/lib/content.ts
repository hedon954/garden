import { markdownPlugins } from "./markdown-plugins";
import {
  columns,
  posts,
  thoughts,
  type ContentEntry,
  type MediaItem,
} from "@garden/generated-content";
import GithubSlugger from "github-slugger";
import { canonicalSiteDate } from "../../scripts/site-date.mjs";
import { demoDateLabel } from "./a2-meta";
import { contentToSearchText } from "../../ui/core/transform.mjs";
import { toString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export { columns, posts, thoughts };
export type { ContentEntry, MediaItem };

export const postHref = (post: Pick<ContentEntry, "path">) => `/blog/${post.path}`;
export const columnEntryPath = (entry: Pick<ContentEntry, "column" | "path">) => {
  const prefix = entry.column ? `${entry.column}/` : "";
  return prefix && entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : entry.path;
};
export const columnHref = (entry: Pick<ContentEntry, "column" | "path">) =>
  `/columns/${entry.column}/${columnEntryPath(entry)}`;

export const formatDate = (value: string, withTime = false) => {
  if (!withTime) return demoDateLabel(value);
  const canonical = canonicalSiteDate(value) ?? value;
  const date = new Date(canonical);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const NUMBERED_ARTICLE = /^#{2,3}[ \t]+\d/m;

/** An article that already writes its own heading numbers is not auto-numbered. */
export const articleUsesHeadingNumbers = (markdown: string) => NUMBERED_ARTICLE.test(markdown);

/**
 * Prototype render: an article with no `##` treats `###` as the top section.
 * Display level is `depth - base + 2`, and anything past h3 stays an h4.
 */
export const articleHeadingBase = (markdown: string) => (/^##[ \t]/m.test(markdown) ? 2 : 3);

export const displayHeadingLevel = (depth: number, base: number) => {
  if (depth < 2 || depth > 4) return depth;
  const level = depth - base + 2;
  return level > 3 ? 4 : level;
};

/** Pull a leading `2.1` into the section marker and leave the heading sentence. */
export const splitHeadingNumber = (text: string) => {
  const match = /^(\d+(?:\.\d+)*)\.?[ \t]+([\s\S]+)$/u.exec(text.trim());
  return match ? { no: match[1], text: match[2] } : null;
};

/**
 * Parses the same Markdown heading text that ReactMarkdown sends to
 * rehype-slug. Every heading depth advances the slugger so headings outside
 * the H2-H5 TOC range cannot shift the IDs shown in the directory.
 * `no` follows the prototype: keep an author-written number, otherwise
 * auto-number h2/h3 only when the article has no numbered headings.
 */
export const extractHeadings = (markdown: string) => {
  const slugger = new GithubSlugger();
  const numbered = articleUsesHeadingNumbers(markdown);
  const base = articleHeadingBase(markdown);
  const headings: Array<{ depth: number; text: string; id: string; no?: string }> = [];
  const tree = unified().use(remarkParse).use(markdownPlugins).parse(markdown);
  let h2 = 0;
  let h3 = 0;

  visit(tree, "heading", (node) => {
    const raw = toString(node).trim();
    const id = slugger.slug(raw);
    if (!(raw && node.depth >= 2 && node.depth <= 5)) return;
    const level = displayHeadingLevel(node.depth, base);
    let text = raw;
    let no: string | undefined;
    if (level === 2 || level === 3) {
      const split = splitHeadingNumber(raw);
      if (split) {
        no = split.no;
        text = split.text;
        if (level === 2) { h2 += 1; h3 = 0; }
        else h3 += 1;
      } else if (!numbered) {
        if (level === 2) { h2 += 1; h3 = 0; no = String(h2); }
        else { h3 += 1; no = h2 ? `${h2}.${h3}` : String(h3); }
      }
    }
    headings.push({ depth: level, text, id, ...(no ? { no } : {}) });
  });

  return headings;
};

const toSearchableText = (markdown: string) =>
  contentToSearchText(markdown)
    .replace(/```[^\n]*\n([\s\S]*?)```/g, " $1 ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~`|[\]{}()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const estimateWordCount = (markdown: string) => {
  const text = toSearchableText(markdown);
  const hanCharacters = text.match(/[\u3400-\u9fff]/gu)?.length ?? 0;
  const otherWords = text
    .replace(/[\u3400-\u9fff]/gu, " ")
    .match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return hanCharacters + otherWords;
};

export const searchRecords = [
  ...posts.map((item) => ({
    title: item.title,
    description: item.description ?? "",
    topic: item.topic ?? "博文",
    path: postHref(item),
    content: toSearchableText(item.content),
  })),
  ...columns.map((item) => ({
    title: item.title,
    description: item.description ?? "",
    topic: item.columnTitle ?? "专栏",
    path: columnHref(item),
    content: toSearchableText(item.content),
  })),
  ...thoughts.map((item) => ({
    title: item.title,
    description: toSearchableText(item.content),
    topic: "随想",
    path: `/thoughts/${item.slug}`,
    content: toSearchableText(item.content),
  })),
];

export const topics = Array.from(
  new Set(posts.map((post) => post.topic).filter(Boolean)),
) as string[];

export const findPost = (path: string): ContentEntry | undefined =>
  posts.find((post) => post.path === path);

export const findThought = (slug: string): ContentEntry | undefined =>
  thoughts.find((thought) => thought.slug === slug);

export const findColumnEntry = (
  column: string,
  path: string,
): ContentEntry | undefined =>
  columns.find((entry) => entry.column === column && columnEntryPath(entry) === path);
