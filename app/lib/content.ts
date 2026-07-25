import { columns, posts, thoughts, type ContentEntry } from "./generated-content";

export { columns, posts, thoughts };
export type { ContentEntry };

export const formatDate = (value: string, withTime = false) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));

export const slugifyHeading = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[“”‘’「」『』，。！？：；、（）【】《》]/g, "")
    .replace(/[^\w\u3400-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const extractHeadings = (markdown: string) =>
  markdown
    .split("\n")
    .map((line) => {
      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (!match) return null;
      const text = match[2].replace(/[*_`[\]]/g, "").trim();
      return {
        depth: match[1].length,
        text,
        id: slugifyHeading(text),
      };
    })
    .filter(Boolean) as Array<{ depth: number; text: string; id: string }>;

export const searchRecords = [
  ...posts.map((item) => ({
    title: item.title,
    description: item.description ?? "",
    topic: item.topic ?? "博文",
    path: `/blog/${item.slug}`,
    content: item.content,
  })),
  ...columns.map((item) => ({
    title: item.title,
    description: item.description ?? "",
    topic: item.columnTitle ?? "专栏",
    path: `/columns/${item.column}/${item.slug}`,
    content: item.content,
  })),
  ...thoughts.map((item) => ({
    title: item.title,
    description: item.content,
    topic: "随想",
    path: `/thoughts#${item.slug}`,
    content: item.content,
  })),
];

export const topics = Array.from(
  new Set(posts.map((post) => post.topic).filter(Boolean)),
) as string[];

export const findPost = (slug: string): ContentEntry | undefined =>
  posts.find((post) => post.slug === slug);

export const findColumnEntry = (
  column: string,
  slug: string,
): ContentEntry | undefined =>
  columns.find((entry) => entry.column === column && entry.slug === slug);
