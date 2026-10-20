import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { canonicalSiteDate } from "./site-date.mjs";
import { contentForFeed, contentToSearchText, transformUiContent } from "../ui/core/transform.mjs";
import { countDemoWords } from "../ui/garden/word-count.mjs";
import { referenceDomain } from "../ui/garden/references.mjs";
import { linkAssetsForRender } from "./link-assets.mjs";
import { cardUrls } from "../ui/garden/markdown-links.mjs";
import { formatInlineLink, replaceInlineLinks } from "../ui/garden/markdown-destination.mjs";
import { configuredSiteAddress, sameSiteMatcher } from "../ui/garden/same-site.mjs";
import { resolveBrand } from "./brand.mjs";
import { imageSources, readImageCache, sizeFromBytes } from "./image-sizes.mjs";
import { buildFullIndex, buildSearchIndex } from "../ui/garden/search-index.mjs";
import { coverImageSet, loadSharp } from "./cover-images.mjs";
import { readFileSizeCache } from "./file-sizes.mjs";
import { previewDocument, previewFileName, renderFilePreview } from "./file-preview.mjs";
import { parseGardenBlock, parseGardenInfo, scanFences } from "../ui/garden/parse.mjs";
import { checkGardenMarkdown } from "../ui/garden/check.mjs";
import {
  fileIcon,
  fileName,
  formatLabel,
  isRemoteSrc,
  previewKind,
  maskHtmlComments,
  readFileProps,
} from "../ui/garden/file-block.mjs";
import { resolveRepoFile } from "../ui/garden/file-paths.mjs";
import { trailingSlashEnabled, withTrailingSlash } from "../ui/garden/site-href.mjs";

const gardenPackageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
// Local preview shows broken ui blocks as error cards; public builds fail on them.
const uiMode = includeDrafts || process.env.GARDEN_CONTENT_MODE === "preview" ? "preview" : "publish";
const now = Date.now();
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/u, "");
const siteUrl = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com")
  .replace(/\/+$/u, "");
const publicBaseUrl = basePath && !siteUrl.endsWith(basePath)
  ? `${siteUrl}${basePath}`
  : siteUrl;
// Full URLs to this address are internal links: no new tab, no card.
const siteAddress = configuredSiteAddress(siteConfig, process.env);
const sameSite = sameSiteMatcher(siteAddress, basePath);
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
    const domain = referenceDomain(url);
    return domain ? { title, url, domain } : { title, url };
  });
  return references.length ? references : undefined;
};

const isExternalAsset = (value) =>
  /^(?:[a-z]+:)?\/\//i.test(value) ||
  value.startsWith("/") ||
  value.startsWith("data:") ||
  value.startsWith("#");

const assetCache = new Map();
/** Published URL → original file and its copy, for making resized covers later. */
const assetFiles = new Map();

