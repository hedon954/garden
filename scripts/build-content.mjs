import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { canonicalSiteDate } from "./site-date.mjs";

function resolveSiteRoot() {
  if (process.env.GARDEN_SITE) return path.resolve(process.env.GARDEN_SITE);
  const yaml = path.join(process.cwd(), "site.config.yaml");
  if (fs.existsSync(yaml)) return path.dirname(fs.realpathSync(yaml));
  return process.cwd();
}

const root = resolveSiteRoot();
const contentRoot = path.join(root, "content");
const siteConfigPath = path.join(root, "site.config.yaml");
const columnsConfigPath = path.join(contentRoot, "columns.yaml");
const siteConfig = parseYaml(fs.readFileSync(siteConfigPath, "utf8"));
const generatedMediaRoot = path.join(root, "public", "media");
const gardenDir = path.join(root, ".garden");
const output = path.join(gardenDir, "generated-content.ts");
const siteConfigOutput = path.join(gardenDir, "site-config.ts");
const includeDrafts = process.env.CONTENT_INCLUDE_DRAFTS === "1";
const now = Date.now();
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/u, "");
const siteUrl = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com")
  .replace(/\/+$/u, "");
const publicBaseUrl = basePath && !siteUrl.endsWith(basePath)
  ? `${siteUrl}${basePath}`
  : siteUrl;
const siteName = process.env.SITE_NAME ?? siteConfig.name;
const siteDescription = process.env.SITE_DESCRIPTION ?? siteConfig.description;

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
  const canonical = canonicalSiteDate(value);
  if (!canonical) {
    fail(sourcePath, `${key} 必须是有效日期，例如 2026-09-18 14:39:00`);
  }
  return canonical;
};

