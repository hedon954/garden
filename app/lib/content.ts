import { markdownPlugins } from "./markdown-plugins";
import {
  columns,
  gardenDocs,
  gardenIndexDoc,
  gardenDocsEn,
  gardenIndexDocEn,
  posts,
  thoughts,
  type ContentEntry,
  type GardenDocEntry,
  type MediaItem,
} from "@garden/generated-content";
import GithubSlugger from "github-slugger";
import { canonicalSiteDate } from "../../scripts/site-date.mjs";
import { demoDateLabel } from "./a2-meta";
import { searchableText } from "../../ui/garden/search-index.mjs";
import { toString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { articleUsesHeadingNumbers, autoNumbersHeadings, splitHeadingNumber } from "./heading-number";
import { siteHref } from "./site-href";
import { siteLang, ui } from "./i18n";

export { columns, gardenDocs, gardenDocsEn, gardenIndexDoc, gardenIndexDocEn, posts, thoughts };
export type { ContentEntry, GardenDocEntry, MediaItem };

export const postHref = (post: Pick<ContentEntry, "path">) => siteHref(`/blog/${post.path}`);
export const gardenDocHref = (doc: Pick<GardenDocEntry, "path">) => siteHref(`/garden/${doc.path}`);
export const columnEntryPath = (entry: Pick<ContentEntry, "column" | "path">) => {
  const prefix = entry.column ? `${entry.column}/` : "";
  return prefix && entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : entry.path;
};
export const columnHref = (entry: Pick<ContentEntry, "column" | "path">) =>
  siteHref(`/columns/${entry.column}/${columnEntryPath(entry)}`);

/** The column a post belongs to (the first one, if it is listed in several). */
export const columnOfPost = (post: Pick<ContentEntry, "path">) => {
  const entry = columns.find((item) => item.path === post.path && item.column);
  return entry?.column ? { slug: entry.column, title: entry.columnTitle ?? entry.column } : undefined;
};
export const columnIndexHref = (slug: string) => siteHref(`/columns/#${slug}`);
export const thoughtHref = (slug: string) => siteHref(`/thoughts/${slug}`);

export const formatDate = (value: string, withTime = false) => {
  if (!withTime) return demoDateLabel(value, siteLang);
  const canonical = canonicalSiteDate(value) ?? value;
  const date = new Date(canonical);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(ui().dateLocale, {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/** An article that already writes its own heading numbers is not auto-numbered. */
export { articleUsesHeadingNumbers, autoNumbersHeadings };

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

/** Kept exactly as the author wrote it; see heading-number.ts. */
export { splitHeadingNumber };

/**
 * Parses the same Markdown heading text that ReactMarkdown sends to
 * rehype-slug. Every heading depth advances the slugger so headings outside
 * the H2-H5 TOC range cannot shift the IDs shown in the directory.
 * `no` follows the prototype: keep an author-written number, otherwise
 * auto-number h2/h3 only when the article has no numbered headings and its
 * front matter does not say `numbering: false`.
 */
export const extractHeadings = (markdown: string, { numbering }: { numbering?: boolean } = {}) => {
  const slugger = new GithubSlugger();
  const autoNumber = autoNumbersHeadings(markdown, numbering);
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
      } else if (autoNumber) {
        if (level === 2) { h2 += 1; h3 = 0; no = String(h2); }
        else { h3 += 1; no = h2 ? `${h2}.${h3}` : String(h3); }
      }
    }
    headings.push({ depth: level, text, id, ...(no ? { no } : {}) });
  });

  return headings;
};

const toSearchableText = (markdown: string) => searchableText(markdown);

export const estimateWordCount = (markdown: string) => {
  const text = toSearchableText(markdown);
  const hanCharacters = text.match(/[\u3400-\u9fff]/gu)?.length ?? 0;
  const otherWords = text
    .replace(/[\u3400-\u9fff]/gu, " ")
    .match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return hanCharacters + otherWords;
};

export const findPost = (path: string): ContentEntry | undefined =>
  posts.find((post) => post.path === path);

export const findThought = (slug: string): ContentEntry | undefined =>
  thoughts.find((thought) => thought.slug === slug);

export const findGardenDoc = (path: string): GardenDocEntry | undefined =>
  gardenDocs.find((doc) => doc.path === path);

/** Handbook pages and the overview of one language. */
export const handbookDocs = (lang: "zh" | "en") => (lang === "en" ? gardenDocsEn : gardenDocs);
export const handbookIndexDoc = (lang: "zh" | "en") => (lang === "en" ? gardenIndexDocEn : gardenIndexDoc);
/** Whether a handbook page (or "index") exists in a language. */
export const hasHandbookPage = (lang: "zh" | "en", path: string) =>
  path === "index" || path === "" ? Boolean(handbookIndexDoc(lang)) : handbookDocs(lang).some((doc) => doc.path === path);

export const findColumnEntry = (
  column: string,
  path: string,
): ContentEntry | undefined =>
  columns.find((entry) => entry.column === column && columnEntryPath(entry) === path);
