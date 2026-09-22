import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { canonicalSiteDate } from "./site-date.mjs";
import { gardenSiteRoot } from "./garden-paths.mjs";

const siteRoot = gardenSiteRoot();
const calloutTypes = new Set([
  "NOTE",
  "INFO",
  "TIP",
  "SUCCESS",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
  "DANGER",
  "FAILURE",
]);
const authorDate = /^(?:\d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})$/u;
const matterOptions = {
  engines: {
    yaml: {
      parse: (input) => parseYaml(input) ?? {},
    },
  },
};

const error = (errors, code, line, message) => {
  errors.push({ code, line, message });
};

const isExternalAsset = (value) =>
  /^(?:[a-z]+:)?\/\//iu.test(value) ||
  value.startsWith("/") ||
  value.startsWith("data:") ||
  value.startsWith("#");

const normalizeUrl = (value) => {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) url.searchParams.delete(key);
    }
    url.hash = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/u, "");
    return url.toString();
  } catch {
    return value.trim();
  }
};

const markdownStem = (markdownPath) => path.basename(markdownPath, path.extname(markdownPath));

const assertLocalFile = (errors, value, baseDir, sourcePath, line, label) => {
  if (!value || isExternalAsset(value)) return;
  const [assetPath] = value.split(/(?=[?#])/u, 2);
  const decoded = decodeURIComponent(assetPath.replace(/^<|>$/gu, ""));
  const absolute = path.resolve(baseDir, decoded);
  if (!fs.existsSync(absolute)) {
    error(errors, "missing-asset", line, `${sourcePath}: 找不到${label} ${value}`);
  }
};

const checkReferences = (data, sourcePath, errors) => {
  if (data.references === undefined) return [];
  if (!Array.isArray(data.references)) {
    error(errors, "references-type", 1, `${sourcePath}: references 必须是数组`);
    return [];
  }
  const seen = new Set();
  data.references.forEach((item, index) => {
    const where = `references[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      error(errors, "references-type", 1, `${sourcePath}: ${where} 必须是包含 title 的对象`);
      return;
    }
    for (const key of Object.keys(item)) {
      if (key !== "title" && key !== "url") {
        error(errors, "reference-key", 1, `${sourcePath}: ${where} 不支持 ${key}`);
      }
    }
    if (typeof item.title !== "string" || !item.title.trim()) {
      error(errors, "reference-title", 1, `${sourcePath}: ${where} 缺少有效的 title`);
    }
    if (item.url === undefined || item.url === null || item.url === "") return;
    if (typeof item.url !== "string") {
      error(errors, "reference-url", 1, `${sourcePath}: ${where}.url 必须是字符串`);
      return;
    }
    let parsed;
    try {
      parsed = new URL(item.url.trim());
    } catch {
      parsed = null;
    }
    if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
      error(errors, "reference-url", 1, `${sourcePath}: ${where}.url 必须是 http 或 https 链接`);
      return;
    }
    const normalized = normalizeUrl(item.url.trim());
    if (seen.has(normalized)) {
      error(errors, "reference-duplicate", 1, `${sourcePath}: ${where}.url 与前面的参考重复`);
      return;
    }
    seen.add(normalized);
  });
};

const checkWidget = (errors, body, markdownPath, sourcePath, line) => {
  let data;
  try {
    data = parseYaml(body);
  } catch {
    error(errors, "widget-yaml", line, `${sourcePath}: widget 围栏不是有效的 YAML`);
    return;
  }
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    error(errors, "widget-yaml", line, `${sourcePath}: widget 围栏必须是包含 src 与 caption 的 YAML 对象`);
    return;
  }
  const caption = typeof data.caption === "string" ? data.caption.trim() : "";
  const src = typeof data.src === "string" ? data.src.trim() : "";
  if (!caption) error(errors, "widget-caption", line, `${sourcePath}: widget 缺少 caption`);
  if (!src) {
    error(errors, "widget-src", line, `${sourcePath}: widget 缺少 src`);
    return;
  }
  const [assetPath] = src.split(/(?=[?#])/u, 2);
  const decoded = decodeURIComponent(assetPath.replace(/^<|>$/gu, ""));
  if (isExternalAsset(decoded)) {
    error(errors, "widget-src", line, `${sourcePath}: widget src 必须是同名目录里的本地 .html 或 .pdf`);
    return;
  }
  const absolute = path.resolve(path.dirname(markdownPath), decoded);
  const sidecar = path.join(path.dirname(markdownPath), markdownStem(markdownPath));
  const relative = path.relative(sidecar, absolute);
  const extension = path.extname(absolute).toLowerCase();
  if (relative.startsWith("..") || path.isAbsolute(relative) || ![".html", ".pdf"].includes(extension)) {
    error(
      errors,
      "widget-src",
      line,
      `${sourcePath}: widget src 必须位于同名目录 ${markdownStem(markdownPath)}/ 内的 .html 或 .pdf`,
    );
    return;
  }
  if (!fs.existsSync(absolute)) {
    error(errors, "widget-missing", line, `${sourcePath}: 找不到 widget 文件 ${src}`);
    return;
  }
  if (data.kind == null || data.kind === "") return;
  if (typeof data.kind !== "string" || !["chart", "html", "pdf"].includes(data.kind.trim())) {
    error(errors, "widget-kind", line, `${sourcePath}: widget kind 必须是 chart、html 或 pdf`);
    return;
  }
  const kind = data.kind.trim();
  if (kind === "pdf" && extension !== ".pdf") {
    error(errors, "widget-kind", line, `${sourcePath}: kind: pdf 只能用于 .pdf`);
  }
  if ((kind === "chart" || kind === "html") && extension !== ".html") {
    error(errors, "widget-kind", line, `${sourcePath}: kind: ${kind} 只能用于 .html`);
  }
};

const checkEmbed = (errors, body, sourcePath, line) => {
  let data;
  try {
    data = parseYaml(body);
  } catch {
    error(errors, "embed-url", line, `${sourcePath}: embed 围栏不是有效的 YAML`);
    return;
  }
  const url = data && typeof data === "object" && !Array.isArray(data) ? data.url : undefined;
  if (typeof url !== "string" || !url.trim()) {
    error(errors, "embed-url", line, `${sourcePath}: embed 缺少 url`);
    return;
  }
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
  } catch {
    error(errors, "embed-url", line, `${sourcePath}: embed url 必须是 http 或 https 链接`);
  }
};

const scanBody = (errors, content, markdownPath, sourcePath) => {
  let fence = null;
  let previousDepth = 1;
  const lines = content.split(/\r?\n/u);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const opener = line.match(/^(`{3,}|~{3,})(.*)$/u);
    if (fence) {
      if (opener && opener[1][0] === fence.marker && opener[1].length >= fence.marker.length && !opener[2].trim()) {
        if (fence.lang === "widget") checkWidget(errors, fence.body.join("\n"), markdownPath, sourcePath, fence.line);
        if (fence.lang === "embed") checkEmbed(errors, fence.body.join("\n"), sourcePath, fence.line);
        fence = null;
      } else {
        fence.body.push(line);
      }
      return;
    }
    if (opener) {
      fence = { marker: opener[1], lang: opener[2].trim().split(/\s+/u)[0]?.toLowerCase() ?? "", body: [], line: lineNumber };
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/u);
    if (heading) {
      const depth = heading[1].length;
      const text = heading[2].trim();
      if (depth === 1) error(errors, "heading-h1", lineNumber, `${sourcePath}: 正文不要用一级标题，页面标题写在 front matter`);
      if (depth > previousDepth + 1) {
        error(errors, "heading-skip", lineNumber, `${sourcePath}: 标题从 ${previousDepth} 级跳到了 ${depth} 级`);
      }
      if (depth === 2 && (text === "参考" || text === "参考资料")) {
        error(errors, "reference-heading", lineNumber, `${sourcePath}: 「${text}」不要写成标题，改放到 front matter 的 references`);
      }
      previousDepth = depth;
    }

    const callout = line.match(/^>\s*\[!([A-Za-z]+)\]/u);
    if (callout && !calloutTypes.has(callout[1].toUpperCase())) {
      error(errors, "callout-type", lineNumber, `${sourcePath}: 不支持的警告框类型 ${callout[1]}`);
    }

    for (const image of line.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu)) {
      assertLocalFile(errors, image[2], path.dirname(markdownPath), sourcePath, lineNumber, "图片");
    }
  });

  if (fence?.lang === "widget") checkWidget(errors, fence.body.join("\n"), markdownPath, sourcePath, fence.line);
  if (fence?.lang === "embed") checkEmbed(errors, fence.body.join("\n"), sourcePath, fence.line);
};

