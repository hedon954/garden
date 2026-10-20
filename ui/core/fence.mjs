import { parse as parseYaml } from "yaml";
import { sha256Hex } from "./sha256.mjs";
import { gardenKind, readInteractiveFence } from "./garden-fence.mjs";

export const normalizeNewlines = (text) => text.replace(/\r\n?/gu, "\n");

export const shortHash = (text) => sha256Hex(normalizeNewlines(text)).slice(0, 8);

export const intentHash = (intent) => shortHash(normalizeNewlines(String(intent ?? "")).trim());

/** Hash of the whole fence, from the opening backticks to the closing ones. */
export const fenceHash = (raw) => shortHash(raw);

/**
 * @typedef {{
 *   marker: string, lang: string, info: string, start: number, end: number,
 *   startLine: number, endLine: number, bodyStartLine: number, closed: boolean,
 *   raw: string, body: string,
 * }} Fence
 */

/**
 * Line scanner shared by build, CLI, admin and editor plugins. Offsets are
 * character offsets into the original text; lines are 1-based.
 * @param {string} markdown
 * @returns {Fence[]}
 */
export function scanFences(markdown) {
  const fences = [];
  const lineRe = /[^\n]*(?:\n|$)/gu;
  let offset = 0;
  let lineNumber = 0;
  let open = null;
  for (const match of markdown.matchAll(lineRe)) {
    const chunk = match[0];
    if (!chunk && offset >= markdown.length) break;
    lineNumber += 1;
    const line = chunk.replace(/\r?\n$/u, "");
    const lineEnd = offset + line.length;
    if (open) {
      const closer = /^ {0,3}(`{3,}|~{3,})\s*$/u.exec(line);
      if (closer && closer[1][0] === open.marker[0] && closer[1].length >= open.marker.length) {
        open.endLine = lineNumber;
        open.end = lineEnd;
        open.closed = true;
        open.raw = markdown.slice(open.start, open.end);
        open.body = open.bodyLines.join("\n");
        delete open.bodyLines;
        fences.push(open);
        open = null;
      } else {
        open.bodyLines.push(line);
      }
    } else {
      const opener = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line);
      if (opener && !(opener[1][0] === "`" && opener[2].includes("`"))) {
        const info = opener[2].trim();
        const [lang = "", ...rest] = info.split(/\s+/u);
        open = {
          marker: opener[1],
          lang: lang.toLowerCase(),
          info: rest.join(" "),
          start: offset,
          startLine: lineNumber,
          bodyStartLine: lineNumber + 1,
          bodyLines: [],
        };
      }
    }
    offset += chunk.length;
    if (offset >= markdown.length && !chunk.endsWith("\n")) break;
  }
  if (open) {
    open.endLine = lineNumber;
    open.end = markdown.length;
    open.closed = false;
    open.raw = markdown.slice(open.start);
    open.body = open.bodyLines.join("\n");
    delete open.bodyLines;
    fences.push(open);
  }
  return fences;
}

export const BLOCK_LANGS = new Set(["ui", "intent", "widget"]);

/**
 * Blocks the authoring tools act on. `garden` ideas and `garden interactive`
 * fences come back with lang `garden-idea` / `garden-interactive`; the older
 * `ui`, `intent` and `widget` fences keep their own lang.
 * @param {string} markdown @returns {Fence[]}
 */
export function findBlocks(markdown) {
  return scanFences(markdown).flatMap((fence) => {
    if (BLOCK_LANGS.has(fence.lang)) return [fence];
    const kind = gardenKind(fence);
    return kind ? [{ ...fence, lang: `garden-${kind}` }] : [];
  });
}

/**
 * Splits a `ui` fence body into the YAML block header and the body. Returns
 * `bodyLineOffset`, the number of lines before the body inside the fence.
 */
export function splitUiBody(body) {
  const lines = normalizeNewlines(body).split("\n");
  if (lines[0]?.trim() !== "---") {
    return { error: "块头要以单独一行 --- 开始", header: null, headerText: "", bodyText: body, bodyLineOffset: 0 };
  }
  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closing < 0) {
    return { error: "块头缺少结束的 ---", header: null, headerText: "", bodyText: "", bodyLineOffset: 0 };
  }
  const headerText = lines.slice(1, closing).join("\n");
  let header;
  try {
    header = parseYaml(headerText) ?? {};
  } catch (error) {
    return {
      error: `块头不是有效的 YAML：${error instanceof Error ? error.message.split("\n")[0] : "解析失败"}`,
      header: null,
      headerText,
      bodyText: lines.slice(closing + 1).join("\n"),
      bodyLineOffset: closing + 1,
    };
  }
  if (!header || typeof header !== "object" || Array.isArray(header)) {
    return { error: "块头必须是 YAML 对象", header: null, headerText, bodyText: "", bodyLineOffset: closing + 1 };
  }
  return { error: null, header, headerText, bodyText: lines.slice(closing + 1).join("\n"), bodyLineOffset: closing + 1 };
}

/** Writes `compiled:` by editing only that header line, keeping the author's formatting. */
export function setCompiled(fenceRaw, hash) {
  const lines = normalizeNewlines(fenceRaw).split("\n");
  const headerStart = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (headerStart !== 1) return fenceRaw;
  const headerEnd = lines.findIndex((line, index) => index > headerStart && line.trim() === "---");
  if (headerEnd < 0) return fenceRaw;
  const existing = lines.findIndex((line, index) => index > headerStart && index < headerEnd && /^compiled\s*:/u.test(line));
  if (existing >= 0) lines[existing] = `compiled: ${hash}`;
  else lines.splice(headerEnd, 0, `compiled: ${hash}`);
  return lines.join("\n");
}

/** Read from the raw header text: YAML would coerce hashes like 12e45678 into numbers. */
export function compiledOf(headerText) {
  const match = /^compiled\s*:\s*["']?([^"'\s]*)["']?\s*$/mu.exec(headerText ?? "");
  return match ? match[1] : undefined;
}

export function intentOf(fence) {
  if (fence.lang === "intent" || fence.lang === "garden-idea") return normalizeNewlines(fence.body);
  if (fence.lang === "garden-interactive") {
    const { props } = readInteractiveFence(fence);
    return typeof props.intent === "string" ? props.intent : null;
  }
  if (fence.lang === "ui") {
    const { header } = splitUiBody(fence.body);
    return typeof header?.intent === "string" ? header.intent : null;
  }
  if (fence.lang === "widget") {
    try {
      const data = parseYaml(fence.body);
      return typeof data?.intent === "string" ? data.intent : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function idOf(fence) {
  if (fence.lang === "intent") return fence.info.split(/\s+/u)[0] || null;
  if (fence.lang === "garden-interactive") return readInteractiveFence(fence).id;
  if (fence.lang === "ui") {
    const { header } = splitUiBody(fence.body);
    return typeof header?.id === "string" ? header.id : null;
  }
  return null;
}

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const isExternal = (value) => /^(?:[a-z][a-z0-9+.-]*:)?\/\//iu.test(value) || /^[a-z][a-z0-9+.-]*:/iu.test(value);

/**
 * Resolves a path written inside a post against the post's same-name
 * directory. `markdownPath` is POSIX and relative to content/ or the repo,
 * e.g. `posts/llm/kv.md`. Returns `{ path }` or `{ error }`.
 */
export function resolveSidecarPath(markdownPath, relative) {
  if (typeof relative !== "string" || !relative.trim()) return { error: "路径不能为空" };
  const value = relative.trim().replaceAll("\\", "/");
  if (isExternal(value) || value.startsWith("/")) return { error: "只能使用本文同名目录里的相对路径" };
  const markdown = markdownPath.replaceAll("\\", "/");
  if (!markdown.endsWith(".md")) return { error: "稿件路径必须是 .md" };
  const directory = markdown.includes("/") ? markdown.slice(0, markdown.lastIndexOf("/")) : "";
  const stem = markdown.slice(markdown.lastIndexOf("/") + 1, -3);
  const sidecar = directory ? `${directory}/${stem}` : stem;
  const segments = directory ? directory.split("/") : [];
  for (const segment of value.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!segments.length) return { error: "路径越出了内容目录" };
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  const resolved = segments.join("/");
  if (!resolved.startsWith(`${sidecar}/`) || resolved.length <= sidecar.length + 1) {
    return { error: `只能使用同名目录 ${stem}/ 里的文件` };
  }
  return { path: resolved };
}
