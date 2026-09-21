import { markdownPlugins } from "./markdown-plugins";
import {
  columns,
  posts,
  thoughts,
  type ContentEntry,
  type MediaItem,
} from "@garden/generated-content";
import GithubSlugger from "github-slugger";
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

export const formatDate = (value: string, withTime = false) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));

/**
 * Parses the same Markdown heading text that ReactMarkdown sends to
 * rehype-slug. Every heading depth advances the slugger so headings outside
 * the H2-H5 TOC range cannot shift the IDs shown in the directory.
 */
export const extractHeadings = (markdown: string) => {
  const slugger = new GithubSlugger();
  const headings: Array<{ depth: number; text: string; id: string }> = [];
  const tree = unified().use(remarkParse).use(markdownPlugins).parse(markdown);

  visit(tree, "heading", (node) => {
    const text = toString(node).trim();
    const id = slugger.slug(text);
    if (text && node.depth >= 2 && node.depth <= 5) {
      headings.push({ depth: node.depth, text, id });
    }
  });

  return headings;
};

const toSearchableText = (markdown: string) =>
  markdown
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
