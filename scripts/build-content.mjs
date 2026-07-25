import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const root = process.cwd();
const contentRoot = path.join(root, "content");
const generatedMediaRoot = path.join(root, "public", "media");
const output = path.join(root, "app", "lib", "generated-content.ts");
const includeDrafts = process.env.CONTENT_INCLUDE_DRAFTS === "1";
const now = Date.now();
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/u, "");
const siteUrl = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com")
  .replace(/\/+$/u, "");
const publicBaseUrl = basePath && !siteUrl.endsWith(basePath)
  ? `${siteUrl}${basePath}`
  : siteUrl;
const siteName = process.env.SITE_NAME ?? "Hedon Log";
const siteDescription = process.env.SITE_DESCRIPTION ?? "一个以 Markdown 为内容源的个人博客。";

const fail = (sourcePath, message) => {
  throw new Error(`${sourcePath}: ${message}`);
};

const requireString = (data, key, sourcePath) => {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) {
    fail(sourcePath, `front matter 缺少有效的 ${key}`);
  }
  return value.trim();
};

const optionalString = (data, key, sourcePath) => {
  const value = data[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") fail(sourcePath, `${key} 必须是字符串`);
  return value.trim();
};

const normalizeDate = (value, key, sourcePath) => {
  const normalized = value instanceof Date ? value.toISOString() : value;
  if (
    typeof normalized !== "string" ||
    !normalized ||
    Number.isNaN(Date.parse(normalized))
  ) {
    fail(sourcePath, `${key} 必须是有效日期`);
  }
  return normalized;
};

const isExternalAsset = (value) =>
  /^(?:[a-z]+:)?\/\//i.test(value) ||
  value.startsWith("/") ||
  value.startsWith("data:") ||
  value.startsWith("#");

const assetCache = new Map();

function copyLocalAsset(value, markdownPath, sourcePath) {
  if (!value || isExternalAsset(value)) return value;

  const [assetPath, suffix = ""] = value.split(/(?=[?#])/u, 2);
  const decodedPath = decodeURIComponent(assetPath.replace(/^<|>$/g, ""));
  const absoluteSource = path.resolve(path.dirname(markdownPath), decodedPath);
  const relativeSource = path.relative(contentRoot, absoluteSource);

  if (
    relativeSource.startsWith("..") ||
    path.isAbsolute(relativeSource) ||
    !fs.existsSync(absoluteSource) ||
    !fs.statSync(absoluteSource).isFile()
  ) {
    fail(sourcePath, `找不到本地媒体文件 ${value}`);
  }

  if (!assetCache.has(absoluteSource)) {
    const extension = path.extname(relativeSource);
    const stem = relativeSource.slice(0, Math.max(0, relativeSource.length - extension.length));
    const safeRelative = `${stem
      .split(path.sep)
      .map((segment) => segment.replace(/[^\w\u3400-\u9fff.-]+/gu, "-"))
      .join(path.sep)}${extension.toLowerCase()}`;
    const destination = path.join(generatedMediaRoot, safeRelative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(absoluteSource, destination);
    assetCache.set(
      absoluteSource,
      `${basePath}/media/${safeRelative.split(path.sep).map(encodeURIComponent).join("/")}`,
    );
  }

  return `${assetCache.get(absoluteSource)}${suffix}`;
}

function rewriteMarkdownAssets(content, markdownPath, sourcePath) {
  const markdownImages = content.replace(
    /(!\[[^\]]*\]\()<?([^)\s>]+)>?((?:\s+["'][^"']*["'])?\))/gu,
    (_, prefix, src, suffix) =>
      `${prefix}${copyLocalAsset(src, markdownPath, sourcePath)}${suffix}`,
  );

  return markdownImages.replace(
    /(<(?:img|audio|video|source)\b[^>]*\bsrc=["'])([^"']+)(["'])/giu,
    (_, prefix, src, suffix) =>
      `${prefix}${copyLocalAsset(src, markdownPath, sourcePath)}${suffix}`,
  );
}

function normalizeMedia(media, markdownPath, sourcePath) {
  if (media === undefined || media === null) return undefined;
  if (typeof media === "string") {
    return copyLocalAsset(media, markdownPath, sourcePath);
  }
  if (!Array.isArray(media)) fail(sourcePath, "media 必须是字符串或附件数组");

  return media.map((item, index) => {
    if (!item || typeof item !== "object") {
      fail(sourcePath, `media[${index}] 必须是对象`);
    }
    if (!["image", "audio", "video", "link"].includes(item.type)) {
      fail(sourcePath, `media[${index}].type 不受支持`);
    }
    if (typeof item.src !== "string" || !item.src.trim()) {
      fail(sourcePath, `media[${index}].src 不能为空`);
    }
    if (item.type === "link") {
      try {
        new URL(item.src);
      } catch {
        fail(sourcePath, `media[${index}].src 必须是完整链接`);
      }
    }
    return {
      ...item,
      src:
        item.type === "link"
          ? item.src
          : copyLocalAsset(item.src, markdownPath, sourcePath),
      poster: item.poster
        ? copyLocalAsset(item.poster, markdownPath, sourcePath)
        : undefined,
    };
  });
}

function validateAndNormalize(data, content, markdownPath, kind, sourcePath) {
  const title = requireString(data, "title", sourcePath);
  const slug = optionalString(data, "slug", sourcePath) ?? path.basename(markdownPath, ".md");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    fail(sourcePath, "slug 只能包含小写字母、数字和连字符");
  }

  const date = normalizeDate(data.date, "date", sourcePath);
  const updated = data.updated
    ? normalizeDate(data.updated, "updated", sourcePath)
    : undefined;
  const publishAt = data.publishAt
    ? normalizeDate(data.publishAt, "publishAt", sourcePath)
    : undefined;
  if (data.tags && !Array.isArray(data.tags)) fail(sourcePath, "tags 必须是数组");
  if (data.pinned !== undefined && typeof data.pinned !== "boolean") {
    fail(sourcePath, "pinned 必须是布尔值");
  }
  if (data.draft !== undefined && typeof data.draft !== "boolean") {
    fail(sourcePath, "draft 必须是布尔值");
  }

  if (kind === "post") {
    requireString(data, "description", sourcePath);
    requireString(data, "topic", sourcePath);
  }
  if (kind === "column") {
    requireString(data, "description", sourcePath);
    requireString(data, "column", sourcePath);
    requireString(data, "columnTitle", sourcePath);
    if (!Number.isInteger(data.order) || data.order < 1) {
      fail(sourcePath, "专栏文章 order 必须是大于 0 的整数");
    }
  }
  if (kind === "thought" && data.mediaType) {
    if (!["image", "audio", "video", "link", "text"].includes(data.mediaType)) {
      fail(sourcePath, "mediaType 不受支持");
    }
  }

  const publishTime = Date.parse(publishAt ?? date);
  if (!includeDrafts && (data.draft === true || publishTime > now)) return null;

  return {
    ...data,
    title,
    slug,
    date,
    updated,
    publishAt,
    kind,
    draft: Boolean(data.draft),
    sourcePath,
    cover: data.cover
      ? copyLocalAsset(data.cover, markdownPath, sourcePath)
      : undefined,
    columnCover: data.columnCover
      ? copyLocalAsset(data.columnCover, markdownPath, sourcePath)
      : undefined,
    poster: data.poster
      ? copyLocalAsset(data.poster, markdownPath, sourcePath)
      : undefined,
    media: normalizeMedia(data.media, markdownPath, sourcePath),
    content: rewriteMarkdownAssets(content.trim(), markdownPath, sourcePath),
  };
}

function readMarkdownTree(directory, kind) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readMarkdownTree(fullPath, kind);
    if (!entry.name.endsWith(".md")) return [];

    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(raw);
    const sourcePath = path.relative(contentRoot, fullPath);
    const normalized = validateAndNormalize(
      parsed.data,
      parsed.content,
      fullPath,
      kind,
      sourcePath,
    );
    return normalized ? [normalized] : [];
  });
}