function copyLocalAsset(value, markdownPath, sourcePath, options = {}) {
  if (!value || isExternalAsset(value)) return value;

  const baseDir = options.baseDir ?? path.dirname(markdownPath);
  const allowedRoot = options.allowedRoot ?? contentRoot;
  const mediaPrefix = options.mediaPrefix ?? "";
  const [assetPath, suffix = ""] = value.split(/(?=[?#])/u, 2);
  const decodedPath = decodeURIComponent(assetPath.replace(/^<|>$/g, ""));
  const absoluteSource = path.resolve(baseDir, decodedPath);
  const relativeSource = path.relative(allowedRoot, absoluteSource);

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
    const prefixedStem = mediaPrefix ? path.join(mediaPrefix, stem) : stem;
    const safeRelative = `${prefixedStem
      .split(path.sep)
      .map((segment) => segment.replace(/[^\w\u3400-\u9fff.-]+/gu, "-"))
      .join(path.sep)}${extension.toLowerCase()}`;
    const destination = path.join(generatedMediaRoot, safeRelative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(absoluteSource, destination);
    const url = `${basePath}/media/${safeRelative.split(path.sep).map(encodeURIComponent).join("/")}`;
    assetCache.set(absoluteSource, url);
    assetFiles.set(url, { source: absoluteSource, destination });
  }

  return `${assetCache.get(absoluteSource)}${suffix}`;
}

function rewriteMarkdownAssets(content, markdownPath, sourcePath, options = {}) {
  // `![alt](<a b (1).png>)` keeps its angle brackets: without them the space
  // and the parentheses would no longer be one destination.
  const markdownImages = replaceInlineLinks(content, (link) =>
    link.image ? formatInlineLink(link, copyLocalAsset(link.url, markdownPath, sourcePath, options)) : undefined,
  );

  return markdownImages.replace(
    /(<(?:img|audio|video|source)\b[^>]*\bsrc=["'])([^"']+)(["'])/giu,
    (_, prefix, src, suffix) =>
      `${prefix}${copyLocalAsset(src, markdownPath, sourcePath, options)}${suffix}`,
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
      `widget src 必须位于同名目录 ${stem}/ 内的 .html 或 .pdf，例如 ./${stem}/diagram.html`,
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

const remoteFileSizes = readFileSizeCache(root).files;

/** One file of a `garden file` fence, resolved for the page. */
function resolveFileEntry(file, markdownPath, sourcePath, options = {}) {
  const allowedRoot = options.allowedRoot ?? contentRoot;
  const assetOptions = options.assetOptions ?? {};
  const src = file.src;
  const name = fileName(src);
  const entry = {
    name,
    title: file.title || name,
    ...(file.note ? { note: file.note } : {}),
    format: formatLabel(src),
    icon: fileIcon(src),
  };
  if (isRemoteSrc(src)) {
    const size = remoteFileSizes[src]?.size;
    return { ...entry, url: src, remote: true, preview: "", ...(size > 0 ? { size } : {}) };
  }
  if (src.startsWith("/")) {
    // A site path: served as is, download only.
    const file = path.join(root, "public", src.split(/[?#]/u, 1)[0]);
    const size = fs.existsSync(file) && fs.statSync(file).isFile() ? fs.statSync(file).size : 0;
    return { ...entry, url: `${basePath}${src}`, remote: false, preview: "", ...(size > 0 ? { size } : {}) };
  }
  const resolved = resolveRepoFile(src, markdownPath, allowedRoot);
  if (resolved.error) fail(sourcePath, `garden file：${resolved.error}`);
  const missingMessage = `garden file 找不到 ${src}；src 相对这篇 Markdown 所在的目录`;
  if (!fs.existsSync(resolved.path) || !fs.statSync(resolved.path).isFile()) fail(sourcePath, missingMessage);
  const url = copyLocalAsset(src, markdownPath, sourcePath, { ...assetOptions, missingMessage });
  const preview = previewKind(src, { remote: false });
  const next = { ...entry, url, size: fs.statSync(resolved.path).size, remote: false, preview };
  if (preview === "md") {
    // Rendered now into its own file next to the copy; the page only links to it and the
    // preview fetches it on demand. Images next to the Markdown file are copied too.
    const { content } = matter(fs.readFileSync(resolved.path, "utf8"));
    const html = renderFilePreview(rewriteMarkdownAssets(content.trim(), resolved.path, sourcePath, assetOptions));
    const { destination } = assetFiles.get(url.split(/[?#]/u, 1)[0]);
    fs.writeFileSync(previewFileName(destination), previewDocument(html, { title: entry.title }));
    next.previewSrc = previewFileName(url.split(/[?#]/u, 1)[0]);
  }
  return next;
}

/**
 * `garden file` fences: resolve every src next to the Markdown file, copy repo
 * files to the public folder, and replace the YAML with `resolved:` data the
 * page renders without reading the file system.
 */
function rewriteFileFences(content, markdownPath, sourcePath, options = {}) {
  const fences = scanFences(maskHtmlComments(content)).filter((fence) => parseGardenInfo(fence.info)?.name === "file" && !fence.unclosed);
  if (!fences.length) return content;
  const lines = content.split("\n");
  for (const fence of [...fences].reverse()) {
    const block = parseGardenBlock(fence.info, fence.body);
    if (block?.error) fail(sourcePath, `第 ${fence.line} 行 garden file：${block.error.message}`);
    if (block.props.resolved) fail(sourcePath, `第 ${fence.line} 行 garden file：resolved 由构建生成，不要手写`);
    const read = readFileProps(block.props);
    if (read.errors.length) fail(sourcePath, `第 ${fence.line} 行 garden file：${read.errors.join("；")}`);
    const resolved = {
      layout: read.layout,
      ...(read.title ? { title: read.title } : {}),
      files: read.files.map((file) => resolveFileEntry(file, markdownPath, sourcePath, options)),
      // The YAML as written, so a page that shows its own source (the
      // component reference) shows what the author typed, not this data.
      source: fence.body.replace(/\n$/u, ""),
    };
    const indent = " ".repeat(fence.indent);
    lines.splice(
      fence.line - 1,
      fence.endLine - fence.line + 1,
      `${indent}${fence.marker}${fence.info}`,
      `${indent}resolved: ${JSON.stringify(resolved)}`,
      `${indent}${fence.marker}`,
    );
  }
  return lines.join("\n");
}

function rewriteUiFences(content, markdownPath, sourcePath, lineOffset, assetOptions = {}) {
  const { content: transformed, errors } = transformUiContent(content, {
    mode: uiMode,
    markdownPath: sourcePath.split(path.sep).join("/"),
    lineOffset,
    readData: (src) => {
      const absolute = path.resolve(path.dirname(markdownPath), src);
      return fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? fs.readFileSync(absolute, "utf8") : undefined;
    },
    resolveAsset: (_sidecarPath, written) => copyLocalAsset(written, markdownPath, sourcePath, assetOptions),
  });
  if (errors.length) {
    fail(
      sourcePath,
      `ui 块没有通过检查：\n${errors.map((item) => `  第 ${item.line} 行 ${item.code}：${item.message}`).join("\n")}\n修好后再发布；可以运行 npx garden ui check ${path.join("content", sourcePath)} 拿到修复提示词。`,
    );
  }
  return transformed;
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

function validateAndNormalize(data, content, markdownPath, kind, sourcePath, lineOffset = 0) {
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
  if (data.numbering !== undefined && typeof data.numbering !== "boolean") {
    fail(sourcePath, "numbering 必须是布尔值");
  }

  if (kind === "post") {
    requireString(data, "description", sourcePath);
  }
  if (kind === "thought" && data.mediaType) {
    if (!["image", "audio", "video", "link", "text"].includes(data.mediaType)) {
      fail(sourcePath, "mediaType 不受支持");
    }
  }

  const publishTime = Date.parse(publishAt ?? date);
  if (!includeDrafts && (data.draft === true || publishTime > now)) return null;
  delete data.coverAlt;
  // Older posts may still carry `topic:`; it is no longer used.
  delete data.topic;
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
    content: rewriteFileFences(
      rewriteWidgetFences(
        rewriteMarkdownAssets(
          rewriteUiFences(content.trim(), markdownPath, sourcePath, lineOffset + leadingLines(content)),
          markdownPath,
          sourcePath,
        ),
        markdownPath,
        sourcePath,
      ),
      markdownPath,
      sourcePath,
    ),
  };
}

const leadingLines = (content) => (/^\s*/u.exec(content)?.[0].match(/\n/gu) ?? []).length;

function readMarkdownTree(directory, kind) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    // `post.md` + `post/` is the post's own folder of files (garden html, garden file):
    // Markdown inside it is a file to download or preview, not another post.
    if (entry.isDirectory()) return fs.existsSync(`${fullPath}.md`) ? [] : readMarkdownTree(fullPath, kind);
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
    const frontMatterLines = raw.slice(0, raw.length - parsed.content.length).split("\n").length - 1;
    const normalized = validateAndNormalize(
      parsed.data,
      parsed.content,
      fullPath,
      kind,
      sourcePath,
      frontMatterLines,
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

const handbookRoot = path.join(gardenPackageRoot, "docs", "handbook");

function readHandbookDocs() {
  if (!fs.existsSync(handbookRoot)) return [];
  const assetOptions = { allowedRoot: handbookRoot, mediaPrefix: "garden-docs" };
  const fileOptions = { allowedRoot: handbookRoot, assetOptions };

  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (!entry.name.endsWith(".md")) return [];

      const raw = fs.readFileSync(fullPath, "utf8");
      const parsed = matter(raw, {
        engines: {
          yaml: {
            parse: (input) => parseYaml(input) ?? {},
          },
        },
      });
      // Sidecar Markdown attachments (such as docs/handbook/components/file/checklist.md)
      // do not carry handbook front matter (`section`) and are served as downloadable files.
      if (!parsed.data || typeof parsed.data.section !== "string") return [];
      const relativeMd = path.relative(handbookRoot, fullPath).split(path.sep).join("/");
      const sourcePath = `docs/handbook/${relativeMd}`;
      const docPath = relativeMd.replace(/\.md$/u, "");
      const slug = path.basename(fullPath, ".md");
      const frontMatterLines = raw.slice(0, raw.length - parsed.content.length).split("\n").length - 1;
      const title = requireString(parsed.data, "title", sourcePath);
      const description = requireString(parsed.data, "description", sourcePath);
      const section = requireString(parsed.data, "section", sourcePath);
      const navTitle = optionalString(parsed.data, "navTitle", sourcePath);
      const badge = optionalString(parsed.data, "badge", sourcePath);
      const order = typeof parsed.data.order === "number" ? parsed.data.order : 999;
      const references = normalizeReferences(parsed.data.references, sourcePath);

      const diagnostics = checkGardenMarkdown(parsed.content.trim(), { title });
      const blocking = diagnostics.filter((item) => item.severity === "error");
      if (blocking.length) {
        fail(
          sourcePath,
          blocking.map((item) => `第 ${item.line + frontMatterLines} 行 ${item.code}：${item.message}`).join("；"),
        );
      }

      const content = rewriteFileFences(
        rewriteMarkdownAssets(
          rewriteUiFences(parsed.content.trim(), fullPath, sourcePath, frontMatterLines + leadingLines(parsed.content), assetOptions),
          fullPath,
          sourcePath,
          assetOptions,
        ),
        fullPath,
        sourcePath,
        fileOptions,
      );

      return [{
        title,
        slug,
        ...(navTitle ? { navTitle } : {}),
        description,
        path: docPath,
        section,
        order,
        ...(badge ? { badge } : {}),
        ...(references ? { references } : {}),
        sourcePath,
        content,
      }];
    });
  }

  return walk(handbookRoot).sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
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
// docs/handbook/en/** mirrors the Chinese handbook page for page: the same
// relative path is the counterpart. Each entry carries its lang; English paths
// drop the en/ prefix and are served under /garden/en/.
const allHandbookDocs = readHandbookDocs().map((doc) =>
  doc.path === "en" || doc.path.startsWith("en/")
    ? { ...doc, lang: "en", path: doc.path === "en" ? "index" : doc.path.slice(3) }
    : { ...doc, lang: "zh" },
);
const zhHandbookDocs = allHandbookDocs.filter((doc) => doc.lang === "zh");
const enHandbookDocs = allHandbookDocs.filter((doc) => doc.lang === "en");
const gardenIndexDoc = zhHandbookDocs.find((doc) => doc.path === "index") ?? null;
const gardenDocs = zhHandbookDocs.filter((doc) => doc.path !== "index");
const gardenIndexDocEn = enHandbookDocs.find((doc) => doc.path === "index") ?? null;
const gardenDocsEn = enHandbookDocs.filter((doc) => doc.path !== "index");

// Intrinsic image sizes for width/height on <img>: local files are read now,
// remote ones come from image-sizes.json (written by scripts/image-sizes.mjs).
function localImageFile(src) {
  const clean = src.split(/[?#]/u, 1)[0];
  const copied = assetFiles.get(clean)?.destination;
  if (copied) return copied;
  if (!clean.startsWith("/") || clean.startsWith("//")) return null;
  let pathname;
  try {
    pathname = decodeURIComponent(basePath && clean.startsWith(`${basePath}/`) ? clean.slice(basePath.length) : clean);
  } catch {
    return null;
  }
  const publicDir = path.join(root, "public");
  const file = path.resolve(publicDir, `.${pathname}`);
  return file.startsWith(publicDir + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}
const remoteImageSizes = readImageCache(root).images;
const imageSizes = {};
for (const entry of [...posts, ...columns, ...thoughts, ...allHandbookDocs]) {
  for (const src of imageSources(entry.content)) {
    if (imageSizes[src]) continue;
    if (/^https?:\/\//iu.test(src)) {
      const size = remoteImageSizes[src];
      if (size?.width > 0 && size?.height > 0) imageSizes[src] = { width: size.width, height: size.height };
      continue;
    }
    const file = localImageFile(src);
    const size = file ? sizeFromBytes(fs.readFileSync(file)) : null;
    if (size) imageSizes[src] = size;
    else if (file) console.warn(`警告：读不到图片尺寸，这张图不带宽高：${src}`);
  }
}

assertUnique(posts, (item) => item.path, "博文路径");
assertUnique(columns, (item) => `${item.column}/${item.path}`, "专栏路径");
assertUnique(
  columns,
  (item) => `${item.column}/${item.order}`,
  "专栏文章顺序",
);
assertUnique(thoughts, (item) => item.slug, "随想 slug");
// /thoughts/page/<n>/ holds the static pages of the feed.
for (const thought of thoughts) {
  if (thought.slug === "page") fail(thought.sourcePath ?? "content/thoughts/page.md", "随想不能叫 page：/thoughts/page/ 留给分页");
}
assertUnique(gardenDocs, (item) => item.path, "Garden 文档路径");
assertUnique(gardenDocsEn, (item) => item.path, "Garden English handbook path");

const parityDir = path.join(root, "parity", "articles");
const a2WordCounts = fs.existsSync(parityDir)
  ? Object.fromEntries(fs.readdirSync(parityDir).filter((name) => name.endsWith(".md")).sort().map((name) => {
      const parsed = matter(fs.readFileSync(path.join(parityDir, name), "utf8"));
      return [name.slice(0, -3), countDemoWords(parsed.content)];
    }))
  : {};

// Resized WebP covers for lists and article heroes; skipped quietly without sharp.
const sharp = await loadSharp();
if (sharp) {
  const sets = new Map();
  for (const entry of [...posts, ...columns]) {
    const files = entry.cover ? assetFiles.get(entry.cover) : undefined;
    if (!files) continue;
    if (!sets.has(entry.cover)) sets.set(entry.cover, await coverImageSet({ sharp, ...files, url: entry.cover }));
    const set = sets.get(entry.cover);
    if (set) entry.coverImage = set;
  }
}

const contentHash = crypto
  .createHash("sha256")
  .update(JSON.stringify({ posts, columns, thoughts, a2WordCounts }))
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
  tags?: string[];
  references?: { title: string; url?: string; domain?: string }[];
  pinned?: boolean;
  numbering?: boolean;
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
  coverImage?: { src: string; srcset: string; width: number; height: number };
  mediaType?: "image" | "audio" | "video" | "link" | "text";
  media?: string | MediaItem[];
  mediaAlt?: string;
  poster?: string;
  linkTitle?: string;
  linkDescription?: string;
};

export type GardenDocEntry = {
  title: string;
  navTitle?: string;
  description: string;
  path: string;
  section: string;
  order: number;
  badge?: string;
  references?: { title: string; url?: string; domain?: string }[];
  content: string;
};

export type LinkCardMeta = { title: string; description?: string; siteName?: string; author?: string; publishedTime?: string; image?: string };
export type LinkAssets = { favicons: Record<string, string>; cards: Record<string, LinkCardMeta> };

export const contentHash = "${contentHash}";
export const posts = ${JSON.stringify(posts, null, 2)} as ContentEntry[];
export const columns = ${JSON.stringify(columns, null, 2)} as ContentEntry[];
export const thoughts = ${JSON.stringify(thoughts, null, 2)} as ContentEntry[];
export const gardenDocs = ${JSON.stringify(gardenDocs, null, 2)} as GardenDocEntry[];
export const gardenIndexDoc = ${JSON.stringify(gardenIndexDoc, null, 2)} as GardenDocEntry | null;
export const gardenDocsEn = ${JSON.stringify(gardenDocsEn, null, 2)} as GardenDocEntry[];
export const gardenIndexDocEn = ${JSON.stringify(gardenIndexDocEn, null, 2)} as GardenDocEntry | null;
export const a2WordCounts = ${JSON.stringify(a2WordCounts, null, 2)} as Record<string, number>;
export const linkAssets = ${JSON.stringify(linkAssetsForRender(root, basePath), null, 2)} as LinkAssets;
export const imageSizes: Record<string, { width: number; height: number }> = ${JSON.stringify(imageSizes)};
`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, source);
const fullIndex = buildFullIndex({ posts, columns, thoughts });
fs.writeFileSync(
  siteConfigOutput,
  `// Generated by garden sync. Edit site.config.yaml instead.
export const siteConfig = ${JSON.stringify(siteConfig, null, 2)} as const;
export const githubUrl = ${JSON.stringify(`https://github.com/${siteConfig.author.github}`)};
// Loaded by the header only when search opens; the hash busts stale caches.
export const searchIndexUrl = ${JSON.stringify(`${basePath}/search-index.json?v=${contentHash}`)};
// Every body as plain text, fetched in the background after load; the name changes with the text.
export const searchFull = ${JSON.stringify({ url: `${basePath}/${fullIndex.fileName}`, hash: fullIndex.hash })};
// Header logo (inlined SVG) and icon URLs, from brand in site.config.yaml.
export const brand = ${JSON.stringify(resolveBrand(root, siteConfig, basePath, (line) => console.warn(line)))};
// Full URLs to this address render as internal links.
export const siteLinks = ${JSON.stringify({ address: siteAddress, basePath, trailingSlash: trailingSlashEnabled(process.env) })};
`,
);
fs.mkdirSync(path.join(root, "public"), { recursive: true });
fs.writeFileSync(path.join(root, "public", "search-index.json"), JSON.stringify(buildSearchIndex({ posts, columns, thoughts })));
for (const name of fs.readdirSync(path.join(root, "public"))) {
  if (/^search-full\.[0-9a-f]+\.json$/u.test(name) && name !== fullIndex.fileName) fs.rmSync(path.join(root, "public", name));
}
fs.writeFileSync(path.join(root, "public", fullIndex.fileName), fullIndex.json);

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
// Page addresses in the feeds and the sitemap follow trailingSlash like every site link.
const pageAddress = (pathname) => withTrailingSlash(pathname, trailingSlashEnabled(process.env));
// A feed item's guid is how readers tell items apart: it keeps the form it has had since 0.5.14
// (`/blog/<path>/`, `/thoughts/<slug>/`) whatever the link looks like, or every reader would show
// the whole feed as new again.
const feedEntry = (entry, pathname) => ({ ...entry, path: pageAddress(pathname), guidPath: pathname });
const feedEntries = [
  ...posts.map((entry) => feedEntry(entry, `/blog/${entry.path}/`)),
  ...thoughts.map((entry) => feedEntry(entry, `/thoughts/${entry.slug}/`)),
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
      <guid isPermaLink="true">${escapeXml(`${publicBaseUrl}${entry.guidPath}`)}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description>${escapeXml(entry.description ?? contentToSearchText(entry.content).replace(/\s+/gu, " ").trim().slice(0, 180))}</description>
      ${(entry.tags ?? []).map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}
      <content:encoded><![CDATA[${cdata(marked.parse(contentForFeed(entry.content, { pageUrl: `${publicBaseUrl}${entry.path}`, siteUrl: publicBaseUrl })))}]]></content:encoded>
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
  posts.map((entry) => feedEntry(entry, `/blog/${entry.path}/`)),
);
const sitemapEntries = [
  "/", "/blog/", "/thoughts/", "/columns/", "/about/", "/garden/",
  ...gardenDocs.map((entry) => `/garden/${entry.path}/`),
  ...(gardenIndexDocEn ? ["/garden/en/"] : []),
  ...gardenDocsEn.map((entry) => `/garden/en/${entry.path}/`),
  ...posts.map((entry) => `/blog/${entry.path}/`),
  ...columns.map((entry) => `/columns/${entry.column}/${columnEntryPath(entry)}/`),
  ...thoughts.map((entry) => `/thoughts/${entry.slug}/`),
].map(pageAddress);
// Card URLs in published entries: the only pages the link-card Worker may read.
fs.writeFileSync(
  path.join(publicRoot, "link-allowlist.json"),
  `${JSON.stringify({ urls: [...new Set([...posts, ...columns, ...thoughts].flatMap((entry) => cardUrls(entry.content)).filter((url) => !sameSite(url)))].sort() }, null, 2)}\n`,
);
fs.writeFileSync(path.join(publicRoot, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries.map((entry) => `
  <url><loc>${escapeXml(`${publicBaseUrl}${entry}`)}</loc></url>`).join("")}
</urlset>
`);
fs.writeFileSync(path.join(publicRoot, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${publicBaseUrl}/sitemap.xml\n`);
console.log(
  `Synced ${posts.length} posts, ${columns.length} column entries, and ${thoughts.length} thoughts (${contentHash}).`,
);