const normalizeReferences = (value, sourcePath) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail(sourcePath, "references 必须是数组");
  const references = value.map((item, index) => {
    const where = `references[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail(sourcePath, `${where} 必须是包含 title 的对象`);
    }
    for (const key of Object.keys(item)) {
      if (key !== "title" && key !== "url") {
        fail(sourcePath, `${where} 不支持 ${key}`);
      }
    }
    if (typeof item.title !== "string" || !item.title.trim()) {
      fail(sourcePath, `${where} 缺少有效的 title`);
    }
    const title = item.title.trim();
    if (item.url === undefined || item.url === null || item.url === "") {
      return { title };
    }
    if (typeof item.url !== "string") fail(sourcePath, `${where}.url 必须是字符串`);
    const url = item.url.trim();
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      fail(sourcePath, `${where}.url 必须是 http 或 https 链接`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      fail(sourcePath, `${where}.url 必须是 http 或 https 链接`);
    }
    return { title, url };
  });
  return references.length ? references : undefined;
};

const isExternalAsset = (value) =>
  /^(?:[a-z]+:)?\/\//i.test(value) ||
  value.startsWith("/") ||
  value.startsWith("data:") ||
  value.startsWith("#");

const assetCache = new Map();

function copyLocalAsset(value, markdownPath, sourcePath, options = {}) {
  if (!value || isExternalAsset(value)) return value;

  const baseDir = options.baseDir ?? path.dirname(markdownPath);
  const [assetPath, suffix = ""] = value.split(/(?=[?#])/u, 2);
  const decodedPath = decodeURIComponent(assetPath.replace(/^<|>$/g, ""));
  const absoluteSource = path.resolve(baseDir, decodedPath);
  const relativeSource = path.relative(contentRoot, absoluteSource);

  if (
    relativeSource.startsWith("..") ||
    path.isAbsolute(relativeSource) ||
    !fs.existsSync(absoluteSource) ||
    !fs.statSync(absoluteSource).isFile()
  ) {
    fail(sourcePath, options.missingMessage ?? `找不到本地媒体文件 ${value}`);
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

function markdownStem(markdownPath) {
  return path.basename(markdownPath, path.extname(markdownPath));
}

const widgetExtensions = new Set([".html", ".pdf"]);

function assertWidgetSidecar(src, markdownPath, sourcePath) {
  const [assetPath] = src.split(/(?=[?#])/u, 2);
  const decodedPath = decodeURIComponent(assetPath.replace(/^<|>$/g, ""));
  if (isExternalAsset(decodedPath)) {
    fail(sourcePath, "widget src 必须是同名目录里的本地 .html 或 .pdf，不能使用远程地址");
  }

  const absoluteSource = path.resolve(path.dirname(markdownPath), decodedPath);
  const stem = markdownStem(markdownPath);
  const sidecarRoot = path.join(path.dirname(markdownPath), stem);
  const relativeToSidecar = path.relative(sidecarRoot, absoluteSource);
  const extension = path.extname(absoluteSource).toLowerCase();
  if (
    relativeToSidecar.startsWith("..") ||
    path.isAbsolute(relativeToSidecar) ||
    !widgetExtensions.has(extension)
  ) {
    fail(
      sourcePath,
      `widget src 必须位于同名目录 ${stem}/ 内的 .html 或 .pdf，例如 ./${stem}/notes.pdf`,
    );
  }
  return absoluteSource;
}

function inferWidgetKind(absoluteSource) {
  const extension = path.extname(absoluteSource).toLowerCase();
  if (extension === ".pdf") return "pdf";
  const html = fs.readFileSync(absoluteSource, "utf8");
  return /source:\s*["']garden-chart["']/u.test(html) ? "chart" : "html";
}

function resolveWidgetKind(requested, absoluteSource, sourcePath) {
  const inferred = inferWidgetKind(absoluteSource);
  if (requested == null || requested === "") return inferred;
  if (typeof requested !== "string") fail(sourcePath, "widget kind 必须是 chart、html 或 pdf");
  const kind = requested.trim();
  if (!["chart", "html", "pdf"].includes(kind)) {
    fail(sourcePath, "widget kind 必须是 chart、html 或 pdf");
  }
  const extension = path.extname(absoluteSource).toLowerCase();
  if (kind === "pdf" && extension !== ".pdf") fail(sourcePath, "kind: pdf 只能用于 .pdf");
  if ((kind === "chart" || kind === "html") && extension !== ".html") {
    fail(sourcePath, `kind: ${kind} 只能用于 .html`);
  }
  return kind;
}

function rewriteWidgetFences(content, markdownPath, sourcePath) {
  return content.replace(
    /(^|\n)(`{3,}|~{3,})widget[ \t]*\r?\n([\s\S]*?)\r?\n\2[ \t]*(?=\r?\n|$)/gu,
    (match, lead, fence, body) => {
      let data;
      try {
        data = parseYaml(body);
      } catch {
        fail(sourcePath, "widget 围栏不是有效的 YAML");
      }
      if (data == null || typeof data !== "object" || Array.isArray(data)) {
        fail(sourcePath, "widget 围栏必须是包含 src 与 caption 的 YAML 对象");
      }

      const caption = typeof data.caption === "string" ? data.caption.trim() : "";
      const src = typeof data.src === "string" ? data.src.trim() : "";
      if (!caption) {
        fail(sourcePath, "widget 缺少 caption；它必须是一句判断，供搜索、RSS 和无脚本读者阅读");
      }
      if (!src) {
        fail(
          sourcePath,
          `widget 缺少 src；把文件放进同名目录，再写 src: ./${markdownStem(markdownPath)}/name.html 或 ./${markdownStem(markdownPath)}/name.pdf`,
        );
      }

      const absoluteSource = assertWidgetSidecar(src, markdownPath, sourcePath);
      const next = {
        src: copyLocalAsset(src, markdownPath, sourcePath),
        caption,
        kind: resolveWidgetKind(data.kind, absoluteSource, sourcePath),
      };
      if (typeof data.height === "number" && Number.isFinite(data.height) && data.height > 0) {
        next.height = Math.round(data.height);
      }
      return `${lead}${fence}widget\n${stringifyYaml(next).trimEnd()}\n${fence}`;
    },
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
  const slug = path.basename(markdownPath, ".md");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    fail(sourcePath, "文件名只能包含小写字母、数字和连字符");
  }
  if (data.slug !== undefined) {
    fail(sourcePath, "不要写 slug，文件名就是标识");
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
  if (kind === "thought" && data.mediaType) {
    if (!["image", "audio", "video", "link", "text"].includes(data.mediaType)) {
      fail(sourcePath, "mediaType 不受支持");
    }
  }

  const publishTime = Date.parse(publishAt ?? date);
  if (!includeDrafts && (data.draft === true || publishTime > now)) return null;
  delete data.coverAlt;
  const references = normalizeReferences(data.references, sourcePath);
  delete data.references;

  return {
    ...data,
    references,
    title,
    slug,
    path: kind === "post"
      ? sourcePath.replace(/^posts\//u, "").replace(/\.md$/u, "")
      : slug,
    date,
    updated,
    publishAt,
    kind,
    draft: Boolean(data.draft),
    sourcePath,
    cover: data.cover
      ? copyLocalAsset(data.cover, markdownPath, sourcePath, {
          baseDir: path.join(contentRoot, "covers"),
          missingMessage: `找不到封面 ${data.cover}；本地路径相对 content/covers`,
        })
      : undefined,
    columnCover: data.columnCover
      ? copyLocalAsset(data.columnCover, markdownPath, sourcePath)
      : undefined,
    poster: data.poster
      ? copyLocalAsset(data.poster, markdownPath, sourcePath)
      : undefined,
    media: normalizeMedia(data.media, markdownPath, sourcePath),
    content: rewriteWidgetFences(
      rewriteMarkdownAssets(content.trim(), markdownPath, sourcePath),
      markdownPath,
      sourcePath,
    ),
  };
}

function readMarkdownTree(directory, kind) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readMarkdownTree(fullPath, kind);
    if (!entry.name.endsWith(".md")) return [];

    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(raw, {
      engines: {
        yaml: {
          parse: (input) => parseYaml(input) ?? {},
        },
      },
    });
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

function normalizePostReference(value, sourcePath) {
  if (typeof value !== "string" || !value.trim()) {
    fail(sourcePath, "posts 中的引用必须是非空字符串。");
  }
  const raw = value.trim().replaceAll("\\", "/");
  const relativePath = raw
    .replace(/^(?:content\/)?posts\//u, "")
    .replace(/\.md$/u, "");
  if (
    relativePath.startsWith("/") ||
    relativePath.split("/").some((segment) => segment === ".." || segment === ".")
  ) {
    fail(sourcePath, `博文引用 ${value} 不能越出 content/posts。`);
  }
  return { raw, relativePath };
}

function readColumnReferences(posts) {
  if (!fs.existsSync(columnsConfigPath)) return [];
  let config;
  try {
    config = parseYaml(fs.readFileSync(columnsConfigPath, "utf8"));
  } catch {
    fail("content/columns.yaml", "不是有效的 YAML。");
  }
  if (!Array.isArray(config.columns)) fail("content/columns.yaml", "columns 必须是数组。");
  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
  const postsByPath = new Map(
    posts.map((post) => [
      post.sourcePath.replace(/^posts\//u, "").replace(/\.md$/u, ""),
      post,
    ]),
  );
  const seenColumns = new Set();
  return config.columns.flatMap((column, index) => {
    const sourcePath = `columns.yaml#columns[${index}]`;
    if (!column || typeof column !== "object") fail(sourcePath, "专栏配置必须是对象。");
    const value = column;
    const slug = requireString(value, "slug", sourcePath);
    const title = requireString(value, "title", sourcePath);
    const description = requireString(value, "description", sourcePath);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
      fail(sourcePath, "slug 只能包含小写字母、数字和连字符。");
    }
    if (seenColumns.has(slug)) fail(sourcePath, `专栏 slug ${slug} 重复。`);
    seenColumns.add(slug);
    if (!Array.isArray(value.posts) || !value.posts.every((entry) => typeof entry === "string")) {
      fail(sourcePath, "posts 必须是博文相对路径数组。");
    }
    const referenced = new Set();
    return value.posts.map((postReference, order) => {
      const { raw, relativePath } = normalizePostReference(postReference, sourcePath);
      const post = postsByPath.get(relativePath) ?? postsBySlug.get(raw);
      if (!post) fail(sourcePath, `引用的博文 ${postReference} 不存在。`);
      if (referenced.has(post.path)) {
        fail(sourcePath, `博文 ${postReference} 在同一专栏中重复。`);
      }
      referenced.add(post.path);
      return {
        ...post,
        kind: "column",
        column: slug,
        columnTitle: title,
        columnDescription: description,
        columnStatus: optionalString(value, "status", sourcePath) ?? "持续更新",
        columnCover: optionalString(value, "cover", sourcePath),
        columnCoverAlt: optionalString(value, "coverAlt", sourcePath),
        order: order + 1,
      };
    });
  });
}

fs.rmSync(generatedMediaRoot, { recursive: true, force: true });

const posts = readMarkdownTree(path.join(contentRoot, "posts"), "post").sort(
  (a, b) => Date.parse(b.date) - Date.parse(a.date),
);
const columns = readColumnReferences(posts).sort(
  (a, b) => (a.column === b.column ? a.order - b.order : a.column.localeCompare(b.column)),
);
const thoughts = readMarkdownTree(path.join(contentRoot, "thoughts"), "thought").sort(
  (a, b) => Date.parse(b.date) - Date.parse(a.date),
);

assertUnique(posts, (item) => item.path, "博文路径");
assertUnique(columns, (item) => `${item.column}/${item.path}`, "专栏路径");
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

const source = `// Generated by garden sync. Edit files in content/ instead.
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
  path: string;
  description?: string;
  date: string;
  updated?: string;
  publishAt?: string;
  draft?: boolean;
  topic?: string;
  tags?: string[];
  references?: { title: string; url?: string }[];
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
  columnCoverAlt?: string;
  order?: number;
  cover?: string;
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
fs.writeFileSync(
  siteConfigOutput,
  `// Generated by garden sync. Edit site.config.yaml instead.
export const siteConfig = ${JSON.stringify(siteConfig, null, 2)} as const;
export const githubUrl = ${JSON.stringify(`https://github.com/${siteConfig.author.github}`)};
`,
);

const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const cdata = (value) => value.replaceAll("]]>", "]]]]><![CDATA[>");
const publicRoot = path.join(root, "public");
const columnEntryPath = (entry) => entry.path.startsWith(`${entry.column}/`)
  ? entry.path.slice(entry.column.length + 1)
  : entry.path;
const feedEntries = [
  ...posts.map((entry) => ({ ...entry, path: `/blog/${entry.path}/` })),
  ...thoughts.map((entry) => ({ ...entry, path: `/thoughts/${entry.slug}/` })),
].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));

const feedLastBuildDate = (entries) => new Date(entries.reduce(
  (latest, entry) => Math.max(latest, Date.parse(entry.updated ?? entry.date)),
  0,
)).toUTCString();

function writeRssFeed(fileName, entries) {
  const rssItems = entries.map((entry) => `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(`${publicBaseUrl}${entry.path}`)}</link>
      <guid isPermaLink="true">${escapeXml(`${publicBaseUrl}${entry.path}`)}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description>${escapeXml(entry.description ?? entry.content.replace(/\s+/gu, " ").slice(0, 180))}</description>
      ${(entry.tags ?? []).map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}
      <content:encoded><![CDATA[${cdata(marked.parse(entry.content))}]]></content:encoded>
    </item>`).join("");

  fs.writeFileSync(path.join(publicRoot, fileName), `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(publicBaseUrl)}</link>
    <atom:link href="${escapeXml(`${publicBaseUrl}/${fileName}`)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${feedLastBuildDate(entries)}</lastBuildDate>${rssItems}
  </channel>
</rss>
`);
}

writeRssFeed("rss.xml", feedEntries);
writeRssFeed(
  "posts.xml",
  posts.map((entry) => ({ ...entry, path: `/blog/${entry.path}/` })),
);
const sitemapEntries = [
  "/", "/blog/", "/thoughts/", "/columns/", "/about/",
  ...posts.map((entry) => `/blog/${entry.path}/`),
  ...columns.map((entry) => `/columns/${entry.column}/${columnEntryPath(entry)}/`),
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