function assertUnique(items, keyFor, label) {
  const seen = new Map();
  for (const item of items) {
    const key = keyFor(item);
    const previous = seen.get(key);
    if (previous) {
      throw new Error(`${label} "${key}" 重复：${previous} 与 ${item.sourcePath}`);
    }
    seen.set(key, item.sourcePath);
  }
}

fs.rmSync(generatedMediaRoot, { recursive: true, force: true });

const posts = readMarkdownTree(path.join(contentRoot, "posts"), "post").sort(
  (a, b) => Date.parse(b.date) - Date.parse(a.date),
);
const columns = readMarkdownTree(path.join(contentRoot, "columns"), "column").sort(
  (a, b) => (a.column === b.column ? a.order - b.order : a.column.localeCompare(b.column)),
);
const thoughts = readMarkdownTree(path.join(contentRoot, "thoughts"), "thought").sort(
  (a, b) => Date.parse(b.date) - Date.parse(a.date),
);

assertUnique(posts, (item) => item.slug, "博文 slug");
assertUnique(columns, (item) => `${item.column}/${item.slug}`, "专栏路径");
assertUnique(
  columns,
  (item) => `${item.column}/${item.order}`,
  "专栏文章顺序",
);
assertUnique(thoughts, (item) => item.slug, "随想 slug");