const checkFile = (filePath) => {
  const absolute = path.resolve(siteRoot, filePath);
  const sourcePath = path.relative(siteRoot, absolute);
  const errors = [];
  if (!fs.existsSync(absolute)) {
    error(errors, "missing-file", 1, `${sourcePath}: 找不到文件`);
    return { file: sourcePath, errors };
  }
  const parsed = matter(fs.readFileSync(absolute, "utf8"), matterOptions);
  const data = parsed.data ?? {};
  if (typeof data.title !== "string" || !data.title.trim()) {
    error(errors, "missing-title", 1, `${sourcePath}: front matter 缺少有效的 title`);
  }
  if (typeof data.description !== "string" || !data.description.trim()) {
    error(errors, "missing-description", 1, `${sourcePath}: front matter 缺少有效的 description`);
  }
  if (typeof data.topic !== "string" || !data.topic.trim()) {
    error(errors, "missing-topic", 1, `${sourcePath}: front matter 缺少有效的 topic`);
  }
  if (data.slug !== undefined) {
    error(errors, "unexpected-slug", 1, `${sourcePath}: 不要写 slug，文件名就是标识`);
  }
  if (typeof data.date !== "string" || !authorDate.test(data.date.trim()) || !canonicalSiteDate(data.date)) {
    error(errors, "date-format", 1, `${sourcePath}: date 必须是 2026-09-18 或 2026-09-18 14:39:00`);
  }
  if (typeof data.cover === "string" && data.cover.trim() && !isExternalAsset(data.cover.trim())) {
    const coverPath = path.join(siteRoot, "content", "covers", data.cover.trim());
    if (!fs.existsSync(coverPath)) {
      error(errors, "missing-cover", 1, `${sourcePath}: 找不到封面 ${data.cover}`);
    }
  }
  checkReferences(data, sourcePath, errors);
  scanBody(errors, parsed.content, absolute, sourcePath);
  return { file: sourcePath, errors };
};

const files = process.argv.slice(2);
if (!files.length) {
  process.stderr.write("用法：garden check content/posts/文章.md\n");
  process.exit(1);
}

const results = files.map((file) => checkFile(file));
const ok = results.every((result) => result.errors.length === 0);
process.stdout.write(`${JSON.stringify({ ok, results }, null, 2)}\n`);
process.exit(ok ? 0 : 1);