const contentHash = crypto
  .createHash("sha256")
  .update(JSON.stringify({ posts, columns, thoughts }))
  .digest("hex")
  .slice(0, 12);

const source = `// Generated by scripts/build-content.mjs. Edit files in content/ instead.
export type MediaItem = {
  type: "image" | "audio" | "video" | "link";
  src: string;
  alt?: string;
  poster?: string;
  mime?: string;
  title?: string;
  description?: string;
};

export type ContentEntry = {
  title: string;
  slug: string;
  description?: string;
  date: string;
  updated?: string;
  publishAt?: string;
  draft?: boolean;
  topic?: string;
  tags?: string[];
  pinned?: boolean;
  readingTime?: string;
  kind: "post" | "column" | "thought";
  sourcePath: string;
  content: string;
  column?: string;
  columnTitle?: string;
  columnDescription?: string;
  columnStatus?: string;
  columnCover?: string;
  order?: number;
  cover?: string;
  coverAlt?: string;
  mediaType?: "image" | "audio" | "video" | "link" | "text";
  media?: string | MediaItem[];
  mediaAlt?: string;
  poster?: string;
  linkTitle?: string;
  linkDescription?: string;
};

export const contentHash = "${contentHash}";
export const posts = ${JSON.stringify(posts, null, 2)} as ContentEntry[];
export const columns = ${JSON.stringify(columns, null, 2)} as ContentEntry[];
export const thoughts = ${JSON.stringify(thoughts, null, 2)} as ContentEntry[];
`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, source);

const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const cdata = (value) => value.replaceAll("]]>", "]]]]><![CDATA[>");
const publicRoot = path.join(root, "public");
const feedEntries = [
  ...posts.map((entry) => ({ ...entry, path: `/blog/${entry.slug}/` })),
  ...columns.map((entry) => ({ ...entry, path: `/columns/${entry.column}/${entry.slug}/` })),
  ...thoughts.map((entry) => ({ ...entry, path: `/thoughts/${entry.slug}/` })),
].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
const rssItems = feedEntries.map((entry) => `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(`${publicBaseUrl}${entry.path}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${publicBaseUrl}${entry.path}`)}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description>${escapeXml(entry.description ?? entry.content.replace(/\s+/gu, " ").slice(0, 180))}</description>
      ${(entry.tags ?? []).map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}
      <content:encoded><![CDATA[${cdata(marked.parse(entry.content))}]]></content:encoded>
    </item>`).join("");
fs.writeFileSync(path.join(publicRoot, "rss.xml"), `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(publicBaseUrl)}</link>
    <atom:link href="${escapeXml(`${publicBaseUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${rssItems}
  </channel>
</rss>
`);
const sitemapEntries = [
  "/", "/blog/", "/thoughts/", "/columns/", "/about/",
  ...posts.map((entry) => `/blog/${entry.slug}/`),
  ...columns.map((entry) => `/columns/${entry.column}/${entry.slug}/`),
  ...thoughts.map((entry) => `/thoughts/${entry.slug}/`),
];
fs.writeFileSync(path.join(publicRoot, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.map((entry) => `
  <url><loc>${escapeXml(`${publicBaseUrl}${entry}`)}</loc></url>`).join("")}
</urlset>
`);
fs.writeFileSync(path.join(publicRoot, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${publicBaseUrl}/sitemap.xml\n`);
console.log(
  `Synced ${posts.length} posts, ${columns.length} column entries, and ${thoughts.length} thoughts (${contentHash}).`,
);
